export type BoardRole = 'admin' | 'member'

export type BoardColumnColor =
  | 'indigo'
  | 'amber'
  | 'emerald'
  | 'purple'
  | 'rose'
  | 'cyan'
  | 'slate'
  | (string & {})

export interface BoardColumn {
  id: string
  title: string
  color: BoardColumnColor
}

export interface BoardMember {
  id?: string
  name?: string
  email?: string
  role?: BoardRole
  joinedAt?: string
}

export type BoardMemberEntry = BoardMember

export interface BoardInvitation {
  id: string
  boardId: string
  boardTitle: string
  boardDescription?: string
  name: string
  email: string
  recipientEmail: string
  role: BoardRole
  invitedAt?: string
  invitedBy?: string
}

export type InitialBoardMember = BoardMember

export interface Board {
  id: string
  title: string
  description?: string
  columns: BoardColumn[]
  members?: BoardMemberEntry[]
  memberIds?: string[]
  creatorId?: string
  creatorName?: string
  creatorEmail?: string
  createdAt?: string
  updatedAt?: string
}

export interface Subtask {
  id: string
  title: string
  completed: boolean
}

export type TaskPriority = 'high' | 'medium' | 'low' | (string & {})

export interface Task {
  id: string
  boardId: string
  memberIds: string[]
  title: string
  description: string
  status: string
  priority: TaskPriority
  assignees: string[]
  subtasks: Subtask[]
  dueDate: string | null
  createdAt: string
  updatedAt: string
  archivedAt: string | null
}

export type CreateTaskInput = Pick<
  Task,
  'title' | 'description' | 'status' | 'priority' | 'assignees' | 'subtasks' | 'dueDate'
>

export type TaskFormData = CreateTaskInput & { id?: string }

export type UpdateTaskInput = Partial<CreateTaskInput> & {
  archivedAt?: string | null
}

export interface CreateBoardInput {
  title: string
  description: string
  columns: BoardColumn[]
  initialMembers?: InitialBoardMember[]
}

export type UpdateBoardInput = Partial<Omit<Board, 'id'>>

export interface PendingInvitation {
  boardId: string
  boardTitle: string
  boardDescription?: string
  invitationId: string
  role: BoardRole
  invitedBy: string
  invitedAt?: string
  invitation: BoardInvitation
}

export interface AuthUser {
  uid: string
  email?: string | null
  displayName?: string | null
  isAnonymous?: boolean
}

export interface InviteMemberInput {
  name?: string
  email: string
  role?: BoardRole
}

export interface InitialInviteMember {
  name?: string
  email?: string
  role?: BoardRole
}

export interface BoardContextValue {
  boards: Board[]
  allBoards: Board[]
  currentBoard: Board | null
  activeBoardId: string
  setActiveBoardId: (boardId: string) => void
  createBoard: (input: CreateBoardInput) => Promise<Board>
  updateBoard: (boardId: string, updates: UpdateBoardInput) => Promise<void>
  deleteBoard: (boardId: string) => Promise<void>
  inviteMember: (boardId: string, input: InviteMemberInput) => Promise<BoardInvitation | undefined>
  cancelInvitation: (boardId: string, invitationId: string) => Promise<void>
  acceptInvitation: (boardId: string, invitationId: string) => Promise<BoardMember | undefined>
  declineInvitation: (boardId: string, invitationId: string) => Promise<void>
  leaveBoard: (boardId: string) => Promise<void>
  pendingInvitations: PendingInvitation[]
  boardInvitations: BoardInvitation[]
  updateMemberRole: (boardId: string, memberIdOrEmail: string, role: BoardRole) => Promise<void>
  removeMember: (boardId: string, memberIdOrEmail: string) => Promise<void>
  isCurrentUserAdmin: boolean
  tasks: Task[]
  allTasks: Task[]
  createTask: (input: CreateTaskInput) => Promise<Task | undefined>
  updateTask: (taskId: string, updates: UpdateTaskInput) => Promise<void>
  deleteTask: (taskId: string) => Promise<void>
  archiveTask: (taskId: string) => Promise<void>
  restoreTask: (taskId: string, targetColumnId?: string) => Promise<void>
  moveTask: (taskId: string, newStatus: string) => Promise<void>
  loading: boolean
  isSyncing: boolean
}