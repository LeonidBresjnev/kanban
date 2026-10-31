import { useState } from 'react'
import {
  X,
  Plus,
  Trash2,
  Layout,
  Users,
  Shield,
  ArrowUp,
  ArrowDown,
  Sparkles,
  AlertCircle,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import { DEFAULT_COLUMNS } from '../context/BoardContext'

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-500' },
]

export default function CreateBoardModal({ isOpen, onClose, onCreate }) {
  const { t } = useTranslation()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState(() => [
    { id: 'todo', title: 'Coming Up', color: 'indigo' },
    { id: 'in_progress', title: 'In Progress', color: 'amber' },
    { id: 'done', title: 'Done', color: 'emerald' },
  ])
  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnColor, setNewColumnColor] = useState('indigo')

  const [members, setMembers] = useState([])
  const [newMemberName, setNewMemberName] = useState('')
  const [newMemberEmail, setNewMemberEmail] = useState('')
  const [newMemberRole, setNewMemberRole] = useState('member')
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleAddColumn = (e) => {
    if (e) e.preventDefault()
    const trimmed = newColumnTitle.trim()
    if (!trimmed) return

    const colId =
      trimmed.toLowerCase().replace(/[^a-z0-9]/g, '_') +
      '_' +
      Math.random().toString(36).substring(2, 5)

    setColumns([
      ...columns,
      {
        id: colId,
        title: trimmed,
        color: newColumnColor || 'indigo',
      },
    ])
    setNewColumnTitle('')
  }

  const handleRemoveColumn = (colId) => {
    if (columns.length <= 1) {
      setError('A board must have at least one workflow column.')
      return
    }
    setColumns(columns.filter((c) => c.id !== colId))
  }

  const handleMoveColumn = (index, direction) => {
    const newIdx = index + direction
    if (newIdx < 0 || newIdx >= columns.length) return
    const updated = [...columns]
    const temp = updated[index]
    updated[index] = updated[newIdx]
    updated[newIdx] = temp
    setColumns(updated)
  }

  const handleUpdateColumnTitle = (colId, newTitle) => {
    setColumns(
      columns.map((c) => (c.id === colId ? { ...c, title: newTitle } : c))
    )
  }

  const handleAddMember = (e) => {
    if (e) e.preventDefault()
    const trimmedName = newMemberName.trim()
    const trimmedEmail = newMemberEmail.trim()
    if (!trimmedName && !trimmedEmail) return

    const displayName = trimmedName || trimmedEmail.split('@')[0]

    setMembers([
      ...members,
      {
        name: displayName,
        email: trimmedEmail,
        role: newMemberRole || 'member',
      },
    ])
    setNewMemberName('')
    setNewMemberEmail('')
    setNewMemberRole('member')
  }

  const handleRemoveMember = (index) => {
    setMembers(members.filter((_, idx) => idx !== index))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('boards.boardName') + ' is required')
      return
    }

    if (columns.length === 0) {
      setError('Please add at least one column.')
      return
    }

    onCreate({
      title: title.trim(),
      description: description.trim(),
      columns,
      initialMembers: members,
    })

    // Reset fields
    setTitle('')
    setDescription('')
    setColumns(DEFAULT_COLUMNS)
    setMembers([])
    setError('')
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-board-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 sm:p-7 border border-slate-200 overflow-hidden max-h-[90vh] flex flex-col animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-md">
              <Layout className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="create-board-modal-title"
                className="text-xl font-bold text-slate-900 tracking-tight"
              >
                {t('boards.createNewBoard')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {t('boards.defaultColumnsNote')}
              </p>
            </div>
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-4 space-y-5 pr-1">
          {/* Board Title */}
          <div>
            <label htmlFor="board-name-input" className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('boards.boardName')} *
            </label>
            <input
              id="board-name-input"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('boards.boardNamePlaceholder')}
              className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              {t('boards.boardDescription')}
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('boards.boardDescriptionPlaceholder')}
              className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Columns / Stages Configuration */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Layout className="w-4 h-4 text-sky-600" />
                  <span>{t('boards.columnsConfig')}</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Define workflow stages (e.g. Backlog, Doing, In Review, Done)
                </p>
              </div>
              <span className="text-[11px] font-semibold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                {columns.length} columns
              </span>
            </div>

            {/* List of configured columns */}
            <div className="space-y-2 mb-3">
              {columns.map((col, idx) => (
                <div
                  key={col.id || idx}
                  className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-xl shadow-2xs"
                >
                  <div
                    className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                      COLOR_OPTIONS.find((c) => c.id === col.color)?.bg || 'bg-sky-500'
                    }`}
                  />
                  <input
                    type="text"
                    value={col.title}
                    onChange={(e) => handleUpdateColumnTitle(col.id, e.target.value)}
                    className="flex-1 text-xs font-semibold text-slate-800 bg-transparent focus:bg-slate-50 px-2 py-1 rounded border border-transparent focus:border-slate-300 focus:outline-none"
                  />

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveColumn(idx, -1)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === columns.length - 1}
                      onClick={() => handleMoveColumn(idx, 1)}
                      className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveColumn(col.id)}
                      className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Column Row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={newColumnTitle}
                onChange={(e) => setNewColumnTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddColumn()
                  }
                }}
                placeholder={t('boards.columnNamePlaceholder')}
                className="flex-1 min-w-[140px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />

              <select
                value={newColumnColor}
                onChange={(e) => setNewColumnColor(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddColumn}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('boards.addColumn')}</span>
              </button>
            </div>
          </div>

          {/* Initial Members & Roles */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-sky-600" />
                  <span>{t('members.inviteTitle')}</span>
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  {t('members.transferOwnership')}
                </p>
              </div>
            </div>

            {/* Added members list */}
            {members.length > 0 && (
              <div className="space-y-1.5 mb-3">
                {members.map((m, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-semibold text-slate-800 truncate">{m.name}</span>
                      {m.email && (
                        <span className="text-slate-400 text-[11px] truncate">({m.email})</span>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.2 rounded border ${
                          m.role === 'admin'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {m.role === 'admin' && <Shield className="w-2.5 h-2.5 text-indigo-500" />}
                        {m.role === 'admin' ? t('members.roleAdmin') : t('members.roleMember')}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(idx)}
                      className="text-slate-400 hover:text-red-600 p-1 rounded cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add member row */}
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                placeholder="Name..."
                className="flex-1 min-w-[120px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="email"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="Email (optional)..."
                className="flex-1 min-w-[140px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="member">{t('members.roleMember')}</option>
                <option value="admin">{t('members.roleAdmin')}</option>
              </select>
              <button
                type="button"
                onClick={handleAddMember}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{t('add')}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100 mt-auto">
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
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-sky-200" />
            <span>{t('create')}</span>
          </button>
        </div>
      </div>
    </div>
  )
}
