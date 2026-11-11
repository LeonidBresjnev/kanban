import { useState, useMemo } from 'react'
import {
  Archive,
  RotateCcw,
  Trash2,
  Calendar,
  ChevronDown,
  ChevronRight,
  FolderArchive,
  Search,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import type { BoardColumn, Task } from '../types'

interface ArchiveViewProps {
  tasks?: Task[]
  columns?: BoardColumn[]
  onRestore: (task: Task) => void
  onDelete: (task: Task) => void
}

export default function ArchiveView({
  tasks = [],
  columns = [],
  onRestore,
  onDelete,
}: ArchiveViewProps) {
  const { t, language } = useTranslation()
  const [collapsedYears, setCollapsedYears] = useState<Record<string, boolean>>({})
  const [searchQuery, setSearchQuery] = useState('')

  const archivedTasks = useMemo(() => {
    return tasks.filter((task) => task.status === 'archive')
  }, [tasks])

  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return archivedTasks
    const q = searchQuery.toLowerCase()
    return archivedTasks.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        (Array.isArray(t.assignees) &&
          t.assignees.some((a) => a.toLowerCase().includes(q)))
    )
  }, [archivedTasks, searchQuery])

  // Group by year
  const tasksByYear = useMemo(() => {
    const groups: Record<string, Task[]> = {}
    filteredTasks.forEach((task) => {
      const dateStr = task.archivedAt || task.updatedAt || task.createdAt
      const year = dateStr ? new Date(dateStr).getFullYear().toString() : 'Unknown'
      if (!groups[year]) {
        groups[year] = []
      }
      groups[year].push(task)
    })

    // Sort years descending
    return Object.entries(groups).sort((a, b) => {
      if (a[0] === 'Unknown') return 1
      if (b[0] === 'Unknown') return -1
      return Number(b[0]) - Number(a[0])
    })
  }, [filteredTasks])

  const toggleYear = (year: string): void => {
    setCollapsedYears((prev) => ({
      ...prev,
      [year]: !prev[year],
    }))
  }

  return (
    <div className="bg-slate-100/80 border border-slate-200/90 rounded-2xl p-4 sm:p-6 shadow-xs animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 mb-4 border-b border-slate-200">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-slate-200 text-slate-700 rounded-xl">
            <Archive className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <span>{t('archiveTitle')}</span>
              <span className="text-xs font-semibold bg-slate-200 text-slate-700 px-2 py-0.5 rounded-full">
                {archivedTasks.length}
              </span>
            </h3>
            <p className="text-xs text-slate-500">
              {t('archiveDialog.warning')}
            </p>
          </div>
        </div>

        {/* Search inside archive */}
        {archivedTasks.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('task.filterPlaceholder')}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        )}
      </div>

      {archivedTasks.length === 0 ? (
        <div className="text-center py-10 px-4 bg-white/60 border border-dashed border-slate-200 rounded-xl">
          <FolderArchive className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-xs text-slate-500 font-medium">
            {t('archiveEmptyState')}
          </p>
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-xs text-slate-400 italic">
          {t('task.emptyColumnFiltered')}
        </div>
      ) : (
        <div className="space-y-4">
          {tasksByYear.map(([year, yearTasks]) => {
            const isCollapsed = Boolean(collapsedYears[year])
            const yearLabel =
              year === 'Unknown'
                ? t('archiveYearUnknown')
                : t('archiveYearLabel', { year })

            return (
              <div
                key={year}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs"
              >
                {/* Year Header Button */}
                <button
                  type="button"
                  onClick={() => toggleYear(year)}
                  className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100/80 transition-colors text-left cursor-pointer border-b border-slate-100"
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    )}
                    <span className="text-xs font-bold text-slate-800">
                      {yearLabel}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 bg-slate-200/80 px-2 py-0.2 rounded-full">
                      {yearTasks.length}
                    </span>
                  </div>
                </button>

                {/* Task list for this year */}
                {!isCollapsed && (
                  <div className="divide-y divide-slate-100">
                    {yearTasks.map((task) => {
                      const archiveDate = task.archivedAt
                        ? new Date(task.archivedAt).toLocaleDateString(
                            language === 'da' ? 'da-DK' : 'en-US',
                            { day: 'numeric', month: 'short', year: 'numeric' }
                          )
                        : null

                      return (
                        <div
                          key={task.id}
                          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 hover:bg-slate-50/80 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs font-semibold text-slate-800 line-clamp-1 mb-1">
                              {task.title}
                            </h4>
                            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                              {archiveDate && (
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-400" />
                                  <span>{archiveDate}</span>
                                </span>
                              )}
                              {Array.isArray(task.assignees) &&
                                task.assignees.length > 0 && (
                                  <span className="bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded font-medium">
                                    {task.assignees.join(', ')}
                                  </span>
                                )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => onRestore(task)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 rounded-lg cursor-pointer transition-colors"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              <span>{t('unarchiveTask')}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDelete(task)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer transition-colors"
                              title={t('delete')}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
