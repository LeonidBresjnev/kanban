import { useState, useMemo } from 'react'
import {
  Plus,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Inbox,
} from 'lucide-react'
import TaskCard from './TaskCard'
import { useTranslation } from '../i18n'

const COLUMN_COLOR_MAP = {
  indigo: {
    badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    dot: 'bg-indigo-500',
    border: 'border-indigo-200/80',
    bg: 'bg-indigo-50/30',
  },
  amber: {
    badge: 'bg-amber-50 text-amber-700 border-amber-200',
    dot: 'bg-amber-500',
    border: 'border-amber-200/80',
    bg: 'bg-amber-50/30',
  },
  emerald: {
    badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dot: 'bg-emerald-500',
    border: 'border-emerald-200/80',
    bg: 'bg-emerald-50/30',
  },
  purple: {
    badge: 'bg-purple-50 text-purple-700 border-purple-200',
    dot: 'bg-purple-500',
    border: 'border-purple-200/80',
    bg: 'bg-purple-50/30',
  },
  rose: {
    badge: 'bg-rose-50 text-rose-700 border-rose-200',
    dot: 'bg-rose-500',
    border: 'border-rose-200/80',
    bg: 'bg-rose-50/30',
  },
  cyan: {
    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    dot: 'bg-cyan-500',
    border: 'border-cyan-200/80',
    bg: 'bg-cyan-50/30',
  },
  slate: {
    badge: 'bg-slate-100 text-slate-700 border-slate-200',
    dot: 'bg-slate-500',
    border: 'border-slate-200/80',
    bg: 'bg-slate-50/40',
  },
}

