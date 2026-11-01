/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  db,
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from '../firebase'
import { useAuth } from './AuthContext'

export const DEFAULT_COLUMNS = [
  { id: 'todo', title: 'Coming Up', color: 'indigo' },
  { id: 'in_progress', title: 'In Progress', color: 'amber' },
  { id: 'done', title: 'Done', color: 'emerald' },
]

export const isUserMemberOfBoard = (board, user, isGuest) => {
  if (!board) return false
  if (!user || isGuest) return true

  const userEmail = (user.email || '').toLowerCase()
  const userName = (user.displayName || '').toLowerCase()
  const userId = user.uid

  return (board.members || []).some((m) => {
    if (m.id && m.id === userId) return true
    if (m.email && m.email.toLowerCase() === userEmail) return true
    if (userName && m.name && m.name.toLowerCase() === userName) return true
    return false
  })
}

export const BoardContext = createContext(null)

export function BoardProvider({ children }) {
  const { currentUser, isGuest } = useAuth()

  // Boards state loaded from Firestore
  const [boards, setBoards] = useState([])

  // Active board ID
  const [activeBoardId, setActiveBoardId] = useState(() => {
    try {
      return localStorage.getItem('kanban_active_board_id') || ''
    } catch {
      return ''
    }
  })

  // Tasks state loaded from Firestore
  const [tasks, setTasks] = useState([])

  const [loading, setLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)

  // Save active board ID to localStorage
  useEffect(() => {
    if (activeBoardId) {
      try {
        localStorage.setItem('kanban_active_board_id', activeBoardId)
      } catch {
        // ignore
      }
    }
  }, [activeBoardId])

  // Realtime Firestore synchronization
  useEffect(() => {
    if (!db) {
      setLoading(false)
      return
    }

    setLoading(true)
    let unsubBoards
    let unsubTasks
    let boardsLoaded = false
    let tasksLoaded = false

    const checkLoaded = () => {
      if (boardsLoaded && tasksLoaded) {
        setLoading(false)
      }
    }

    try {
      const boardsColl = collection(db, 'boards')
      unsubBoards = onSnapshot(
        boardsColl,
        (snapshot) => {
          const remoteBoards = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          setBoards(remoteBoards)
          boardsLoaded = true
          checkLoaded()
        },
        (err) => {
          console.warn('Firestore boards onSnapshot info:', err.message)
          boardsLoaded = true
          checkLoaded()
        }
      )

      const tasksColl = collection(db, 'tasks')
      unsubTasks = onSnapshot(
        tasksColl,
        (snapshot) => {
          const remoteTasks = snapshot.docs.map((docSnap) => ({
            id: docSnap.id,
            ...docSnap.data(),
          }))
          setTasks(remoteTasks)
          tasksLoaded = true
          checkLoaded()
        },
        (err) => {
          console.warn('Firestore tasks onSnapshot info:', err.message)
          tasksLoaded = true
          checkLoaded()
        }
      )
    } catch (e) {
      console.warn('Firestore init error:', e)
      setLoading(false)
    }

    return () => {
      if (unsubBoards) unsubBoards()
      if (unsubTasks) unsubTasks()
    }
  }, [])

  // Filter boards that the current user has access to (is member or creator, or guest mode)
  const accessibleBoards = useMemo(() => {
    if (!currentUser || isGuest) return boards
    return boards.filter((b) => isUserMemberOfBoard(b, currentUser, isGuest))
  }, [boards, currentUser, isGuest])

  // Ensure an active board is always selected
  useEffect(() => {
    if (accessibleBoards.length > 0) {
      const exists = accessibleBoards.some((b) => b.id === activeBoardId)
      if (!exists) {
        setActiveBoardId(accessibleBoards[0].id)
      }
    } else {
      setActiveBoardId('')
    }
  }, [accessibleBoards, activeBoardId])

  // Current active board object
  const currentBoard = useMemo(() => {
    return accessibleBoards.find((b) => b.id === activeBoardId) || accessibleBoards[0] || null
  }, [accessibleBoards, activeBoardId])

  // Invitations targeting the current logged-in user
  const pendingInvitations = useMemo(() => {
    if (!currentUser) return []
    const list = []
    const userEmail = (currentUser.email || '').toLowerCase()
    const userName = (currentUser.displayName || '').toLowerCase()
    const userPrefix = userEmail ? userEmail.split('@')[0] : ''

    boards.forEach((board) => {
      // Don't show invitation if user is already an accepted member or creator
      const isMember =
        (board.members || []).some((m) => {
          if (m.id && m.id === currentUser.uid) return true
          if (m.email && m.email.toLowerCase() === userEmail) return true
          if (userName && m.name && m.name.toLowerCase() === userName) return true
          return false
        }) ||
        board.creatorId === currentUser.uid ||
        (board.creatorEmail && board.creatorEmail.toLowerCase() === userEmail)

      if (isMember) return

      ;(board.invitations || []).forEach((inv) => {
        const invEmail = (inv.email || '').toLowerCase()
        const invName = (inv.name || '').toLowerCase()

        const matches =
          (userEmail && invEmail && invEmail === userEmail) ||
          (userName && invName && invName === userName) ||
          (userEmail && invName && (invName === userEmail || invName === userPrefix))

        if (matches) {
          list.push({
            boardId: board.id,
            boardTitle: board.title,
            boardDescription: board.description,
            invitationId: inv.id,
            role: inv.role || 'member',
            invitedBy: inv.invitedBy || board.creatorName || 'Administrator',
            invitedAt: inv.invitedAt,
            invitation: inv,
          })
        }
      })
    })

    return list
  }, [boards, currentUser])

  // Determine if the current user has Administrator rights on the active board
  const isCurrentUserAdmin = useMemo(() => {
    if (!currentBoard) return false
    // If not logged in, or in guest mode, grant admin access to allow managing demo boards
    if (!currentUser || isGuest) return true

    const userEmail = (currentUser.email || '').toLowerCase()
    const userName = currentUser.displayName || ''
    const userId = currentUser.uid

    // Check if creator
    if (
      currentBoard.creatorId === userId ||
      (currentBoard.creatorEmail && currentBoard.creatorEmail.toLowerCase() === userEmail)
    ) {
      return true
    }

    // Check members list
    const member = (currentBoard.members || []).find((m) => {
      if (m.id && m.id === userId) return true
      if (m.email && m.email.toLowerCase() === userEmail) return true
      if (userName && m.name && m.name.toLowerCase() === userName.toLowerCase()) return true
      return false
    })

    return member?.role === 'admin'
  }, [currentBoard, currentUser, isGuest])

  // Board CRUD operations
  const createBoard = async ({ title, description, columns, initialMembers }) => {
    setIsSyncing(true)
    const newBoardId = 'board-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)

    const creatorName = currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'
    const creatorEmail = currentUser?.email || 'admin@kanban.local'
    const creatorId = currentUser?.uid || 'user-' + Date.now()

    const boardColumns = Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS

    const membersList = [
      {
        id: creatorId,
        name: creatorName,
        email: creatorEmail,
        role: 'admin',
        joinedAt: new Date().toISOString(),
      },
    ]

    const invitationsList = []

    if (Array.isArray(initialMembers)) {
      initialMembers.forEach((im, idx) => {
        if (!im) return
        const memberName = typeof im === 'string' ? im.trim() : (im.name || '').trim()
        const memberEmail = typeof im === 'object' ? (im.email || '').trim() : ''
        if (memberName || memberEmail) {
          invitationsList.push({
            id: 'inv-' + Date.now() + '-' + idx,
            name: memberName || memberEmail.split('@')[0],
            email: memberEmail,
            role: typeof im === 'object' && im.role ? im.role : 'member',
            invitedAt: new Date().toISOString(),
            invitedBy: creatorName,
          })
        }
      })
    }

    const newBoard = {
      id: newBoardId,
      title: title.trim(),
      description: (description || '').trim(),
      columns: boardColumns,
      members: membersList,
      invitations: invitationsList,
      creatorId,
      creatorName,
      creatorEmail,
      createdAt: new Date().toISOString(),
    }

    setBoards((prev) => [newBoard, ...prev])
    setActiveBoardId(newBoardId)

    if (db) {
      try {
        await setDoc(doc(db, 'boards', newBoardId), newBoard)
      } catch (err) {
        console.warn('Firestore write board failed, stored locally:', err.message)
      }
    }

    setIsSyncing(false)
    return newBoard
  }

  const updateBoard = async (boardId, updateData) => {
    setIsSyncing(true)
    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, ...updateData, updatedAt: new Date().toISOString() } : b))
    )

    if (db) {
      try {
        await updateDoc(doc(db, 'boards', boardId), {
          ...updateData,
          updatedAt: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('Firestore update board failed, stored locally:', err.message)
      }
    }
    setIsSyncing(false)
  }

  const deleteBoard = async (boardId) => {
    setIsSyncing(true)
    const remainingBoards = boards.filter((b) => b.id !== boardId)
    setBoards(remainingBoards)
    if (activeBoardId === boardId) {
      setActiveBoardId(remainingBoards[0]?.id || '')
    }

    // Also remove associated tasks
    setTasks((prev) => prev.filter((t) => t.boardId !== boardId))

    if (db) {
      try {
        await deleteDoc(doc(db, 'boards', boardId))
      } catch (err) {
        console.warn('Firestore delete board failed, stored locally:', err.message)
      }
    }
    setIsSyncing(false)
  }

  // Member Management & Invitations
  const inviteMember = async (boardId, { name, email, role = 'member' }) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const trimmedName = name ? name.trim() : email.split('@')[0]
    const trimmedEmail = email ? email.trim() : ''

    const existingMember = (board.members || []).find(
      (m) =>
        (trimmedEmail && m.email && m.email.toLowerCase() === trimmedEmail.toLowerCase()) ||
        (trimmedName && m.name && m.name.toLowerCase() === trimmedName.toLowerCase())
    )

    if (existingMember) {
      throw new Error('Member already exists on this board')
    }

    const existingInv = (board.invitations || []).find(
      (inv) =>
        (trimmedEmail && inv.email && inv.email.toLowerCase() === trimmedEmail.toLowerCase()) ||
        (trimmedName && inv.name && inv.name.toLowerCase() === trimmedName.toLowerCase())
    )

    if (existingInv) {
      throw new Error('An invitation has already been sent to this user')
    }

    const inviterName =
      currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator'

    const newInvitation = {
      id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      name: trimmedName,
      email: trimmedEmail,
      role: role || 'member',
      invitedAt: new Date().toISOString(),
      invitedBy: inviterName,
    }

    const updatedInvitations = [...(board.invitations || []), newInvitation]
    await updateBoard(boardId, { invitations: updatedInvitations })
    return newInvitation
  }

  const cancelInvitation = async (boardId, invitationId) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedInvitations = (board.invitations || []).filter((inv) => inv.id !== invitationId)
    await updateBoard(boardId, { invitations: updatedInvitations })
  }

  const acceptInvitation = async (boardId, invitationId) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const invitation =
      (board.invitations || []).find((inv) => inv.id === invitationId) ||
      (board.invitations || [])[0]
    const updatedInvitations = (board.invitations || []).filter(
      (inv) => inv.id !== (invitation ? invitation.id : invitationId)
    )

    const newMemberName =
      currentUser?.displayName ||
      invitation?.name ||
      currentUser?.email?.split('@')[0] ||
      'Member'
    const newMemberEmail = currentUser?.email || invitation?.email || ''
    const newMemberId = currentUser?.uid || 'mem-' + Date.now()
    const newMemberRole = invitation?.role || 'member'

    const newMember = {
      id: newMemberId,
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      joinedAt: new Date().toISOString(),
    }

    const updatedMembers = [...(board.members || []), newMember]
    await updateBoard(boardId, {
      members: updatedMembers,
      invitations: updatedInvitations,
    })

    setActiveBoardId(boardId)
    return newMember
  }

  const declineInvitation = async (boardId, invitationId) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedInvitations = (board.invitations || []).filter((inv) => inv.id !== invitationId)
    await updateBoard(boardId, { invitations: updatedInvitations })
  }

  const leaveBoard = async (boardId) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const userEmail = (currentUser?.email || '').toLowerCase()
    const userName = (currentUser?.displayName || '').toLowerCase()
    const userId = currentUser?.uid

    const updatedMembers = (board.members || []).filter((m) => {
      if (userId && m.id === userId) return false
      if (userEmail && m.email && m.email.toLowerCase() === userEmail) return false
      if (userName && m.name && m.name.toLowerCase() === userName) return false
      return true
    })

    await updateBoard(boardId, {
      members: updatedMembers,
    })

    if (activeBoardId === boardId) {
      const remainingUserBoards = accessibleBoards.filter((b) => b.id !== boardId)
      setActiveBoardId(remainingUserBoards[0]?.id || '')
    }
  }

  const updateMemberRole = async (boardId, memberIdOrEmail, newRole) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedMembers = (board.members || []).map((m) => {
      if (m.id === memberIdOrEmail || (m.email && m.email.toLowerCase() === memberIdOrEmail.toLowerCase())) {
        return { ...m, role: newRole }
      }
      return m
    })

    await updateBoard(boardId, { members: updatedMembers })
  }

  const removeMember = async (boardId, memberIdOrEmail) => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedMembers = (board.members || []).filter(
      (m) => m.id !== memberIdOrEmail && (!m.email || m.email.toLowerCase() !== memberIdOrEmail.toLowerCase())
    )

    await updateBoard(boardId, { members: updatedMembers })
  }

  // Task Operations
  const currentBoardTasks = useMemo(() => {
    if (!currentBoard) return []
    return tasks.filter((t) => t.boardId === currentBoard.id)
  }, [tasks, currentBoard])

  const createTask = async (taskData) => {
    if (!currentBoard) return
    setIsSyncing(true)
    const newTaskId = 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)

    const newTask = {
      id: newTaskId,
      boardId: currentBoard.id,
      title: taskData.title.trim(),
      description: taskData.description || '',
      status: taskData.status || currentBoard.columns[0]?.id || 'todo',
      priority: taskData.priority || 'medium',
      assignees: Array.isArray(taskData.assignees) ? taskData.assignees : [],
      subtasks: Array.isArray(taskData.subtasks) ? taskData.subtasks : [],
      dueDate: taskData.dueDate || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      archivedAt: null,
    }

    setTasks((prev) => [newTask, ...prev])

    if (db) {
      try {
        await setDoc(doc(db, 'tasks', newTaskId), newTask)
      } catch (err) {
        console.warn('Firestore write task failed, stored locally:', err.message)
      }
    }
    setIsSyncing(false)
    return newTask
  }

  const updateTask = async (taskId, updates) => {
    setIsSyncing(true)
    const updatedWithTimestamp = {
      ...updates,
      updatedAt: new Date().toISOString(),
    }

    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, ...updatedWithTimestamp } : t))
    )

    if (db) {
      try {
        await updateDoc(doc(db, 'tasks', taskId), updatedWithTimestamp)
      } catch (err) {
        console.warn('Firestore update task failed, stored locally:', err.message)
      }
    }
    setIsSyncing(false)
  }

  const deleteTask = async (taskId) => {
    setIsSyncing(true)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    if (db) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId))
      } catch (err) {
        console.warn('Firestore delete task failed, stored locally:', err.message)
      }
    }
    setIsSyncing(false)
  }

  const archiveTask = async (taskId) => {
    await updateTask(taskId, {
      status: 'archive',
      archivedAt: new Date().toISOString(),
    })
  }

  const restoreTask = async (taskId, targetColumnId) => {
    const fallbackCol = currentBoard?.columns[0]?.id || 'todo'
    await updateTask(taskId, {
      status: targetColumnId || fallbackCol,
      archivedAt: null,
    })
  }

  const moveTask = async (taskId, newStatus) => {
    await updateTask(taskId, { status: newStatus })
  }

  return (
    <BoardContext.Provider
      value={{
        boards: accessibleBoards,
        allBoards: boards,
        currentBoard,
        activeBoardId,
        setActiveBoardId,
        createBoard,
        updateBoard,
        deleteBoard,
        inviteMember,
        cancelInvitation,
        acceptInvitation,
        declineInvitation,
        leaveBoard,
        pendingInvitations,
        updateMemberRole,
        removeMember,
        isCurrentUserAdmin,
        tasks: currentBoardTasks,
        allTasks: tasks,
        createTask,
        updateTask,
        deleteTask,
        archiveTask,
        restoreTask,
        moveTask,
        loading,
        isSyncing,
      }}
    >
      {children}
    </BoardContext.Provider>
  )
}

export function useBoard() {
  const context = useContext(BoardContext)
  if (!context) {
    throw new Error('useBoard must be used within a BoardProvider')
  }
  return context
}
