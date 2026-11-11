import { useState, useEffect } from 'react'
import {
  X,
  Settings,
  Users,
  Shield,
  Trash2,
  Plus,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  Check,
  AlertCircle,
  Mail,
  LogOut,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import type { AuthUser, Board, BoardColumn, BoardInvitation, BoardMember, BoardRole, UpdateBoardInput } from '../types'

const COLOR_OPTIONS = [
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-500' },
]

interface BoardSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  board: Board | null
  onUpdateBoard: (boardId: string, updates: UpdateBoardInput) => Promise<void>
  onDeleteBoard: (boardId: string) => Promise<void>
  onLeaveBoard?: (boardId: string) => Promise<void>
  isAdmin?: boolean
  currentUser?: AuthUser | null
}

export default function BoardSettingsModal({
  isOpen,
  onClose,
  board,
  onUpdateBoard,
  onDeleteBoard,
  onLeaveBoard,
  isAdmin = false,
  currentUser = null,
}: BoardSettingsModalProps) {
  const { t } = useTranslation()

  const [activeTab, setActiveTab] = useState('general') // 'general' | 'columns' | 'members'
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [columns, setColumns] = useState<BoardColumn[]>([])
  const [members, setMembers] = useState<BoardMember[]>([])
  const [invitations, setInvitations] = useState<BoardInvitation[]>([])

  const [newColumnTitle, setNewColumnTitle] = useState('')
  const [newColumnColor, setNewColumnColor] = useState<BoardColumn['color']>('indigo')

  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<BoardRole>('member')

  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)

  useEffect(() => {
    if (board) {
      setTitle(board.title || '')
      setDescription(board.description || '')
      setColumns(Array.isArray(board.columns) ? board.columns : [])
      setMembers(Array.isArray(board.members) ? board.members : [])
      setInvitations(Array.isArray(board.invitations) ? board.invitations : [])
    }
    setError('')
    setSuccess('')
    setShowDeleteConfirm(false)
    setShowLeaveConfirm(false)
  }, [board, isOpen])

  if (!isOpen || !board) return null

  // Columns actions
  const handleAddColumn = (e?: React.FormEvent): void => {
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

  const handleRemoveColumn = (colId: string): void => {
    if (columns.length <= 1) {
      setError('A board must contain at least one column.')
      return
    }
    setColumns(columns.filter((c) => c.id !== colId))
  }

  const handleMoveColumn = (index: number, direction: number): void => {
    const newIdx = index + direction
    if (newIdx < 0 || newIdx >= columns.length) return
    const updated = [...columns]
    const temp = updated[index]
    updated[index] = updated[newIdx]
    updated[newIdx] = temp
    setColumns(updated)
  }

  const handleUpdateColumnTitle = (colId: string, newTitle: string): void => {
    setColumns(
      columns.map((c) => (c.id === colId ? { ...c, title: newTitle } : c))
    )
  }

  // Members actions
  const handleInviteMember = (e?: React.FormEvent): void => {
    if (e) e.preventDefault()
    const trimmedName = inviteName.trim()
    const trimmedEmail = inviteEmail.trim()
    if (!trimmedName && !trimmedEmail) return

    const displayName = trimmedName || trimmedEmail.split('@')[0]

    const existsInMembers = members.some(
      (m) =>
        (trimmedEmail && m.email && m.email.toLowerCase() === trimmedEmail.toLowerCase()) ||
        (trimmedName && m.name && m.name.toLowerCase() === trimmedName.toLowerCase())
    )

    if (existsInMembers) {
      setError('Member is already on this board.')
      return
    }

    const existsInInvitations = invitations.some(
      (inv) =>
        (trimmedEmail && inv.email && inv.email.toLowerCase() === trimmedEmail.toLowerCase()) ||
        (trimmedName && inv.name && inv.name.toLowerCase() === trimmedName.toLowerCase())
    )

    if (existsInInvitations) {
      setError(t('invitations.alreadyInvited'))
      return
    }

    const newInvitation: BoardInvitation = {
      id: 'inv-' + Date.now() + '-' + Math.random().toString(36).substring(2, 5),
      name: displayName,
      email: trimmedEmail,
      role: inviteRole || 'member',
      invitedAt: new Date().toISOString(),
      invitedBy: currentUser?.displayName || currentUser?.email?.split('@')[0] || 'Administrator',
    }

    setInvitations([...invitations, newInvitation])
    setInviteName('')
    setInviteEmail('')
    setInviteRole('member')
    setError('')
    setSuccess(t('boards.memberInvited'))
  }

  const handleCancelInvitation = (invitationId: string): void => {
    setInvitations(invitations.filter((inv) => inv.id !== invitationId))
    setSuccess(t('invitations.invitationCancelled'))
  }

  const handleToggleMemberRole = (memberId: string | undefined, currentRole: BoardRole | undefined): void => {
    const targetRole = currentRole === 'admin' ? 'member' : 'admin'

    // Prevent removing the last admin
    if (currentRole === 'admin') {
      const adminCount = members.filter((m) => m.role === 'admin').length
      if (adminCount <= 1) {
        setError('At least one administrator is required on the board.')
        return
      }
    }

    setMembers(
      members.map((m) => (m.id === memberId ? { ...m, role: targetRole } : m))
    )
    setSuccess(t('boards.roleUpdated'))
  }

  const handleRemoveMember = (memberId: string | undefined): void => {
    const member = members.find((m) => m.id === memberId)
    if (member?.role === 'admin') {
      const adminCount = members.filter((m) => m.role === 'admin').length
      if (adminCount <= 1) {
        setError('Cannot remove the only administrator on the board.')
        return
      }
    }

    setMembers(members.filter((m) => m.id !== memberId))
    setSuccess(t('boards.memberRemoved'))
  }

  const handleLeaveBoardAction = async (): Promise<void> => {
    const userEmail = (currentUser?.email || '').toLowerCase()
    const userName = (currentUser?.displayName || '').toLowerCase()
    const userId = currentUser?.uid

    const isMemberAdmin = members.some((m) => {
      const isThisUser =
        (userId && m.id === userId) ||
        (userEmail && m.email && m.email.toLowerCase() === userEmail) ||
        (userName && m.name && m.name.toLowerCase() === userName)
      return isThisUser && m.role === 'admin'
    })

    if (isMemberAdmin) {
      const adminCount = members.filter((m) => m.role === 'admin').length
      if (adminCount <= 1 && members.length > 1) {
        setError(t('invitations.cannotLeaveOnlyAdmin'))
        return
      }
    }

    if (onLeaveBoard) {
      await onLeaveBoard(board.id)
      onClose()
    }
  }

  const handleSave = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault()
    if (!title.trim()) {
      setError(t('boards.boardName') + ' is required')
      return
    }

    if (columns.length === 0) {
      setError('At least one workflow column is required.')
      return
    }

    await onUpdateBoard(board.id, {
      title: title.trim(),
      description: description.trim(),
      columns,
      members,
      invitations,
    })

    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="board-settings-title"
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
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3
                id="board-settings-title"
                className="text-xl font-bold text-slate-900 tracking-tight"
              >
                {t('boards.boardSettings')}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">{board.title}</p>
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

        {/* Tabs */}
        <div className="flex items-center gap-1 mt-4 p-1 bg-slate-100 rounded-xl border border-slate-200/80">
          <button
            type="button"
            onClick={() => setActiveTab('general')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'general'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('boards.boardName')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('columns')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'columns'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('boards.columnsConfig')} ({columns.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`flex-1 py-1.5 px-3 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === 'members'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t('boards.manageMembers')} ({members.length})
          </button>
        </div>

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 animate-fade-in">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800 animate-fade-in">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Tab Content */}
        <div className="overflow-y-auto py-4 space-y-4 pr-1 flex-1">
          {/* General Tab */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('boards.boardName')} *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t('boards.boardDescription')}
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t('boards.boardDescriptionPlaceholder')}
                  className="w-full p-3 text-sm bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>

              {/* Danger Zone: Delete board */}
              {isAdmin && (
                <div className="mt-6 p-4 bg-red-50/70 border border-red-200 rounded-2xl">
                  <h4 className="text-xs font-bold text-red-900 mb-1 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <span>{t('boards.deleteBoard')}</span>
                  </h4>
                  <p className="text-xs text-red-700 mb-3">
                    {t('boards.deleteBoardConfirm', { name: board.title })}
                  </p>
                  {!showDeleteConfirm ? (
                    <button
                      type="button"
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3.5 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-100 rounded-lg cursor-pointer transition-colors"
                    >
                      {t('boards.deleteBoard')}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          await onDeleteBoard(board.id)
                          onClose()
                        }}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer shadow-sm"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowDeleteConfirm(false)}
                        className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                      >
                        {t('cancel')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Columns Tab */}
          {activeTab === 'columns' && (
            <div className="space-y-4">
              <div className="p-3 bg-sky-50 border border-sky-100 rounded-xl text-xs text-sky-800">
                Customize workflow columns and stages for tasks on this board.
              </div>

              <div className="space-y-2">
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

              {/* Add column input */}
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
          )}

          {/* Members & Roles Tab */}
          {activeTab === 'members' && (
            <div className="space-y-5">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 leading-relaxed">
                <p className="font-semibold text-slate-800 mb-0.5">
                  {t('members.title')}
                </p>
                <span>{t('members.transferOwnership')}</span>
              </div>

              {/* Invite member section */}
              {isAdmin && (
                <div className="p-3.5 bg-sky-50/70 border border-sky-200/80 rounded-xl space-y-2">
                  <span className="text-xs font-bold text-sky-900 flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-sky-600" />
                    <span>{t('members.inviteTitle')}</span>
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      placeholder="Name..."
                      className="flex-1 min-w-[120px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="Email..."
                      className="flex-1 min-w-[140px] px-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as BoardRole)}
                      className="px-2 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="member">{t('members.roleMember')}</option>
                      <option value="admin">{t('members.roleAdmin')}</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleInviteMember}
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>{t('members.inviteBtn')}</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Active Members Section */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                  <span>{t('invitations.activeMembers')}</span>
                  <span className="text-slate-400 font-semibold">{members.length}</span>
                </div>

                {members.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 italic text-center bg-slate-50 rounded-xl">
                    {t('members.emptyMembers')}
                  </p>
                ) : (
                  members.map((member) => {
                    const isCurrentAdmin = member.role === 'admin'
                    const isCreator =
                      board.creatorId === member.id ||
                      (board.creatorEmail &&
                        member.email &&
                        board.creatorEmail.toLowerCase() === member.email.toLowerCase())

                    const isCurrentLoggedInUser =
                      currentUser &&
                      ((currentUser.uid && member.id === currentUser.uid) ||
                        (currentUser.email &&
                          member.email &&
                          currentUser.email.toLowerCase() === member.email.toLowerCase()) ||
                        (currentUser.displayName &&
                          member.name &&
                          currentUser.displayName.toLowerCase() === member.name.toLowerCase()))

                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-slate-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-sky-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                            {member.name ? member.name.charAt(0).toUpperCase() : 'M'}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {member.name}
                              </span>
                              {isCurrentLoggedInUser && (
                                <span className="text-[10px] font-semibold text-sky-600 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-100 shrink-0">
                                  {t('members.you')}
                                </span>
                              )}
                              {isCreator && (
                                <span className="text-[10px] font-semibold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded shrink-0">
                                  {t('boards.ownerBadge')}
                                </span>
                              )}
                            </div>
                            {member.email && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {member.email}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {/* Role Badge / Toggle button for Admins */}
                          {isAdmin ? (
                            <button
                              type="button"
                                      onClick={() => member.id && handleToggleMemberRole(member.id, member.role)}
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer border ${
                                isCurrentAdmin
                                  ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                              title={
                                isCurrentAdmin ? t('members.removeAdmin') : t('members.makeAdmin')
                              }
                            >
                              <Shield className="w-3.5 h-3.5 text-indigo-500" />
                              <span>
                                {isCurrentAdmin
                                  ? t('members.roleAdmin')
                                  : t('members.roleMember')}
                              </span>
                            </button>
                          ) : (
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded border ${
                                isCurrentAdmin
                                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                                  : 'bg-slate-50 text-slate-600 border-slate-200'
                              }`}
                            >
                              {isCurrentAdmin && (
                                <Shield className="w-3 h-3 text-indigo-500" />
                              )}
                              {isCurrentAdmin
                                ? t('members.roleAdmin')
                                : t('members.roleMember')}
                            </span>
                          )}

                          {/* Remove Member button */}
                          {isAdmin && (
                            <button
                              type="button"
                              onClick={() => member.id && handleRemoveMember(member.id)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title={t('members.removeMember')}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>

              {/* Pending Invitations Section */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
                  <span className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-sky-500" />
                    <span>{t('invitations.pendingInvitations')}</span>
                  </span>
                  <span className="text-sky-600 font-semibold">{invitations.length}</span>
                </div>

                {invitations.length === 0 ? (
                  <p className="p-3 text-xs text-slate-400 italic text-center bg-slate-50/70 rounded-xl border border-slate-100">
                    {t('invitations.noPendingInvitations')}
                  </p>
                ) : (
                  invitations.map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between p-3 bg-sky-50/40 border border-sky-100 rounded-xl"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {inv.name ? inv.name.charAt(0).toUpperCase() : 'I'}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-800 truncate">
                              {inv.name}
                            </span>
                            <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.2 rounded shrink-0">
                              {t('invitations.pendingBadge')}
                            </span>
                          </div>
                          {inv.email && (
                            <p className="text-[11px] text-slate-500 truncate">
                              {inv.email}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2 py-0.5 rounded-lg">
                          {inv.role === 'admin'
                            ? t('members.roleAdmin')
                            : t('members.roleMember')}
                        </span>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={() => handleCancelInvitation(inv.id)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                            title={t('invitations.cancelInvitation')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Leave Board Section (Available to members) */}
              {onLeaveBoard && (
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl pt-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">
                        {t('boards.leaveBoard')}
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        {t('boards.leaveBoardConfirm', { name: board.title })}
                      </p>
                    </div>

                    {!showLeaveConfirm ? (
                      <button
                        type="button"
                        onClick={() => setShowLeaveConfirm(true)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 rounded-xl transition-colors cursor-pointer shrink-0"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>{t('boards.leaveBoard')}</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={handleLeaveBoardAction}
                          className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-lg cursor-pointer transition-colors shadow-xs"
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowLeaveConfirm(false)}
                          className="px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800"
                        >
                          {t('cancel')}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

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
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
          >
            {t('saveChanges')}
          </button>
        </div>
      </div>
    </div>
  )
}
