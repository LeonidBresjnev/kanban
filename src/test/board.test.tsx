import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'
import type { Board, BoardInvitation, Task } from '../types'

// In-memory mock store for Firestore
type MockDocument = Board | BoardInvitation | Task
type MockDocumentReference = { collName: string; id: string; path: string }
type MockSnapshot = { empty: boolean; docs: Array<{ id: string; data: () => MockDocument }> }
type SnapshotListener = (snapshot: MockSnapshot) => void
type MockFilter = { field: string; operator: string; value: string }
type MockQuery = { path: string; filters: MockFilter[] }
type MockSubscription = { query: MockQuery; listener: SnapshotListener }
type MockArrayUnion = { __arrayUnion: unknown[] }
type MockAuthUser = { uid: string; email: string | null; displayName: string | null }

let mockFirestoreBoards: Board[] = []
let boardListeners: MockSubscription[] = []
let mockFirestoreInvitations: BoardInvitation[] = []
let invitationListeners: MockSubscription[] = []
let mockFirestoreTasks: Task[] = []
let taskListeners: MockSubscription[] = []
let mockFirebaseAuthUser: MockAuthUser | null = null
let mockBoardWriteError: Error | null = null

function snapshotFor(query: MockQuery): MockSnapshot {
  const filters = query.filters
  if (query.path === 'boards') {
    const memberFilter = filters.find((filter) => filter.field === 'memberIds' && filter.operator === 'array-contains')
    const boards = memberFilter
      ? mockFirestoreBoards.filter((board) => board.memberIds?.includes(memberFilter.value))
      : mockFirestoreBoards
    return {
      empty: boards.length === 0,
      docs: boards.map((board) => ({ id: board.id, data: () => board })),
    }
  }

  if (query.path === 'tasks') {
    const memberFilter = filters.find((filter) => filter.field === 'memberIds' && filter.operator === 'array-contains')
    const tasks = memberFilter
      ? mockFirestoreTasks.filter((task) => task.memberIds.includes(memberFilter.value))
      : mockFirestoreTasks
    return {
      empty: tasks.length === 0,
      docs: tasks.map((task) => ({ id: task.id, data: () => task })),
    }
  }

  if (query.path.startsWith('invitations/')) {
    const recipientEmail = query.path.split('/')[1]
    const invitations = mockFirestoreInvitations.filter((invitation) => invitation.recipientEmail === recipientEmail)
    return {
      empty: invitations.length === 0,
      docs: invitations.map((invitation) => ({ id: invitation.id, data: () => invitation })),
    }
  }

  if (query.path === 'group:boards') {
    const boardFilter = filters.find((filter) => filter.field === 'boardId' && filter.operator === '==')
    const invitations = boardFilter
      ? mockFirestoreInvitations.filter((invitation) => invitation.boardId === boardFilter.value)
      : mockFirestoreInvitations
    return {
      empty: invitations.length === 0,
      docs: invitations.map((invitation) => ({ id: invitation.id, data: () => invitation })),
    }
  }

  return { empty: true, docs: [] }
}

function notifyListeners(listeners: MockSubscription[]): void {
  listeners.forEach(({ query, listener }) => listener(snapshotFor(query)))
}

function applyBoardUpdate(boardId: string, updates: Record<string, unknown>): void {
  mockFirestoreBoards = mockFirestoreBoards.map((board) => {
    if (board.id !== boardId) return board
    const resolved = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => {
        if (typeof value === 'object' && value !== null && '__arrayUnion' in value) {
          const current = (board as unknown as Record<string, unknown>)[key]
          const items = (value as MockArrayUnion).__arrayUnion
          return [key, [...(Array.isArray(current) ? current : []), ...items.filter((item) => !(Array.isArray(current) && current.some((existing) => JSON.stringify(existing) === JSON.stringify(item))))]]
        }
        return [key, value]
      }),
    )
    return { ...board, ...resolved }
  })
  notifyListeners(boardListeners)
}

function applyInvitationDelete(invitationId: string): void {
  mockFirestoreInvitations = mockFirestoreInvitations.filter((invitation) => invitation.id !== invitationId)
  notifyListeners(invitationListeners)
}

