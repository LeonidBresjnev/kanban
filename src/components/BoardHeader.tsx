import {
  Users,
  Shield,
  Search,
  Filter,
  Archive,
  Plus,
  Settings,
  Sparkles,
  Layers,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import type { Board, Task } from '../types'

interface BoardHeaderProps {
  board: Board | null
  tasks?: Task[]
  filterAssignee: string
  setFilterAssignee: (value: string) => void
  filterPriority: string
  setFilterPriority: (value: string) => void
  searchQuery: string
  setSearchQuery: (value: string) => void
  showArchive: boolean
  setShowArchive: (value: boolean) => void
  onAddNewTask: () => void
  onOpenSettings: () => void
  isAdmin?: boolean
}

export default function BoardHeader({
  board,
  tasks = [],
  filterAssignee,
  setFilterAssignee,
  filterPriority,
  setFilterPriority,
  searchQuery,
  setSearchQuery,
  showArchive,
  setShowArchive,
  onAddNewTask,
  onOpenSettings,
  isAdmin = false,
}: BoardHeaderProps) {
  const { t } = useTranslation()

  if (!board) return null

  const membersList = (board.members || []).map((member) => member.name || member.email || 'Member')

  const archivedCount = tasks.filter((t) => t.status === 'archive').length
  const activeCount = tasks.filter((t) => t.status !== 'archive').length

  return (
    <div className="bg-white border-b border-slate-200/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        {/* Top line: Board Title, Description, and Badges */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-5">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                {board.title}
              </h2>

              {/* Creator / Admin Badge */}
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border shadow-2xs ${
                  isAdmin
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}
              >
                <Shield className="w-3 h-3 text-indigo-500" />
                <span>{isAdmin ? t('boards.adminBadge') : t('boards.memberBadge')}</span>
              </span>

              {/* Members Count Pill */}
              <button
                type="button"
                onClick={onOpenSettings}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-sky-700 bg-slate-100 hover:bg-sky-50 border border-slate-200 hover:border-sky-200 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
                title={t('members.title')}
              >
                <Users className="w-3 h-3 text-slate-500" />
                <span>{membersList.length} members</span>
              </button>
            </div>

            {board.description && (
              <p className="text-xs sm:text-sm text-slate-500 max-w-3xl leading-relaxed">
                {board.description}
              </p>
            )}
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2.5 shrink-0">
            {/* Archive Toggle Button */}
            <button
              type="button"
              onClick={() => setShowArchive(!showArchive)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer ${
                showArchive
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
              }`}
            >
              <Archive className="w-4 h-4" />
              <span>{showArchive ? t('hideArchive') : t('showArchive')}</span>
              {archivedCount > 0 && (
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    showArchive
                      ? 'bg-slate-800 text-slate-200'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {archivedCount}
                </span>
              )}
            </button>

            {/* Add Task Button */}
            <button
              type="button"
              onClick={() => onAddNewTask()}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>{t('createTask')}</span>
            </button>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100">
          {/* Search box */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filters: Assignee & Priority */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
            {/* Assignee Filter */}
            <div className="flex items-center gap-1 text-xs">
              <select
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">{t('assignee.all')}</option>
                {membersList.map((member, idx) => (
                  <option key={idx} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </div>

            {/* Priority Filter */}
            <div className="flex items-center gap-1 text-xs">
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
              >
                <option value="">{t('priority.all')}</option>
                <option value="high">{t('priority.high')}</option>
                <option value="medium">{t('priority.medium')}</option>
                <option value="low">{t('priority.low')}</option>
              </select>
            </div>

            {/* Reset Filters if any filter is active */}
            {(filterAssignee || filterPriority || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setFilterAssignee('')
                  setFilterPriority('')
                  setSearchQuery('')
                }}
                className="px-2.5 py-1.5 text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}

            <span className="text-[11px] text-slate-400 font-medium pl-2 hidden sm:inline">
              {activeCount === 1
                ? t('showingTasksCountSingle')
                : t('showingTasksCount', { count: activeCount })}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
