/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo, type ReactNode } from 'react'
import {
  auth,
  db,
  collection,
  collectionGroup,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  writeBatch,
  arrayUnion,
} from '../firebase'
import type { CollectionReference, Query, Unsubscribe } from 'firebase/firestore'
import { useAuth } from './AuthContext'
import type {
  Board,
  BoardColumn,
  BoardContextValue,
  BoardInvitation,
  BoardMember,
  BoardMemberEntry,
  BoardRole,
  CreateBoardInput,
  CreateTaskInput,
  InitialBoardMember,
  InviteMemberInput,
  PendingInvitation,
  Task,
  UpdateBoardInput,
  UpdateTaskInput,
} from '../types'

export const DEFAULT_COLUMNS: BoardColumn[] = [
  { id: 'todo', title: 'Coming Up', color: 'indigo' },
  { id: 'in_progress', title: 'In Progress', color: 'amber' },
  { id: 'done', title: 'Done', color: 'emerald' },
]

export const isUserMemberOfBoard = (
  board: Board | null,
  user: { uid: string; email?: string | null; displayName?: string | null } | null,
  isGuest: boolean,
): boolean => {
  if (!board) return false
  if (!user || isGuest) return true

  const userEmail = (user.email || '').toLowerCase()
  const userName = (user.displayName || '').toLowerCase()
  const userId = user.uid

  if (Array.isArray(board.members)) {
    return board.members.some((m) => {
      if (m.id && m.id === userId) return true
      if (m.email && m.email.toLowerCase() === userEmail) return true
      return !!(userName && m.name && m.name.toLowerCase() === userName);

    })
  }

  if (Array.isArray(board.memberIds)) {
    if (userId && board.memberIds.includes(userId)) return true
    return !!(userEmail && board.memberIds.includes(userEmail));

  }

  if (board.creatorId && userId && board.creatorId === userId) return true
  return !!(board.creatorEmail && userEmail && board.creatorEmail.toLowerCase() === userEmail);


}

export const BoardContext = createContext<BoardContextValue | null>(null)

interface BoardProviderProps {
  children: ReactNode
}

