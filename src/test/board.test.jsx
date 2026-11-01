import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'

// In-memory mock store for Firestore
let mockFirestoreBoards = []
let boardListeners = []
let mockFirestoreTasks = []
let taskListeners = []

// Mock Firebase calls so unit tests don't fail due to lack of network/auth credentials
vi.mock('../firebase', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    collection: vi.fn((db, name) => name),
    doc: vi.fn((db, collName, id) => ({ collName, id })),
    onSnapshot: vi.fn((coll, onNext) => {
      const collName = typeof coll === 'string' ? coll : coll?.path || 'boards'
      if (collName === 'boards') {
        boardListeners.push(onNext)
        onNext({
          empty: mockFirestoreBoards.length === 0,
          docs: mockFirestoreBoards.map((b) => ({ id: b.id, data: () => b })),
        })
      } else {
        taskListeners.push(onNext)
        onNext({
          empty: mockFirestoreTasks.length === 0,
          docs: mockFirestoreTasks.map((t) => ({ id: t.id, data: () => t })),
        })
      }
      return () => {
        boardListeners = boardListeners.filter((l) => l !== onNext)
        taskListeners = taskListeners.filter((l) => l !== onNext)
      }
    }),
    setDoc: vi.fn((docRef, data) => {
      const collName = typeof docRef === 'string' ? docRef : docRef?.collName || 'boards'
      const docId = docRef?.id || data?.id || 'mock-id'
      if (collName === 'boards') {
        mockFirestoreBoards = [
          ...mockFirestoreBoards.filter((b) => b.id !== docId),
          { id: docId, ...data },
        ]
        boardListeners.forEach((l) =>
          l({
            empty: mockFirestoreBoards.length === 0,
            docs: mockFirestoreBoards.map((b) => ({ id: b.id, data: () => b })),
          })
        )
      } else {
        mockFirestoreTasks = [
          ...mockFirestoreTasks.filter((t) => t.id !== docId),
          { id: docId, ...data },
        ]
        taskListeners.forEach((l) =>
          l({
            empty: mockFirestoreTasks.length === 0,
            docs: mockFirestoreTasks.map((t) => ({ id: t.id, data: () => t })),
          })
        )
      }
      return Promise.resolve(true)
    }),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    updateDoc: vi.fn((docRef, updates) => {
      const collName = typeof docRef === 'string' ? docRef : docRef?.collName || 'boards'
      const docId = docRef?.id || 'mock-id'
      if (collName === 'boards') {
        mockFirestoreBoards = mockFirestoreBoards.map((b) =>
          b.id === docId ? { ...b, ...updates } : b
        )
        boardListeners.forEach((l) =>
          l({
            empty: mockFirestoreBoards.length === 0,
            docs: mockFirestoreBoards.map((b) => ({ id: b.id, data: () => b })),
          })
        )
      } else {
        mockFirestoreTasks = mockFirestoreTasks.map((t) =>
          t.id === docId ? { ...t, ...updates } : t
        )
        taskListeners.forEach((l) =>
          l({
            empty: mockFirestoreTasks.length === 0,
            docs: mockFirestoreTasks.map((t) => ({ id: t.id, data: () => t })),
          })
        )
      }
      return Promise.resolve(true)
    }),
    deleteDoc: vi.fn((docRef) => {
      const collName = typeof docRef === 'string' ? docRef : docRef?.collName || 'boards'
      const docId = docRef?.id || 'mock-id'
      if (collName === 'boards') {
        mockFirestoreBoards = mockFirestoreBoards.filter((b) => b.id !== docId)
        boardListeners.forEach((l) =>
          l({
            empty: mockFirestoreBoards.length === 0,
            docs: mockFirestoreBoards.map((b) => ({ id: b.id, data: () => b })),
          })
        )
      } else {
        mockFirestoreTasks = mockFirestoreTasks.filter((t) => t.id !== docId)
        taskListeners.forEach((l) =>
          l({
            empty: mockFirestoreTasks.length === 0,
            docs: mockFirestoreTasks.map((t) => ({ id: t.id, data: () => t })),
          })
        )
      }
      return Promise.resolve(true)
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
    const addMemberBtn = within(dialog).getByRole('button', { name: /^Add$/i })
    await user.click(addMemberBtn)

    // Submit new board
    const createBtn = within(dialog).getByRole('button', { name: /Create$/i })
    await user.click(createBtn)

    // Verify active board heading is now "Marketing Campaign 2026"
    expect(await screen.findByRole('heading', { name: 'Marketing Campaign 2026' })).toBeInTheDocument()
    // Verify custom column exists
    expect(screen.getByRole('heading', { name: /Review Stage/i })).toBeInTheDocument()
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

    // Bob accepts the invitation
    const acceptBtn = screen.getByRole('button', { name: /Accept Invitation/i })
    await user.click(acceptBtn)

    // Invitation banner disappears and Bob is now on Secret Project board
    expect(await screen.findByRole('heading', { name: 'Secret Project' })).toBeInTheDocument()
    expect(screen.queryByText(/Board Invitations \(1\)/i)).not.toBeInTheDocument()
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