// Mock Firebase calls so unit tests don't fail due to lack of network/auth credentials
vi.mock('../firebase', async (importOriginal) => {
  const actual = await importOriginal<Record<string, unknown>>()
  return {
    ...actual,
    auth: {
      get currentUser() {
        return mockFirebaseAuthUser
      },
      onAuthStateChanged: vi.fn((callback: (user: MockAuthUser | null) => void) => {
        let user: MockAuthUser | null = null
        if (localStorage.getItem('kanban_guest_mode') !== 'true') {
          const savedUser = localStorage.getItem('kanban_mock_user')
          if (savedUser) {
            try {
              const parsed: unknown = JSON.parse(savedUser)
              if (
                typeof parsed === 'object' &&
                parsed !== null &&
                'uid' in parsed &&
                typeof parsed.uid === 'string'
              ) {
                user = {
                  uid: parsed.uid,
                  email: 'email' in parsed && typeof parsed.email === 'string' ? parsed.email : null,
                  displayName:
                    'displayName' in parsed && typeof parsed.displayName === 'string' ? parsed.displayName : null,
                }
              }
            } catch {
              // Ignore invalid test user data.
            }
          } else {
            user = { uid: 'test-user', email: 'test@example.com', displayName: 'Test User' }
          }
        }
        mockFirebaseAuthUser = user
        callback(user)
        return () => {}
      }),
    },
    collection: vi.fn((_db: unknown, ...segments: string[]) => segments.join('/')),
    collectionGroup: vi.fn((_db: unknown, name: string) => `group:${name}`),
    doc: vi.fn((_db: unknown, ...segments: string[]): MockDocumentReference => ({
      collName: segments[0],
      id: segments[segments.length - 1],
      path: segments.join('/'),
    })),
    query: vi.fn((collectionReference: string | MockQuery, ...filters: MockFilter[]): MockQuery => ({
      path: typeof collectionReference === 'string' ? collectionReference : collectionReference.path,
      filters: typeof collectionReference === 'string' ? filters : [...collectionReference.filters, ...filters],
    })),
    where: vi.fn((field: string, operator: string, value: string): MockFilter => ({ field, operator, value })),
    onSnapshot: vi.fn((coll: string | MockQuery, onNext: SnapshotListener) => {
      const target = typeof coll === 'string' ? { path: coll, filters: [] } : coll
      const subscription = { query: target, listener: onNext }
      if (target.path === 'boards') {
        boardListeners.push(subscription)
      } else if (target.path === 'tasks') {
        taskListeners.push(subscription)
      } else {
        invitationListeners.push(subscription)
      }
      onNext(snapshotFor(target))
      return () => {
        boardListeners = boardListeners.filter((entry) => entry.listener !== onNext)
        taskListeners = taskListeners.filter((entry) => entry.listener !== onNext)
        invitationListeners = invitationListeners.filter((entry) => entry.listener !== onNext)
      }
    }),
    setDoc: vi.fn((docRef: MockDocumentReference, data: MockDocument) => {
      const collName = docRef.collName || 'boards'
      if (collName === 'boards' && mockBoardWriteError) {
        return Promise.reject(mockBoardWriteError)
      }
      const docId = docRef.id || data.id || 'mock-id'
      if (collName === 'boards') {
        const board = data as Board
        mockFirestoreBoards = [
          ...mockFirestoreBoards.filter((b) => b.id !== docId),
          { ...board, id: docId },
        ]
        notifyListeners(boardListeners)
      } else if (collName === 'invitations') {
        const invitation = data as BoardInvitation
        mockFirestoreInvitations = [
          ...mockFirestoreInvitations.filter((existing) => existing.id !== docId),
          { ...invitation, id: docId },
        ]
        notifyListeners(invitationListeners)
      } else {
        const task = data as Task
        mockFirestoreTasks = [
          ...mockFirestoreTasks.filter((t) => t.id !== docId),
          { ...task, id: docId },
        ]
        notifyListeners(taskListeners)
      }
      return Promise.resolve(true)
    }),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    updateDoc: vi.fn((docRef: MockDocumentReference, updates: Record<string, unknown>) => {
      const collName = docRef.collName || 'boards'
      const docId = docRef.id || 'mock-id'
      if (collName === 'boards') {
        applyBoardUpdate(docId, updates)
      } else {
        const taskUpdates = updates as Partial<Task>
        mockFirestoreTasks = mockFirestoreTasks.map((t) =>
          t.id === docId ? { ...t, ...taskUpdates } : t
        )
        notifyListeners(taskListeners)
      }
      return Promise.resolve(true)
    }),
    deleteDoc: vi.fn((docRef: MockDocumentReference) => {
      const collName = docRef.collName || 'boards'
      const docId = docRef.id || 'mock-id'
      if (collName === 'boards') {
        mockFirestoreBoards = mockFirestoreBoards.filter((b) => b.id !== docId)
        notifyListeners(boardListeners)
      } else if (collName === 'invitations') {
        applyInvitationDelete(docId)
      } else {
        mockFirestoreTasks = mockFirestoreTasks.filter((t) => t.id !== docId)
        notifyListeners(taskListeners)
      }
      return Promise.resolve(true)
    }),
    arrayUnion: vi.fn((...items: unknown[]): MockArrayUnion => ({ __arrayUnion: items })),
    writeBatch: vi.fn(() => {
      const writes: Array<
        | { action: 'update'; ref: MockDocumentReference; value: Record<string, unknown> }
        | { action: 'delete'; ref: MockDocumentReference }
      > = []
      return {
        update: (ref: MockDocumentReference, value: Record<string, unknown>) => {
          writes.push({ action: 'update', ref, value })
        },
        delete: (ref: MockDocumentReference) => {
          writes.push({ action: 'delete', ref })
        },
        commit: async () => {
          writes.forEach((write) => {
            if (write.action === 'update' && write.ref.collName === 'boards') {
              applyBoardUpdate(write.ref.id, write.value)
            }
            if (write.action === 'delete' && write.ref.collName === 'invitations') {
              applyInvitationDelete(write.ref.id)
            }
          })
        },
      }
    }),
  }
})

