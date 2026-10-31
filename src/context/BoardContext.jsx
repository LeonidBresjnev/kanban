/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, useMemo } from 'react'
import {
  db,
  collection,
  doc,
  setDoc,
  addDoc,
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

export const INITIAL_BOARDS = [
  {
    id: 'board-general',
    title: 'Enghøjparkens Bestyrelses Board',
    description: 'Organisation og overblik over foreningens opgaver, initiativer og bestyrelsesarbejde.',
    creatorId: 'admin-default',
    creatorName: 'Jacob Admin',
    creatorEmail: 'admin@enghoejparken.dk',
    createdAt: new Date('2026-01-01').toISOString(),
    columns: [
      { id: 'todo', title: 'Kommende opgaver', color: 'indigo' },
      { id: 'in_progress', title: 'I gangværende', color: 'amber' },
      { id: 'done', title: 'Færdige opgaver', color: 'emerald' },
    ],
    members: [
      { id: 'm-1', name: 'Jacob', email: 'jacob@enghoejparken.dk', role: 'admin' },
      { id: 'm-2', name: 'Christian', email: 'christian@enghoejparken.dk', role: 'admin' },
      { id: 'm-3', name: 'Morten', email: 'morten@enghoejparken.dk', role: 'member' },
      { id: 'm-4', name: 'Pia', email: 'pia@enghoejparken.dk', role: 'member' },
      { id: 'm-5', name: 'Rasmus', email: 'rasmus@enghoejparken.dk', role: 'member' },
    ],
  },
  {
    id: 'board-product',
    title: 'Product & Tech Roadmap',
    description: 'Feature development, sprint planning, and infrastructure tasks.',
    creatorId: 'admin-default',
    creatorName: 'Simon Admin',
    creatorEmail: 'simon@kanban.local',
    createdAt: new Date('2026-02-01').toISOString(),
    columns: [
      { id: 'backlog', title: 'Backlog', color: 'slate' },
      { id: 'todo', title: 'Sprint Backlog', color: 'indigo' },
      { id: 'in_progress', title: 'In Progress', color: 'amber' },
      { id: 'review', title: 'Code Review', color: 'purple' },
      { id: 'done', title: 'Shipped', color: 'emerald' },
    ],
    members: [
      { id: 'm-10', name: 'Simon Admin', email: 'simon@kanban.local', role: 'admin' },
      { id: 'm-11', name: 'Alex Johnson', email: 'alex@kanban.local', role: 'admin' },
      { id: 'm-12', name: 'Sarah Connor', email: 'sarah@kanban.local', role: 'member' },
      { id: 'm-13', name: 'Michael Chen', email: 'michael@kanban.local', role: 'member' },
    ],
  },
]

export const INITIAL_TASKS = [
  {
    id: 'task-1',
    boardId: 'board-general',
    title: 'Forbered regnskab og budgetforslag for generalforsamling',
    description: 'Samle alle bilag fra året og afstemme med banken forud for revisorgodkendelse.\n- [ ] Afstemme bankkonti\n- [ ] Oprette budgetoverslag\n- [ ] Sende til revisor',
    status: 'todo',
    priority: 'high',
    assignees: ['Jacob', 'Christian'],
    dueDate: '2026-11-15',
    subtasks: [
      { id: 'st-1', title: 'Indsaml fakturaer for havearbejde', completed: true },
      { id: 'st-2', title: 'Klargør revisionsrapport til print', completed: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-2',
    boardId: 'board-general',
    title: 'Indkald til årlig arbejdsdag og bestil container',
    description: 'Sende e-mail ud til alle beboere med dato og tilmeldingslink samt bestille haveaffaldscontainer.',
    status: 'in_progress',
    priority: 'medium',
    assignees: ['Pia', 'Morten'],
    dueDate: '2026-11-05',
    subtasks: [
      { id: 'st-3', title: 'Kontakt renovationsselskab for container', completed: true },
      { id: 'st-4', title: 'Køb forplejning (kaffe og kage)', completed: false },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-3',
    boardId: 'board-general',
    title: 'Reparation af gæsteparkeringens belysning',
    description: 'Elektrikeren har udskiftet LED-armaturerne på mast 3 og 4.',
    status: 'done',
    priority: 'low',
    assignees: ['Rasmus'],
    dueDate: '2026-10-20',
    subtasks: [
      { id: 'st-5', title: 'Godkend elektrikerfaktura', completed: true },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-4',
    boardId: 'board-product',
    title: 'Design customizable kanban boards with role management',
    description: 'Allow users to define workflow columns and grant admin rights to teammates.\n- [x] Board CRUD & Column settings\n- [x] Multi-admin permissions\n- [x] Firestore sync with offline fallback',
    status: 'in_progress',
    priority: 'high',
    assignees: ['Simon Admin', 'Alex Johnson'],
    dueDate: '2026-11-01',
    subtasks: [
      { id: 'st-6', title: 'Dynamic columns renderer', completed: true },
      { id: 'st-7', title: 'Member invite & role toggle', completed: true },
    ],
    createdAt: new Date().toISOString(),
  },
  {
    id: 'task-5',
    boardId: 'board-product',
    title: 'Setup automated Vitest test suite and accessibility compliance',
    description: 'Ensure all dialogs, drag and drop targets, and form controls have accessible labels and unit tests.',
    status: 'done',
    priority: 'medium',
    assignees: ['Sarah Connor'],
    dueDate: '2026-10-28',
    subtasks: [
      { id: 'st-8', title: 'Write tests for BoardContext', completed: true },
      { id: 'st-9', title: 'Write tests for TaskCard and Modals', completed: true },
    ],
    createdAt: new Date().toISOString(),
  },
]

export const BoardContext = createContext(null)

export function BoardProvider({ children }) {
  const { currentUser, isGuest } = useAuth()

  // Boards state
  const [boards, setBoards] = useState(() => {
    try {
      const saved = localStorage.getItem('kanban_boards')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed) && parsed.length > 0) return parsed
      }
    } catch {
      // ignore
    }
    return INITIAL_BOARDS
  })

  // Active board ID
  const [activeBoardId, setActiveBoardId] = useState(() => {
    try {
      const saved = localStorage.getItem('kanban_active_board_id')
      if (saved) return saved
    } catch {
      // ignore
    }
    return INITIAL_BOARDS[0]?.id || ''
  })

  // Tasks state
  const [tasks, setTasks] = useState(() => {
    try {
      const saved = localStorage.getItem('kanban_tasks')
      if (saved) {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) return parsed
      }
    } catch {
      // ignore
    }
    return INITIAL_TASKS
  })

  const [loading, setLoading] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)

  // Save boards to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kanban_boards', JSON.stringify(boards))
    } catch {
      // ignore
    }
  }, [boards])

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

  // Save tasks to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('kanban_tasks', JSON.stringify(tasks))
    } catch {
      // ignore
    }
  }, [tasks])

  // Realtime Firestore synchronization
  useEffect(() => {
    if (!db) return

    let unsubBoards
    let unsubTasks

    try {
      const boardsColl = collection(db, 'boards')
      unsubBoards = onSnapshot(
        boardsColl,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteBoards = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
            setBoards(remoteBoards)
          }
        },
        (err) => {
          console.warn('Firestore boards onSnapshot info (offline/fallback used):', err.message)
        }
      )

      const tasksColl = collection(db, 'tasks')
      unsubTasks = onSnapshot(
        tasksColl,
        (snapshot) => {
          if (!snapshot.empty) {
            const remoteTasks = snapshot.docs.map((docSnap) => ({
              id: docSnap.id,
              ...docSnap.data(),
            }))
            setTasks(remoteTasks)
          }
        },
        (err) => {
          console.warn('Firestore tasks onSnapshot info (offline/fallback used):', err.message)
        }
      )
    } catch (e) {
      console.warn('Firestore init error, using local state:', e)
    }

    return () => {
      if (unsubBoards) unsubBoards()
      if (unsubTasks) unsubTasks()
    }
  }, [])

  // Ensure an active board is always selected
  useEffect(() => {
    if (boards.length > 0) {
      const exists = boards.some((b) => b.id === activeBoardId)
      if (!exists) {
        setActiveBoardId(boards[0].id)
      }
    } else {
      setActiveBoardId('')
    }
  }, [boards, activeBoardId])

  // Current active board object
  const currentBoard = useMemo(() => {
    return boards.find((b) => b.id === activeBoardId) || boards[0] || null
  }, [boards, activeBoardId])

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
      },
    ]

    if (Array.isArray(initialMembers)) {
      initialMembers.forEach((im, idx) => {
        if (!im) return
        const memberName = typeof im === 'string' ? im.trim() : (im.name || '').trim()
        const memberEmail = typeof im === 'object' ? (im.email || '').trim() : ''
        if (memberName && !membersList.some((m) => m.name.toLowerCase() === memberName.toLowerCase())) {
          membersList.push({
            id: 'mem-' + Date.now() + '-' + idx,
            name: memberName,
            email: memberEmail,
            role: typeof im === 'object' && im.role ? im.role : 'member',
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

  // Member Management
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

    const newMember = {
      id: 'm-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      name: trimmedName,
      email: trimmedEmail,
      role: role || 'member',
    }

    const updatedMembers = [...(board.members || []), newMember]
    await updateBoard(boardId, { members: updatedMembers })
    return newMember
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
        boards,
        currentBoard,
        activeBoardId,
        setActiveBoardId,
        createBoard,
        updateBoard,
        deleteBoard,
        inviteMember,
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
