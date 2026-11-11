import { useState } from 'react'
import {
  Calendar,
  CheckSquare,
  MoreVertical,
  Trash2,
  Archive,
  ArrowRight,
  ArrowLeft,
  Clock,
  AlertTriangle,
  User,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import type { BoardColumn, Task, TaskPriority } from '../types'

interface ChecklistLine {
  index: number
  completed: boolean
  text: string
}

interface TaskCardProps {
  task: Task
  columns?: BoardColumn[]
  onEdit: (task: Task) => void
  onDelete?: (task: Task) => void
  onArchive?: (task: Task) => void
  onMove: (taskId: string, status: string) => void
  onToggleSubtask?: (task: Task, subtaskId: string) => void
  onToggleDescriptionChecklist?: (task: Task, lineIndex: number) => void
}

export default function TaskCard({
  task,
  columns = [],
  onEdit,
  onDelete,
  onArchive,
  onMove,
  onToggleSubtask,
  onToggleDescriptionChecklist,
}: TaskCardProps) {
  const { t, language } = useTranslation()
  const [showMenu, setShowMenu] = useState(false)

  const currentColIdx = columns.findIndex((c) => c.id === task.status)
  const prevCol = currentColIdx > 0 ? columns[currentColIdx - 1] : null
  const nextCol = currentColIdx < columns.length - 1 ? columns[currentColIdx + 1] : null

  // Priority badge styling
  const getPriorityBadge = (p: TaskPriority) => {
    switch (p) {
      case 'high':
        return {
          label: t('priority.high'),
          className: 'bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/20',
          dot: 'bg-rose-500',
        }
      case 'medium':
        return {
          label: t('priority.medium'),
          className: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
          dot: 'bg-amber-500',
        }
      case 'low':
      default:
        return {
          label: t('priority.low'),
          className: 'bg-slate-50 text-slate-600 border-slate-200 ring-slate-400/20',
          dot: 'bg-slate-400',
        }
    }
  }

  const priorityStyle = getPriorityBadge(task.priority)

  // Due date calculation
  const getDueDateInfo = (dueDate: string | null) => {
    if (!dueDate) return null
    const due = new Date(dueDate)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    due.setHours(0, 0, 0, 0)

    const diffTime = due.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    const formattedDate = due.toLocaleDateString(language === 'da' ? 'da-DK' : 'en-US', {
      day: 'numeric',
      month: 'short',
    })

    if (diffDays < 0) {
      return {
        text: `${formattedDate} (${t('task.overdue')})`,
        isOverdue: true,
        isSoon: false,
      }
    } else if (diffDays === 0) {
      return {
        text: `${formattedDate} (${t('task.dueToday')})`,
        isOverdue: false,
        isSoon: true,
      }
    } else if (diffDays === 1) {
      return {
        text: `${formattedDate} (${t('task.dueTomorrow')})`,
        isOverdue: false,
        isSoon: true,
      }
    } else {
      return {
        text: formattedDate,
        isOverdue: false,
        isSoon: false,
      }
    }
  }

  const dueInfo = getDueDateInfo(task.dueDate)

  // Subtasks progress
  const subtasks = Array.isArray(task.subtasks) ? task.subtasks : []
  const completedSubtasks = subtasks.filter((st) => st.completed).length

  // Parse inline description checklists (- [ ] or - [x])
  const checklistLines: ChecklistLine[] = (task.description || '')
    .split('\n')
    .map((line, index) => {
      const match = line.match(/^(\s*)-\s*\[([ xX])\]\s*(.*)$/)
      if (match) {
        return {
          index,
          completed: match[2].toLowerCase() === 'x',
          text: match[3],
        }
      }
      return null
    })
    .filter((line): line is ChecklistLine => line !== null)

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>): void => {
    e.dataTransfer.setData('text/plain', task.id)
    e.dataTransfer.effectAllowed = 'move'
    e.currentTarget.classList.add('opacity-40', 'scale-95')
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>): void => {
    e.currentTarget.classList.remove('opacity-40', 'scale-95')
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onClick={() => onEdit(task)}
      className="group relative bg-white border border-slate-200/90 hover:border-sky-400 rounded-xl p-4 shadow-2xs hover:shadow-md transition-all duration-150 cursor-pointer select-none"
    >
      {/* Header: Priority & Quick Actions */}
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <span
          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${priorityStyle.className}`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${priorityStyle.dot}`} />
          {priorityStyle.label}
        </span>

        <div className="flex items-center gap-1">
          {/* Quick Column Shift for Keyboard / Mobile */}
          {prevCol && (
            <button
              type="button"
              title={`Move to ${prevCol.title}`}
              onClick={(e) => {
                e.stopPropagation()
                onMove(task.id, prevCol.id)
              }}
              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
            </button>
          )}

          {nextCol && (
            <button
              type="button"
              title={`Move to ${nextCol.title}`}
              onClick={(e) => {
                e.stopPropagation()
                onMove(task.id, nextCol.id)
              }}
              className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded cursor-pointer transition-colors"
            >
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setShowMenu(!showMenu)
              }}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded cursor-pointer transition-colors"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden py-1 z-20 animate-dropdown-in"
                onClick={(e) => e.stopPropagation()}
              >
                {onArchive && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onArchive(task)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-slate-700 hover:bg-slate-50 cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-slate-500" />
                    <span>{t('archiveTask')}</span>
                  </button>
                )}
                {onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false)
                      onDelete(task)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{t('delete')}</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Task Title */}
      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-sky-600 transition-colors line-clamp-2 mb-1.5 leading-snug">
        {task.title}
      </h4>

      {/* Description Snippet */}
      {task.description && checklistLines.length === 0 && (
        <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
          {task.description}
        </p>
      )}

      {/* Inline checklist items preview */}
      {checklistLines.length > 0 && (
        <div className="space-y-1 mb-3 pt-1 border-t border-slate-100">
          {checklistLines.slice(0, 3).map((item, idx) => (
            <div
              key={idx}
              onClick={(e) => {
                e.stopPropagation()
                if (onToggleDescriptionChecklist) {
                  onToggleDescriptionChecklist(task, item.index)
                }
              }}
              className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 group/item cursor-pointer"
            >
              <div
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                  item.completed
                    ? 'bg-sky-600 border-sky-600 text-white'
                    : 'border-slate-300 group-hover/item:border-sky-500 bg-white'
                }`}
              >
                {item.completed && <span className="text-[10px] font-bold">✓</span>}
              </div>
              <span
                className={`truncate ${
                  item.completed ? 'line-through text-slate-400' : ''
                }`}
              >
                {item.text}
              </span>
            </div>
          ))}
          {checklistLines.length > 3 && (
            <p className="text-[10px] text-slate-400 font-medium pl-5.5">
              +{checklistLines.length - 3} more checklist items
            </p>
          )}
        </div>
      )}

      {/* Subtasks Progress */}
      {subtasks.length > 0 && (
        <div className="mb-3">
          <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1">
            <span className="flex items-center gap-1 font-medium">
              <CheckSquare className="w-3 h-3 text-slate-400" />
              {t('task.subtasks')}
            </span>
            <span className="font-semibold text-slate-700">
              {completedSubtasks}/{subtasks.length}
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                completedSubtasks === subtasks.length ? 'bg-emerald-500' : 'bg-sky-500'
              }`}
              style={{
                width: `${Math.round((completedSubtasks / subtasks.length) * 100)}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Footer: Due date & Assignees */}
      <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        {/* Due Date Indicator */}
        {dueInfo ? (
          <div
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium ${
              dueInfo.isOverdue
                ? 'bg-red-50 text-red-700 font-semibold'
                : dueInfo.isSoon
                  ? 'bg-amber-50 text-amber-800 font-semibold'
                  : 'text-slate-500'
            }`}
          >
            {dueInfo.isOverdue ? (
              <AlertTriangle className="w-3 h-3 text-red-600" />
            ) : (
              <Calendar className="w-3 h-3 text-slate-400" />
            )}
            <span>{dueInfo.text}</span>
          </div>
        ) : (
          <div />
        )}

        {/* Assignee Avatars / Pills */}
        {Array.isArray(task.assignees) && task.assignees.length > 0 ? (
          <div className="flex items-center -space-x-1.5 overflow-hidden">
            {task.assignees.slice(0, 3).map((assignee, idx) => {
              const initial = assignee ? assignee.charAt(0).toUpperCase() : '?'
              return (
                <div
                  key={idx}
                  title={assignee}
                  className="w-6 h-6 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-[10px] flex items-center justify-center ring-2 ring-white shadow-2xs shrink-0"
                >
                  {initial}
                </div>
              )
            })}
            {task.assignees.length > 3 && (
              <div
                title={`${task.assignees.length - 3} more`}
                className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 font-bold text-[9px] flex items-center justify-center ring-2 ring-white shadow-2xs shrink-0"
              >
                +{task.assignees.length - 3}
              </div>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-slate-400 italic">
            {t('assignee.unassigned')}
          </span>
        )}
      </div>
    </div>
  )
}
