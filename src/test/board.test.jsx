import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach } from 'vitest'
import App from '../App'

describe('Kanban Application', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders the navbar and default boards', async () => {
    render(<App />)

    // Check App brand & title
    expect(screen.getByText('Kanban Board')).toBeInTheDocument()

    // Check active board selector button exists
    const boardDropdownBtn = screen.getByRole('button', { name: /Enghøjparkens Bestyrelses Board|Select board/i })
    expect(boardDropdownBtn).toBeInTheDocument()

    // Check default columns are displayed
    expect(screen.getAllByText(/Kommende opgaver|Coming Up/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/I gangværende|In Progress/i).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Færdige opgaver|Done/i).length).toBeGreaterThan(0)
  })

  it('allows opening task creation modal', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click the Add task button in navbar
    const addBtns = screen.getAllByRole('button', { name: /Add task|Create new task/i })
    await user.click(addBtns[0])

    // Verify task modal is open
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Title \*/i)).toBeInTheDocument()
  })

  it('creates a new task and displays it in the column', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open task modal
    const addBtns = screen.getAllByRole('button', { name: /Add task|Create new task/i })
    await user.click(addBtns[0])

    const dialog = screen.getByRole('dialog')

    // Fill title
    const titleInput = within(dialog).getByPlaceholderText(/e\.g\. Design authentication modal/i)
    await user.type(titleInput, 'New Automated Test Task')

    // Submit task inside modal dialog
    const saveButton = within(dialog).getByRole('button', { name: /Create new task/i })
    await user.click(saveButton)

    // Check task appears on the board
    expect(await screen.findByText('New Automated Test Task')).toBeInTheDocument()
  })

  it('allows opening Create Board modal with customizable columns', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open Board selector dropdown
    const boardDropdownBtn = screen.getByRole('button', { name: /Enghøjparkens Bestyrelses Board|Select board/i })
    await user.click(boardDropdownBtn)

    // Click "Create new board"
    const newBoardBtn = screen.getByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)

    // Dialog should be open
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByLabelText(/Board Name \*/i)).toBeInTheDocument()
    expect(within(dialog).getByText(/Workflow Columns \/ Task Stages/i)).toBeInTheDocument()
  })

  it('creates a custom board with custom workflow stages and invites members', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Open Board dropdown
    const boardDropdownBtn = screen.getByRole('button', { name: /Enghøjparkens Bestyrelses Board|Select board/i })
    await user.click(boardDropdownBtn)

    // Click Create new board
    const newBoardBtn = screen.getByRole('button', { name: /Create new board/i })
    await user.click(newBoardBtn)

    const dialog = screen.getByRole('dialog')

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

  it('allows opening board settings to manage members and administrator roles', async () => {
    const user = userEvent.setup()
    render(<App />)

    // Click Board Settings / Members button in navbar
    const settingsBtn = screen.getByTitle('Board Settings')
    await user.click(settingsBtn)

    // Verify settings modal
    const dialog = screen.getByRole('dialog')
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
    const langBtn = screen.getByRole('button', { name: /Language selector/i })
    await user.click(langBtn)

    // Select Dansk
    const danishOption = screen.getByRole('menuitem', { name: /Dansk/i })
    await user.click(danishOption)

    // Verify language changed to Danish
    expect(await screen.findByText('Kanban Tavle')).toBeInTheDocument()
    expect(screen.getByText('Opret ny opgave')).toBeInTheDocument()
  })
})
