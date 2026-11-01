import { render, screen, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import App from '../App'

// Mock Firebase calls so unit tests don't fail due to lack of network/auth credentials
vi.mock('../firebase', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    onSnapshot: vi.fn((coll, onNext) => {
      // Simulate initial empty snapshot callback immediately
      onNext({ empty: true, docs: [] })
      return () => {}
    }),
    setDoc: vi.fn().mockResolvedValue(true),
    addDoc: vi.fn().mockResolvedValue({ id: 'mock-doc-id' }),
    updateDoc: vi.fn().mockResolvedValue(true),
    deleteDoc: vi.fn().mockResolvedValue(true),
  }
})

describe('Kanban Application', () => {
  beforeEach(() => {
    localStorage.clear()
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