export default function BoardView({
  columns = [],
  tasks = [],
  filterAssignee = '',
  filterPriority = '',
  searchQuery = '',
  onEditTask,
  onDeleteTask,
  onArchiveTask,
  onMoveTask,
  onAddNewTask,
  onToggleSubtask,
  onToggleDescriptionChecklist,
}) {
  const { t } = useTranslation()

  // Track collapsed columns
  const [collapsedCols, setCollapsedCols] = useState({})
  // Track active mobile column tab
  const [activeMobileCol, setActiveMobileCol] = useState(() => columns[0]?.id || 'todo')
  // Track drag hover over column
  const [dragOverCol, setDragOverCol] = useState(null)

  // Filter tasks based on filters & search
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      // Exclude archived tasks from board columns view
      if (task.status === 'archive') return false

      if (filterAssignee) {
        if (!Array.isArray(task.assignees) || !task.assignees.includes(filterAssignee)) {
          return false
        }
      }

      if (filterPriority && task.priority !== filterPriority) {
        return false
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const matchTitle = task.title?.toLowerCase().includes(q)
        const matchDesc = task.description?.toLowerCase().includes(q)
        const matchAssignee =
          Array.isArray(task.assignees) &&
          task.assignees.some((a) => a.toLowerCase().includes(q))
        if (!matchTitle && !matchDesc && !matchAssignee) {
          return false
        }
      }

      return true
    })
  }, [tasks, filterAssignee, filterPriority, searchQuery])

  // Group tasks by column status
  const tasksByColumn = useMemo(() => {
    const map = {}
    columns.forEach((col) => {
      map[col.id] = filteredTasks.filter((t) => t.status === col.id)
    })
    return map
  }, [columns, filteredTasks])

  const toggleColumnCollapse = (colId) => {
    setCollapsedCols((prev) => ({
      ...prev,
      [colId]: !prev[colId],
    }))
  }

  // HTML5 Drag and drop handlers
  const handleDragOver = (e, colId) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOverCol !== colId) {
      setDragOverCol(colId)
    }
  }

  const handleDragLeave = (e, colId) => {
    if (dragOverCol === colId) {
      setDragOverCol(null)
    }
  }

  const handleDrop = (e, targetColId) => {
    e.preventDefault()
    setDragOverCol(null)
    const taskId = e.dataTransfer.getData('text/plain')
    if (taskId) {
      onMoveTask(taskId, targetColId)
    }
  }

  return (
    <div className="w-full">
      {/* Mobile Tab navigation (< md) */}
      <div className="md:hidden mb-4">
        <div
          role="tablist"
          aria-label={t('mobileTablistAria')}
          className="flex items-center gap-1.5 overflow-x-auto p-1.5 bg-slate-200/70 rounded-xl"
        >
          {columns.map((col) => {
            const count = tasksByColumn[col.id]?.length || 0
            const isActive = activeMobileCol === col.id
            const colorTheme = COLUMN_COLOR_MAP[col.color] || COLUMN_COLOR_MAP.indigo

            return (
              <button
                key={col.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveMobileCol(col.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${colorTheme.dot}`} />
                <span>{col.title}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
                    isActive ? 'bg-slate-100 text-slate-700' : 'bg-slate-300 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Grid of Columns (Desktop and Mobile Tabbed) */}
      <div
        className="grid grid-cols-1 md:grid-flow-col md:auto-cols-fr gap-4 items-start"
        style={{
          minHeight: '480px',
        }}
      >
        {columns.map((col) => {
          const colTasks = tasksByColumn[col.id] || []
          const isCollapsed = Boolean(collapsedCols[col.id])
          const colorTheme = COLUMN_COLOR_MAP[col.color] || COLUMN_COLOR_MAP.indigo
          const isDragOver = dragOverCol === col.id

          // On mobile, only render the active tab column
          const isVisibleOnMobile = activeMobileCol === col.id

          return (
            <div
              key={col.id}
              className={`flex flex-col rounded-2xl bg-slate-100/90 border transition-all duration-150 ${
                isDragOver
                  ? 'border-sky-500 ring-2 ring-sky-500/20 bg-sky-50/50'
                  : 'border-slate-200/90'
              } ${isVisibleOnMobile ? 'block' : 'hidden md:flex'}`}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between p-3.5 pb-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colorTheme.dot}`} />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider truncate">
                    {col.title}
                  </h3>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-full shrink-0">
                    {colTasks.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAddNewTask(col.id)}
                    className="p-1 text-slate-500 hover:text-sky-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                    title={t('addTask')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleColumnCollapse(col.id)}
                    className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
                    title={
                      isCollapsed
                        ? t('expandColumn', { name: col.title })
                        : t('collapseColumn', { name: col.title })
                    }
                  >
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Column Body / Cards List */}
              {!isCollapsed && (
                <div className="p-2 pt-0 flex flex-col gap-2.5 flex-1 min-h-[140px]">
                  {colTasks.length === 0 ? (
                    <div
                      onClick={() => onAddNewTask(col.id)}
                      className={`flex flex-col items-center justify-center p-6 border border-dashed rounded-xl transition-all cursor-pointer text-center group ${
                        isDragOver
                          ? 'border-sky-400 bg-sky-100/50 text-sky-700'
                          : 'border-slate-300/80 bg-white/40 hover:bg-white/80 hover:border-slate-400 text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      <Inbox className="w-6 h-6 mb-1 text-slate-300 group-hover:text-slate-400" />
                      <p className="text-xs font-semibold">
                        {t('task.emptyColumn')}
                      </p>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {t('task.emptyColumnDropHint')}
                      </p>
                    </div>
                  ) : (
                    colTasks.map((task) => (
                      <TaskCard
                        key={task.id}
                        task={task}
                        columns={columns}
                        onEdit={onEditTask}
                        onDelete={onDeleteTask}
                        onArchive={onArchiveTask}
                        onMove={onMoveTask}
                        onToggleSubtask={onToggleSubtask}
                        onToggleDescriptionChecklist={onToggleDescriptionChecklist}
                      />
                    ))
                  )}

                  {/* Quick Add Card button at bottom */}
                  <button
                    type="button"
                    onClick={() => onAddNewTask(col.id)}
                    className="w-full mt-1 py-2 px-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-sky-700 hover:bg-white/80 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>{t('addTask')}</span>
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
