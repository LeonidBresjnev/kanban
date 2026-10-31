import { useState, useEffect } from 'react'
import {
  X,
  ListPlus,
  Plus,
  Trash2,
  Calendar,
  AlertCircle,
  CheckSquare,
  Sparkles,
  Archive,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import AssigneeDropdown from './AssigneeDropdown'

export default function TaskModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  onArchive,
  task = null,
  columns = [],
  boardMembers = [],
  initialColumnId = null,
}) {
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')
  const [priority, setPriority] = useState('medium')
  const [assignees, setAssignees] = useState([])
  const [dueDate, setDueDate] = useState('')
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (task) {
      setTitle(task.title || '')
      setDescription(task.description || '')
      setStatus(task.status || columns[0]?.id || 'todo')
      setPriority(task.priority || 'medium')
      setAssignees(Array.isArray(task.assignees) ? task.assignees : [])
      setDueDate(task.dueDate || '')
      setSubtasks(Array.isArray(task.subtasks) ? task.subtasks : [])
    } else {
      setTitle('')
      setDescription('')
      setStatus(initialColumnId || columns[0]?.id || 'todo')
      setPriority('medium')
      setAssignees([])
      setDueDate('')
      setSubtasks([])
    }
    setNewSubtaskTitle('')
    setError('')
  }, [task, isOpen, initialColumnId, columns])

  if (!isOpen) return null

  const isEditing = Boolean(task)

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault()
    const trimmed = newSubtaskTitle.trim()
    if (!trimmed) return

    setSubtasks([
      ...subtasks,
      {
        id: 'st-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
        title: trimmed,
        completed: false,
      },
    ])
    setNewSubtaskTitle('')
  }

  const handleToggleSubtask = (subtaskId) => {
    setSubtasks(
      subtasks.map((st) => (st.id === subtaskId ? { ...st, completed: !st.completed } : st))
    )
  }

  const handleRemoveSubtask = (subtaskId) => {
    setSubtasks(subtasks.filter((st) => st.id !== subtaskId))
  }

  const handleInsertChecklist = () => {
    const prefix = description ? `${description}\n- [ ] ` : '- [ ] '
    setDescription(prefix)
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('task.title') + ' is required')
      return
    }

    onSave({
      ...(task || {}),
      title: title.trim(),
      description: description.trim(),
      status: status || columns[0]?.id || 'todo',
      priority,
      assignees,
      dueDate: dueDate || null,
      subtasks,
    })
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 id="task-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {isEditing ? t('editTask') : t('createTask')}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing ? t('dragAndDropHint') : t('task.descriptionPlaceholder')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label={t('close')}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-4 space-y-4 pr-1">
          {/* Title */}
          <div>
            <label htmlFor="task-title-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('task.title')}
            </label>
            <input
              id="task-title-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('task.titlePlaceholder')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Workflow Status & Priority & Due Date in 3 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Status / Column */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('task.status')}
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer"
              >
                {columns.map((col) => (
                  <option key={col.id} value={col.id}>
                    {col.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('priority.label')}
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer"
              >
                <option value="high">{t('priority.high')}</option>
                <option value="medium">{t('priority.medium')}</option>
                <option value="low">{t('priority.low')}</option>
              </select>
            </div>

            {/* Due Date */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                {t('task.dueDate')}
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 transition-all cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('assignee.formLabel')}
            </label>
            <AssigneeDropdown
              boardMembers={boardMembers}
              selectedAssignees={assignees}
              onChange={setAssignees}
            />
          </div>

          {/* Description & Checklist insertion */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                {t('task.description')}
              </label>
              <button
                type="button"
                onClick={handleInsertChecklist}
                className="inline-flex items-center gap-1 text-[11px] font-medium text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
                <span>{t('task.insertChecklist')}</span>
              </button>
            </div>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('task.descriptionPlaceholder')}
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all font-mono"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              💡 {t('task.descriptionChecklistHint')}
            </p>
          </div>

          {/* Subtasks Section */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CheckSquare className="w-4 h-4 text-sky-600" />
                <span>{t('task.subtasks')}</span>
              </label>
              {subtasks.length > 0 && (
                <span className="text-[11px] text-slate-500 font-medium">
                  {t('task.subtasksCount', {
                    completed: subtasks.filter((s) => s.completed).length,
                    total: subtasks.length,
                  })}
                </span>
              )}
            </div>

            {/* Subtask list */}
            {subtasks.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {subtasks.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between gap-2 p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <label className="flex items-center gap-2 cursor-pointer min-w-0 flex-1">
                      <input
                        type="checkbox"
                        checked={st.completed}
                        onChange={() => handleToggleSubtask(st.id)}
                        className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 cursor-pointer"
                      />
                      <span
                        className={`truncate ${
                          st.completed ? 'line-through text-slate-400' : 'text-slate-800'
                        }`}
                      >
                        {st.title}
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleRemoveSubtask(st.id)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer transition-colors"
                      title={t('task.removeSubtask')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add Subtask Input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSubtaskTitle}
                onChange={(e) => setNewSubtaskTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddSubtask()
                  }
                }}
                placeholder={t('task.subtaskPlaceholder')}
                className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <button
                type="button"
                onClick={handleAddSubtask}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('task.addSubtask')}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-2">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(task)
                  onClose()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>{t('delete')}</span>
              </button>
            )}
            {isEditing && onArchive && (
              <button
                type="button"
                onClick={() => {
                  onArchive(task)
                  onClose()
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                <Archive className="w-4 h-4" />
                <span>{t('archiveTask')}</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
            >
              {t('cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              {isEditing ? t('saveChanges') : t('createTask')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
