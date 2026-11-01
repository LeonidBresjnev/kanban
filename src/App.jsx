import { useState } from 'react'
import { I18nProvider, useTranslation } from './i18n'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BoardProvider, useBoard } from './context/BoardContext'
import Navbar from './components/Navbar'
import BoardHeader from './components/BoardHeader'
import BoardView from './components/BoardView'
import ArchiveView from './components/ArchiveView'
import TaskModal from './components/TaskModal'
import CreateBoardModal from './components/CreateBoardModal'
import BoardSettingsModal from './components/BoardSettingsModal'
import DeleteTaskDialog from './components/DeleteTaskDialog'
import AuthModal from './components/AuthModal'
import InvitationBanner from './components/InvitationBanner'
import { Plus, Layout } from 'lucide-react'

function KanbanApp() {
  const { t } = useTranslation()
  const { currentUser } = useAuth()
  const {
    boards,
    currentBoard,
    setActiveBoardId,
    createBoard,
    updateBoard,
    deleteBoard,
    leaveBoard,
    pendingInvitations,
    acceptInvitation,
    declineInvitation,
    isCurrentUserAdmin,
    tasks,
    createTask,
    updateTask,
    deleteTask,
    archiveTask,
    restoreTask,
    moveTask,
  } = useBoard()

  // Filters & Search
  const [filterAssignee, setFilterAssignee] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showArchive, setShowArchive] = useState(false)

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [initialColumnId, setInitialColumnId] = useState(null)

  const [isCreateBoardOpen, setIsCreateBoardOpen] = useState(false)
  const [isBoardSettingsOpen, setIsBoardSettingsOpen] = useState(false)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false)

  const [taskToDelete, setTaskToDelete] = useState(null)

  // Handlers
  const handleOpenNewTask = (columnId = null) => {
    setEditingTask(null)
    setInitialColumnId(columnId || currentBoard?.columns[0]?.id || 'todo')
    setIsTaskModalOpen(true)
  }

  const handleEditTask = (task) => {
    setEditingTask(task)
    setInitialColumnId(task.status)
    setIsTaskModalOpen(true)
  }

  const handleSaveTask = async (taskData) => {
    if (editingTask) {
      await updateTask(editingTask.id, taskData)
    } else {
      await createTask(taskData)
    }
  }

  const handleDeleteTaskConfirm = async (task) => {
    if (task) {
      await deleteTask(task.id)
      setTaskToDelete(null)
    }
  }

  const handleToggleSubtask = (task, subtaskId) => {
    const updatedSubtasks = (task.subtasks || []).map((st) =>
      st.id === subtaskId ? { ...st, completed: !st.completed } : st
    )
    updateTask(task.id, { subtasks: updatedSubtasks })
  }

  const handleToggleDescriptionChecklist = (task, lineIndex) => {
    const lines = (task.description || '').split('\n')
    if (lines[lineIndex] !== undefined) {
      const line = lines[lineIndex]
      if (line.includes('- [ ]')) {
        lines[lineIndex] = line.replace('- [ ]', '- [x]')
      } else if (line.includes('- [x]') || line.includes('- [X]')) {
        lines[lineIndex] = line.replace(/- \[[xX]\]/, '- [ ]')
      }
      updateTask(task.id, { description: lines.join('\n') })
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        boards={boards}
        currentBoard={currentBoard}
        onSelectBoard={setActiveBoardId}
        onCreateBoardClick={() => setIsCreateBoardOpen(true)}
        onBoardSettingsClick={() => setIsBoardSettingsOpen(true)}
        onAddNewTaskClick={() => handleOpenNewTask()}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        isAdmin={isCurrentUserAdmin}
      />

      {/* Invitations Notification Banner */}
      <InvitationBanner
        invitations={pendingInvitations}
        onAcceptInvitation={acceptInvitation}
        onDeclineInvitation={declineInvitation}
      />

      {/* Main Board Container */}
      {currentBoard ? (
        <main className="flex-1 flex flex-col">
          {/* Board Header & Filters */}
          <BoardHeader
            board={currentBoard}
            tasks={tasks}
            filterAssignee={filterAssignee}
            setFilterAssignee={setFilterAssignee}
            filterPriority={filterPriority}
            setFilterPriority={setFilterPriority}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            showArchive={showArchive}
            setShowArchive={setShowArchive}
            onAddNewTask={handleOpenNewTask}
            onOpenSettings={() => setIsBoardSettingsOpen(true)}
            isAdmin={isCurrentUserAdmin}
          />

          {/* Board Content Area */}
          <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {showArchive ? (
              <ArchiveView
                tasks={tasks}
                columns={currentBoard.columns}
                onRestore={(task) => restoreTask(task.id)}
                onDelete={(task) => setTaskToDelete(task)}
              />
            ) : (
              <BoardView
                columns={currentBoard.columns || []}
                tasks={tasks}
                filterAssignee={filterAssignee}
                filterPriority={filterPriority}
                searchQuery={searchQuery}
                onEditTask={handleEditTask}
                onDeleteTask={(task) => setTaskToDelete(task)}
                onArchiveTask={(task) => archiveTask(task.id)}
                onMoveTask={moveTask}
                onAddNewTask={handleOpenNewTask}
                onToggleSubtask={handleToggleSubtask}
                onToggleDescriptionChecklist={handleToggleDescriptionChecklist}
              />
            )}
          </div>
        </main>
      ) : (
        /* Empty State when no boards exist */
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="text-center max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
            <div className="w-12 h-12 bg-sky-100 text-sky-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Layout className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-1">
              {t('boards.noBoardsFound')}
            </h2>
            <p className="text-xs text-slate-500 mb-6">
              {t('appDescription')}
            </p>
            <button
              type="button"
              onClick={() => setIsCreateBoardOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{t('boards.createNewBoard')}</span>
            </button>
          </div>
        </main>
      )}

      {/* Task Creation & Edit Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        onDelete={(task) => setTaskToDelete(task)}
        onArchive={(task) => archiveTask(task.id)}
        task={editingTask}
        columns={currentBoard?.columns || []}
        boardMembers={currentBoard?.members || []}
        initialColumnId={initialColumnId}
      />

      {/* Create Board Modal */}
      <CreateBoardModal
        isOpen={isCreateBoardOpen}
        onClose={() => setIsCreateBoardOpen(false)}
        onCreate={createBoard}
      />

      {/* Board Settings & Members Modal */}
      <BoardSettingsModal
        isOpen={isBoardSettingsOpen}
        onClose={() => setIsBoardSettingsOpen(false)}
        board={currentBoard}
        onUpdateBoard={updateBoard}
        onDeleteBoard={deleteBoard}
        onLeaveBoard={leaveBoard}
        isAdmin={isCurrentUserAdmin}
        currentUser={currentUser}
      />

      {/* Delete Task Confirm Dialog */}
      {taskToDelete && (
        <DeleteTaskDialog
          card={taskToDelete}
          onCancel={() => setTaskToDelete(null)}
          onConfirm={handleDeleteTaskConfirm}
        />
      )}

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  )
}

export default function App() {
  return (
    <I18nProvider>
      <AuthProvider>
        <BoardProvider>
          <KanbanApp />
        </BoardProvider>
      </AuthProvider>
    </I18nProvider>
  )
}