describe('Kanban Application', () => {
  beforeEach(() => {
    localStorage.clear()
    mockFirestoreBoards = []
    boardListeners = []
    mockFirestoreTasks = []
    taskListeners = []
    mockFirestoreInvitations = []
    invitationListeners = []
    mockFirebaseAuthUser = null
    mockBoardWriteError = null
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders the navbar and initial state', async () => {
    render(<App />)

    // Check App brand & title
    expect(screen.getByText('Kanban Board')).toBeInTheDocument()

    // Check board creation button exists when no boards are present
    const createBoardBtn = screen.getByRole('button', { name: /Create new board/i })
    expect(createBoardBtn).toBeInTheDocument()
  })

  it('creates a custom board with custom workflow stages and invites members', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click Create new board
    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)

    const dialog = await screen.findByRole('dialog')

    // Type board name
    const boardNameInput = within(dialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Marketing Campaign 2026')

    // Add a custom column "Review Stage"
    const columnInput = within(dialog).getByPlaceholderText(/Column title\.\.\./i)
    await user.type(columnInput, 'Review Stage')
    const addColBtn = within(dialog).getByRole('button', { name: /Add column/i })
    await user.click(addColBtn)

    // Add initial member
    const memberNameInput = within(dialog).getByPlaceholderText(/Name\.\.\./i)
    await user.type(memberNameInput, 'Elena Marketer')
    const memberEmailInput = within(dialog).getByPlaceholderText(/Email \(optional\)\.\.\./i)
    await user.type(memberEmailInput, 'elena@example.com')
    const addMemberBtn = within(dialog).getByRole('button', { name: /^Add$/i })
    await user.click(addMemberBtn)

    // Submit new board
    const createBtn = within(dialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    // Verify active board heading is now "Marketing Campaign 2026"
    expect(await screen.findByRole('heading', { name: 'Marketing Campaign 2026' })).toBeInTheDocument()
    expect(mockFirestoreInvitations).toHaveLength(1)
    expect(mockFirestoreInvitations[0]).toMatchObject({
      boardId: mockFirestoreBoards[0].id,
      recipientEmail: 'elena@example.com',
    })
    expect('invitations' in mockFirestoreBoards[0]).toBe(false)
    // Verify custom column exists
    expect(screen.getByRole('heading', { name: /Review Stage/i })).toBeInTheDocument()
  })

  it('uses the active Firebase Auth UID in Firestore board ownership fields', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'cached-user-id',
        email: 'cached@example.com',
        displayName: 'Cached User',
      })
    )
    render(<App />)

    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const dialog = await screen.findByRole('dialog')
    const boardNameInput = within(dialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Authenticated Board')

    mockFirebaseAuthUser = {
      uid: 'firebase-auth-uid',
      email: 'auth@example.com',
      displayName: 'Firebase User',
    }
    await user.click(within(dialog).getByRole('button', { name: /Create$/i }))

    const createdBoard = mockFirestoreBoards[0]
    expect(createdBoard.creatorId).toBe('firebase-auth-uid')
    expect(createdBoard.memberIds).toContain('firebase-auth-uid')
    expect(createdBoard.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'firebase-auth-uid',
          email: 'auth@example.com',
          name: 'Firebase User',
        }),
      ])
    )
  })

  it('keeps the create-board form open and shows an error when Firestore rejects the write', async () => {
    const user = userEvent.setup()
    mockBoardWriteError = new Error('Missing or insufficient permissions.')
    render(<App />)

    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const dialog = await screen.findByRole('dialog')
    const boardNameInput = within(dialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Retryable Board')
    await user.click(within(dialog).getByRole('button', { name: /Create$/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/Missing or insufficient permissions\./i)).toBeInTheDocument()
    expect(within(dialog).getByDisplayValue('Retryable Board')).toBeInTheDocument()
    expect(mockFirestoreBoards).toHaveLength(0)
  })

  it('creates a new task and displays it in the column', async () => {
    const user = userEvent.setup()
    render(<App />)

    // First create a board
    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const createDialog = await screen.findByRole('dialog')
    const boardNameInput = within(createDialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Engineering Sprint')
    const createBtn = within(createDialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)
    await screen.findByRole('heading', { name: 'Engineering Sprint' })

    // Open task modal
    const addBtns = await screen.findAllByRole('button', { name: /Add task|Create new task/i })
    await user.click(addBtns[0])

    const taskDialog = await screen.findByRole('dialog')

    // Fill title
    const titleInput = within(taskDialog).getByPlaceholderText(/e\.g\. Design authentication modal/i)
    await user.type(titleInput, 'New Automated Test Task')

    // Submit task inside modal dialog
    const saveButton = within(taskDialog).getByRole('button', { name: /Create new task/i })
    await user.click(saveButton)

    // Check task appears on the board
    expect(await screen.findByText('New Automated Test Task')).toBeInTheDocument()
  })

  it('allows opening board settings to manage members and administrator roles', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Create a board
    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const createDialog = await screen.findByRole('dialog')
    const boardNameInput = within(createDialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Operations Board')
    const createBtn = within(createDialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    // Wait for board to be active
    expect(await screen.findByRole('heading', { name: 'Operations Board' })).toBeInTheDocument()

    // Click Board Settings / Members button in navbar
    const settingsBtn = await screen.findByTitle('Board Settings')
    await user.click(settingsBtn)

    // Verify settings modal
    const dialog = await screen.findByRole('dialog')
    expect(dialog).toBeInTheDocument()

    // Switch to Members tab inside dialog
    const membersTab = within(dialog).getByRole('button', { name: /Members & Roles/i })
    await user.click(membersTab)

    // Verify member invite form exists
    expect(within(dialog).getByText(/Invite new member/i)).toBeInTheDocument()
  })

  it('handles member invitations: invitation banner appears upon login, accepting joins the board, and member is not part of board before accepting', async () => {
    const user = userEvent.setup()

    // 1. Admin creates a board
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'admin_uid_1',
        email: 'admin@company.com',
        displayName: 'Alice Admin',
      })
    )

    render(<App />)

    // Admin creates board "Secret Project"
    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const createDialog = await screen.findByRole('dialog')
    const boardNameInput = within(createDialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Secret Project')
    const createBtn = within(createDialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    await screen.findByRole('heading', { name: 'Secret Project' })

    // Open board settings to invite bob@company.com
    const settingsBtn = await screen.findByTitle('Board Settings')
    await user.click(settingsBtn)

    const settingsDialog = await screen.findByRole('dialog')
    const membersTab = within(settingsDialog).getByRole('button', { name: /Members & Roles/i })
    await user.click(membersTab)

    // Fill in invitation form
    const nameInput = within(settingsDialog).getByPlaceholderText('Name...')
    const emailInput = within(settingsDialog).getByPlaceholderText('Email...')
    await user.type(nameInput, 'Bob Developer')
    await user.type(emailInput, 'bob@company.com')

    const inviteBtn = within(settingsDialog).getByRole('button', { name: /Invite/i })
    await user.click(inviteBtn)

    expect(mockFirestoreInvitations).toHaveLength(1)
    expect(mockFirestoreInvitations[0]).toMatchObject({
      boardId: mockFirestoreBoards[0].id,
      recipientEmail: 'bob@company.com',
      email: 'bob@company.com',
    })
    expect('invitations' in mockFirestoreBoards[0]).toBe(false)

    // Verify Bob appears under Pending Invitations, not under Active Members
    expect(within(settingsDialog).getByText('Pending Invitations')).toBeInTheDocument()
    expect(within(settingsDialog).getByText('Bob Developer')).toBeInTheDocument()
    expect(within(settingsDialog).getByText('Pending')).toBeInTheDocument()

    // Save changes
    const saveChangesBtn = within(settingsDialog).getByRole('button', { name: /Save changes/i })
    await user.click(saveChangesBtn)

    cleanup()

    // 2. Now Bob logs in
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'bob_uid_2',
        email: 'bob@company.com',
        displayName: 'Bob Developer',
      })
    )

    render(<App />)

    // Bob sees the invitation banner for Secret Project
    expect(await screen.findByText(/Board Invitations/i)).toBeInTheDocument()
    expect(screen.getByText(/You have been invited to join Secret Project/i)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Secret Project' })).not.toBeInTheDocument()

    // Bob accepts the invitation
    const acceptBtn = screen.getByRole('button', { name: /Accept Invitation/i })
    await user.click(acceptBtn)

    // Invitation banner disappears and Bob is now on Secret Project board
    expect(await screen.findByRole('heading', { name: 'Secret Project' })).toBeInTheDocument()
    expect(screen.queryByText(/Board Invitations \(1\)/i)).not.toBeInTheDocument()
    expect(mockFirestoreInvitations).toHaveLength(0)
    expect(mockFirestoreBoards[0].memberIds).toContain('bob_uid_2')
  })

  it('allows declining an invitation without becoming a member', async () => {
    const user = userEvent.setup()

    // 1. Admin creates board with pending invitation
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'admin_uid_1',
        email: 'admin@company.com',
        displayName: 'Alice Admin',
      })
    )

    render(<App />)

    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const createDialog = await screen.findByRole('dialog')
    const boardNameInput = within(createDialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Design System')
    const createBtn = within(createDialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    await screen.findByRole('heading', { name: 'Design System' })

    // Open settings and invite Dave
    const settingsBtn = await screen.findByTitle('Board Settings')
    await user.click(settingsBtn)

    const settingsDialog = await screen.findByRole('dialog')
    const membersTab = within(settingsDialog).getByRole('button', { name: /Members & Roles/i })
    await user.click(membersTab)

    const emailInput = within(settingsDialog).getByPlaceholderText('Email...')
    await user.type(emailInput, 'dave@company.com')

    const inviteBtn = within(settingsDialog).getByRole('button', { name: /Invite/i })
    await user.click(inviteBtn)

    const saveChangesBtn = within(settingsDialog).getByRole('button', { name: /Save changes/i })
    await user.click(saveChangesBtn)

    cleanup()

    // 2. Dave logs in
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'dave_uid',
        email: 'dave@company.com',
        displayName: 'Dave Designer',
      })
    )

    render(<App />)

    // Dave sees the invitation banner
    expect(await screen.findByText(/Board Invitations/i)).toBeInTheDocument()
    expect(screen.getByText(/You have been invited to join Design System/i)).toBeInTheDocument()

    // Dave declines
    const declineBtn = screen.getByRole('button', { name: /Decline/i })
    await user.click(declineBtn)

    // Invitation is gone and Dave has no boards
    expect(await screen.findByText(/No boards found/i)).toBeInTheDocument()
    expect(screen.queryByText(/Board Invitations/i)).not.toBeInTheDocument()
  })

  it('allows a member to leave a board', async () => {
    const user = userEvent.setup()

    // Setup user with an existing board where they are a member
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'charlie_uid',
        email: 'charlie@company.com',
        displayName: 'Charlie Member',
      })
    )

    render(<App />)

    // Create board "Team Tasks"
    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const createDialog = await screen.findByRole('dialog')
    const boardNameInput = within(createDialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Team Tasks')
    const createBtn = within(createDialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    await screen.findByRole('heading', { name: 'Team Tasks' })

    // Open board settings
    const settingsBtn = await screen.findByTitle('Board Settings')
    await user.click(settingsBtn)

    const settingsDialog = await screen.findByRole('dialog')
    const membersTab = within(settingsDialog).getByRole('button', { name: /Members & Roles/i })
    await user.click(membersTab)

    // Click Leave board
    const leaveBtn = within(settingsDialog).getByRole('button', { name: /Leave board/i })
    await user.click(leaveBtn)

    // Click Confirm
    const confirmBtn = within(settingsDialog).getByRole('button', { name: /Confirm/i })
    await user.click(confirmBtn)

    // Board should no longer be active / empty state shown
    expect(await screen.findByText(/No boards found/i)).toBeInTheDocument()
  })

  it('persists member list on Firestore document when creating board, accepting invitation, and leaving board', async () => {
    const user = userEvent.setup()

    // 1. Admin creates board
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'user_admin_99',
        email: 'founder@corp.com',
        displayName: 'Frank Founder',
      })
    )

    render(<App />)

    const newBoardBtn = await screen.findByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)
    const createDialog = await screen.findByRole('dialog')
    const boardNameInput = within(createDialog).getByPlaceholderText(/e\.g\. Product Roadmap or Sprint Planning/i)
    await user.type(boardNameInput, 'Enterprise Roadmap')
    const createBtn = within(createDialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    await screen.findByRole('heading', { name: 'Enterprise Roadmap' })

    // Verify Firestore board document contains founder in members and memberIds
    expect(mockFirestoreBoards.length).toBe(1)
    const initialBoard = mockFirestoreBoards[0]
    expect(initialBoard.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'user_admin_99',
          name: 'Frank Founder',
          email: 'founder@corp.com',
          role: 'admin',
        }),
      ])
    )
    expect(initialBoard.memberIds).toContain('user_admin_99')

    // Invite Grace
    const settingsBtn = await screen.findByTitle('Board Settings')
    await user.click(settingsBtn)
    const settingsDialog = await screen.findByRole('dialog')
    const membersTab = within(settingsDialog).getByRole('button', { name: /Members & Roles/i })
    await user.click(membersTab)

    const nameInput = within(settingsDialog).getByPlaceholderText('Name...')
    const emailInput = within(settingsDialog).getByPlaceholderText('Email...')
    await user.type(nameInput, 'Grace Engineer')
    await user.type(emailInput, 'grace@corp.com')
    const inviteBtn = within(settingsDialog).getByRole('button', { name: /Invite/i })
    await user.click(inviteBtn)

    const saveChangesBtn = within(settingsDialog).getByRole('button', { name: /Save changes/i })
    await user.click(saveChangesBtn)

    cleanup()

    // 2. Grace logs in and accepts
    localStorage.setItem(
      'kanban_mock_user',
      JSON.stringify({
        uid: 'user_grace_42',
        email: 'grace@corp.com',
        displayName: 'Grace Engineer',
      })
    )

    render(<App />)

    const acceptBtn = await screen.findByRole('button', { name: /Accept Invitation/i })
    await user.click(acceptBtn)

    await screen.findByRole('heading', { name: 'Enterprise Roadmap' })

    // Verify Firestore document now contains Grace in members and memberIds
    const updatedBoard = mockFirestoreBoards[0]
    expect(updatedBoard.members).toHaveLength(2)
    expect(updatedBoard.members).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'user_grace_42',
          email: 'grace@corp.com',
        }),
      ])
    )
    expect(updatedBoard.memberIds).toContain('user_grace_42')
    expect(updatedBoard.memberIds).toContain('user_admin_99')

    // 3. Grace leaves the board
    const settingsBtnGrace = await screen.findByTitle('Board Settings')
    await user.click(settingsBtnGrace)
    const graceSettingsDialog = await screen.findByRole('dialog')
    const graceMembersTab = within(graceSettingsDialog).getByRole('button', { name: /Members & Roles/i })
    await user.click(graceMembersTab)

    const leaveBtn = within(graceSettingsDialog).getByRole('button', { name: /Leave board/i })
    await user.click(leaveBtn)
    const confirmBtn = within(graceSettingsDialog).getByRole('button', { name: /Confirm/i })
    await user.click(confirmBtn)

    // Verify Firestore document now no longer has Grace in members and memberIds
    const finalBoard = mockFirestoreBoards[0]
    expect(finalBoard.members).toHaveLength(1)
    expect((finalBoard.members ?? []).some((m) => m.id === 'user_grace_42')).toBe(false)
    expect((finalBoard.memberIds ?? []).includes('user_grace_42')).toBe(false)
    expect(finalBoard.memberIds ?? []).toContain('user_admin_99')
  })

  it('switches language between English and Danish', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open language dropdown
    const langBtn = await screen.findByRole('button', { name: /Language selector/i })
    await user.click(langBtn)

    // Select Dansk
    const danishOption = await screen.findByRole('menuitem', { name: /Dansk/i })
    await user.click(danishOption)

    // Verify language changed to Danish
    expect(await screen.findByText('Kanban Tavle')).toBeInTheDocument()
    expect(await screen.findByRole('button', { name: /Opret ny tavle/i })).toBeInTheDocument()
  })
})