export function BoardProvider({ children }: BoardProviderProps) {
  const { currentUser, isGuest } = useAuth()

  // Boards state loaded from Firestore
  const [boards, setBoards] = useState<Board[]>([])
  const [recipientInvitations, setRecipientInvitations] = useState<BoardInvitation[]>([])
  const [boardInvitations, setBoardInvitations] = useState<BoardInvitation[]>([])

  // Active board ID
  const [activeBoardId, setActiveBoardId] = useState(() => {
    try {
      return localStorage.getItem('kanban_active_board_id') || ''
    } catch {
      return ''
    }
  })

  // Tasks state loaded from Firestore
  const [tasks, setTasks] = useState<Task[]>([])

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

    // If user is not authenticated and not in guest/offline mode, wait for auth
    if (!currentUser?.uid && !isGuest) {
      setBoards([])
      setLoading(false)
      return
    }

    setLoading(true)
    let unsubBoards: Unsubscribe | undefined
    let unsubTasks: Unsubscribe | undefined
    let boardsLoaded = false
    let tasksLoaded = false

    const checkLoaded = () => {
      if (boardsLoaded && tasksLoaded) {
        setLoading(false)
      }
    }

    try {
      // 1. Query only boards where the current user is in memberIds
      const boardCollection = collection(db, 'boards') as CollectionReference<Board>
      const boardsQuery = currentUser?.uid
          ? query(
              boardCollection,
              where('memberIds', 'array-contains', currentUser.uid)
          )
          : boardCollection

      unsubBoards = onSnapshot(
          boardsQuery,
          (snapshot) => {
            const remoteBoards = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }))
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

      // 2. Query only tasks for the current user
      const taskCollection = collection(db, 'tasks') as CollectionReference<Task>
      const tasksQuery = currentUser?.uid
          ? query(
              taskCollection,
              where('memberIds', 'array-contains', currentUser.uid)
          )
          : taskCollection

      unsubTasks = onSnapshot(
          tasksQuery,
          (snapshot) => {
            const remoteTasks = snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id }))
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
  } catch (e: unknown) {
      console.warn('Firestore init error:', e)
      setLoading(false)
    }

    return () => {
      if (unsubBoards) unsubBoards()
      if (unsubTasks) unsubTasks()
    }
  }, [currentUser?.uid, isGuest])

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

  // Load invitations addressed to the signed-in user without reading their boards.
  useEffect(() => {
    const recipientEmail = currentUser?.email?.trim().toLowerCase()
    if (!db || isGuest || !recipientEmail) {
      setRecipientInvitations([])
      return
    }

    const invitationCollection = collection(
      db,
      'invitations',
      recipientEmail,
      'boards',
    ) as CollectionReference<BoardInvitation>

    return onSnapshot(
      invitationCollection,
      (snapshot) => {
        setRecipientInvitations(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })))
      },
      (err) => {
        console.warn('Firestore recipient invitations onSnapshot info:', err.message)
        setRecipientInvitations([])
      },
    )
  }, [currentUser?.email, isGuest])

  // Board members can query invitations for the currently selected board.
  useEffect(() => {
    if (!db || !currentBoard || isGuest || !currentUser?.uid) {
      setBoardInvitations([])
      return
    }

    const invitationsQuery = query(
      collectionGroup(db, 'boards') as Query<BoardInvitation>,
      where('boardId', '==', currentBoard.id),
    )

    return onSnapshot(
      invitationsQuery,
      (snapshot) => {
        setBoardInvitations(snapshot.docs.map((docSnap) => ({ ...docSnap.data(), id: docSnap.id })))
      },
      (err) => {
        console.warn('Firestore board invitations onSnapshot info:', err.message)
        setBoardInvitations([])
      },
    )
  }, [currentBoard?.id, currentUser?.uid, isGuest])

  // Invitations targeting the current logged-in user
  const pendingInvitations = useMemo<PendingInvitation[]>(() => {
    if (!currentUser) return []
    return recipientInvitations
      .filter((invitation) => !boards.some((board) => board.id === invitation.boardId && isUserMemberOfBoard(board, currentUser, isGuest)))
      .map((invitation) => ({
        boardId: invitation.boardId,
        boardTitle: invitation.boardTitle,
        boardDescription: invitation.boardDescription,
        invitationId: invitation.id,
        role: invitation.role || 'member',
        invitedBy: invitation.invitedBy || 'Administrator',
        invitedAt: invitation.invitedAt,
        invitation,
      }))
  }, [boards, currentUser, isGuest, recipientInvitations])

  // Determine if the current user has Administrator rights on the active board
  const isCurrentUserAdmin = useMemo<boolean>(() => {
    if (!currentBoard) return false
    // If not logged in, or in guest mode, grant admin access to allow managing demo boards
    if (!currentUser || isGuest) return true

    const userEmail = (currentUser.email || '').toLowerCase()
    const userName = currentUser.displayName || ''
    const userId = currentUser.uid

    // Check members list
    const member = (currentBoard.members || []).find((m) => {
      if (m.id && m.id === userId) return true
      if (m.email && m.email.toLowerCase() === userEmail) return true
      return !!(userName && m.name && m.name.toLowerCase() === userName.toLowerCase());

    })

    if (member) {
      return member.role === 'admin'
    }

    // Check if creator (legacy fallback when members array is empty or not defined)
    if (!Array.isArray(currentBoard.members) || currentBoard.members.length === 0) {
      if (
        currentBoard.creatorId === userId ||
        (currentBoard.creatorEmail && currentBoard.creatorEmail.toLowerCase() === userEmail)
      ) {
        return true
      }
    }

    return false
  }, [currentBoard, currentUser, isGuest])

  // Board CRUD operations
  const createBoard = async ({ title, description, columns, initialMembers = [] }: CreateBoardInput): Promise<Board> => {
    setIsSyncing(true)
    try {
      const newBoardId = 'board-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)
      const firebaseUser = !isGuest ? auth?.currentUser : null
      const creator = firebaseUser || currentUser
      const creatorName = creator?.displayName || creator?.email?.split('@')[0] || 'Administrator'
      const creatorEmail = creator?.email || 'admin@kanban.local'
      const creatorId = creator?.uid || 'user-' + Date.now()

      const boardColumns = Array.isArray(columns) && columns.length > 0 ? columns : DEFAULT_COLUMNS

      const membersList: BoardMember[] = [
        {
          id: creatorId,
          name: creatorName,
          email: creatorEmail,
          role: 'admin',
          joinedAt: new Date().toISOString(),
        },
      ]

      const memberIds = [creatorId]

      const invitationsList: BoardInvitation[] = []

      initialMembers.forEach((im: InitialBoardMember, idx) => {
        const memberName = (im.name || '').trim()
        const memberEmail = (im.email || '').trim()
        if (memberName || memberEmail) {
          invitationsList.push({
            id: 'inv-' + Date.now() + '-' + idx,
            name: memberName || memberEmail.split('@')[0],
            email: memberEmail,
            role: im.role || 'member',
            invitedAt: new Date().toISOString(),
            invitedBy: creatorName,
          })
        }
      })

      const newBoard: Board = {
        id: newBoardId,
        title: title.trim(),
        description: (description || '').trim(),
        columns: boardColumns,
        members: membersList,
        memberIds,
        invitations: invitationsList,
        creatorId,
        creatorName,
        creatorEmail,
        createdAt: new Date().toISOString(),
      }

      if (db && firebaseUser) {
        try {
          await setDoc(doc(db, 'boards', newBoardId), newBoard)
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Unknown Firestore error'
          throw new Error(`Firestore rejected board creation: ${message}`, { cause: err })
        }
      }

      setBoards((prev) => [newBoard, ...prev])
      setActiveBoardId(newBoardId)
      return newBoard
    } finally {
      setIsSyncing(false)
    }
  }

  const updateBoard = async (boardId: string, updateData: UpdateBoardInput): Promise<void> => {
    setIsSyncing(true)
    let processedUpdate: UpdateBoardInput = { ...updateData }
    if (updateData.members && !updateData.memberIds) {
      processedUpdate.memberIds = updateData.members
        .map((member) => member.id)
        .filter((memberId): memberId is string => Boolean(memberId))
    }

    setBoards((prev) =>
      prev.map((b) => (b.id === boardId ? { ...b, ...processedUpdate, updatedAt: new Date().toISOString() } : b))
    )

    if (db) {
      try {
        await updateDoc(doc(db, 'boards', boardId), {
          ...processedUpdate,
          updatedAt: new Date().toISOString(),
        })
      } catch (err: unknown) {
        console.warn('Firestore update board failed, stored locally:', err instanceof Error ? err.message : err)
      }
    }
    setIsSyncing(false)
  }

  const deleteBoard = async (boardId: string): Promise<void> => {
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
      } catch (err: unknown) {
        console.warn('Firestore delete board failed, stored locally:', err instanceof Error ? err.message : err)
      }
    }
    setIsSyncing(false)
  }

  // Member Management & Invitations
  const inviteMember = async (boardId: string, { name, email, role = 'member' }: InviteMemberInput): Promise<BoardInvitation | undefined> => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const trimmedName = name ? name.trim() : email.split('@')[0]
    const trimmedEmail = email ? email.trim() : ''

    const existingMember = (board.members || []).find(
      (m) => {
        return (
          (trimmedEmail && m.email && m.email.toLowerCase() === trimmedEmail.toLowerCase()) ||
          (trimmedName && m.name && m.name.toLowerCase() === trimmedName.toLowerCase())
        )
      }
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

    const newInvitation: BoardInvitation = {
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

  const cancelInvitation = async (boardId: string, invitationId: string): Promise<void> => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedInvitations = (board.invitations || []).filter((inv) => inv.id !== invitationId)
    await updateBoard(boardId, { invitations: updatedInvitations })
  }

  const acceptInvitation = async (boardId: string, invitationId: string): Promise<BoardMember | undefined> => {
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
    const newMemberId = currentUser?.uid || invitation?.userId || 'mem-' + Date.now()
    const newMemberRole = invitation?.role || 'member'

    const newMember: BoardMember = {
      id: newMemberId,
      name: newMemberName,
      email: newMemberEmail,
      role: newMemberRole,
      joinedAt: new Date().toISOString(),
    }

    const updatedMembers = [...(board.members || []), newMember]
    const updatedMemberIds = Array.from(
      new Set(
        [
          ...(board.memberIds || (board.members || []).map((member) => member.id)),
          newMemberId,
        ].filter((memberId): memberId is string => Boolean(memberId))
      )
    )

    await updateBoard(boardId, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
      invitations: updatedInvitations,
    })

    setActiveBoardId(boardId)
    return newMember
  }

  const declineInvitation = async (boardId: string, invitationId: string): Promise<void> => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedInvitations = (board.invitations || []).filter((inv) => inv.id !== invitationId)
    await updateBoard(boardId, { invitations: updatedInvitations })
  }

  const leaveBoard = async (boardId: string): Promise<void> => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const userEmail = (currentUser?.email || '').toLowerCase()
    const userName = (currentUser?.displayName || '').toLowerCase()
    const userId = currentUser?.uid

    const updatedMembers = (board.members || []).filter((m) => {
      if (userId && m.id === userId) return false
      if (userEmail && m.email && m.email.toLowerCase() === userEmail) return false
      return !(userName && m.name && m.name.toLowerCase() === userName);

    })

    const updatedMemberIds = updatedMembers
      .map((member) => member.id)
      .filter((memberId): memberId is string => Boolean(memberId))

    await updateBoard(boardId, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
    })

    if (activeBoardId === boardId) {
      const remainingUserBoards = accessibleBoards.filter((b) => b.id !== boardId)
      setActiveBoardId(remainingUserBoards[0]?.id || '')
    }
  }

  const updateMemberRole = async (boardId: string, memberIdOrEmail: string, newRole: BoardRole): Promise<void> => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedMembers = (board.members || []).map((m) => {
      if (m.id === memberIdOrEmail || (m.email && m.email.toLowerCase() === memberIdOrEmail.toLowerCase())) {
        return { ...m, role: newRole }
      }
      return m
    })

    const updatedMemberIds = updatedMembers
      .map((member) => member.id)
      .filter((memberId): memberId is string => Boolean(memberId))

    await updateBoard(boardId, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
    })
  }

  const removeMember = async (boardId: string, memberIdOrEmail: string): Promise<void> => {
    const board = boards.find((b) => b.id === boardId)
    if (!board) return

    const updatedMembers = (board.members || []).filter((member) => {
      return member.id !== memberIdOrEmail && (!member.email || member.email.toLowerCase() !== memberIdOrEmail.toLowerCase())
    })

    const updatedMemberIds = updatedMembers
      .map((member) => member.id)
      .filter((memberId): memberId is string => Boolean(memberId))

    await updateBoard(boardId, {
      members: updatedMembers,
      memberIds: updatedMemberIds,
    })
  }

  // Task Operations
  const currentBoardTasks = useMemo(() => {
    if (!currentBoard) return []
    return tasks.filter((t) => t.boardId === currentBoard.id)
  }, [tasks, currentBoard])

  const createTask = async (taskData: CreateTaskInput): Promise<Task | undefined> => {
    if (!currentBoard) return
    setIsSyncing(true)
    const newTaskId = 'task-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7)

    const newTask: Task = {
      id: newTaskId,
      boardId: currentBoard.id,
      memberIds: currentBoard.memberIds || (currentBoard.members || [])
        .map((member) => member.id)
        .filter((memberId): memberId is string => Boolean(memberId)),
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
      } catch (err: unknown) {
        console.warn('Firestore write task failed, stored locally:', err instanceof Error ? err.message : err)
      }
    }
    setIsSyncing(false)
    return newTask
  }

  const updateTask = async (taskId: string, updates: UpdateTaskInput): Promise<void> => {
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
      } catch (err: unknown) {
        console.warn('Firestore update task failed, stored locally:', err instanceof Error ? err.message : err)
      }
    }
    setIsSyncing(false)
  }

  const deleteTask = async (taskId: string): Promise<void> => {
    setIsSyncing(true)
    setTasks((prev) => prev.filter((t) => t.id !== taskId))

    if (db) {
      try {
        await deleteDoc(doc(db, 'tasks', taskId))
      } catch (err: unknown) {
        console.warn('Firestore delete task failed, stored locally:', err instanceof Error ? err.message : err)
      }
    }
    setIsSyncing(false)
  }

  const archiveTask = async (taskId: string): Promise<void> => {
    await updateTask(taskId, {
      status: 'archive',
      archivedAt: new Date().toISOString(),
    })
  }

  const restoreTask = async (taskId: string, targetColumnId?: string): Promise<void> => {
    const fallbackCol = currentBoard?.columns[0]?.id || 'todo'
    await updateTask(taskId, {
      status: targetColumnId || fallbackCol,
      archivedAt: null,
    })
  }

  const moveTask = async (taskId: string, newStatus: string): Promise<void> => {
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
