import { useState, useRef, useEffect } from 'react'
import {
  Layout,
  ChevronDown,
  Plus,
  Settings,
  Shield,
  Users,
  LogIn,
  LogOut,
  User,
  Sparkles,
  Kanban,
  Check,
} from 'lucide-react'
import { useTranslation } from '../i18n'
import LanguageSelector from './LanguageSelector'
import { useAuth } from '../context/AuthContext'
import type { Board } from '../types'

interface NavbarProps {
  boards?: Board[]
  currentBoard?: Board | null
  onSelectBoard: (boardId: string) => void
  onCreateBoardClick: () => void
  onBoardSettingsClick: () => void
  onAddNewTaskClick: () => void
  onOpenAuthModal: () => void
  isAdmin?: boolean
}

export default function Navbar({
  boards = [],
  currentBoard = null,
  onSelectBoard,
  onCreateBoardClick,
  onBoardSettingsClick,
  onAddNewTaskClick,
  onOpenAuthModal,
  isAdmin = false,
}: NavbarProps) {
  const { t } = useTranslation()
  const { currentUser, isGuest, logout } = useAuth()

  const [isBoardDropdownOpen, setIsBoardDropdownOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const boardDropdownRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!(event.target instanceof Node)) return
      if (
        boardDropdownRef.current &&
        !boardDropdownRef.current.contains(event.target)
      ) {
        setIsBoardDropdownOpen(false)
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 text-white backdrop-blur-md border-b border-slate-800 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left: App Logo & Board Selector */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          {/* Logo / Brand */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-400 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-sky-500/20">
              <Kanban className="w-5 h-5" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base font-bold tracking-tight text-white leading-tight">
                {t('appName')}
              </h1>
              <p className="text-[10px] text-sky-400 font-medium leading-none">
                {t('appSubtitle')}
              </p>
            </div>
          </div>

          <div className="h-6 w-px bg-slate-800 hidden sm:block" />

          {/* Board Selector Dropdown */}
          <div className="relative" ref={boardDropdownRef}>
            <button
              type="button"
              onClick={() => setIsBoardDropdownOpen(!isBoardDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/80 hover:bg-slate-800 text-slate-100 rounded-xl border border-slate-700/80 hover:border-slate-600 transition-all text-xs font-semibold cursor-pointer max-w-[200px] sm:max-w-[280px]"
            >
              <Layout className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="truncate">
                {currentBoard ? currentBoard.title : t('boards.selectBoard')}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
                  isBoardDropdownOpen ? 'rotate-180 text-sky-400' : ''
                }`}
              />
            </button>

            {isBoardDropdownOpen && (
              <div className="absolute left-0 mt-2 w-72 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-1.5 z-50 animate-dropdown-in">
                <div className="px-3.5 py-1.5 border-b border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>{t('boards.allBoards')}</span>
                  <span className="text-sky-600 font-semibold">{boards.length}</span>
                </div>

                <div className="max-h-64 overflow-y-auto p-1 space-y-0.5">
                  {boards.map((b) => {
                    const isSelected = b.id === currentBoard?.id
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          onSelectBoard(b.id)
                          setIsBoardDropdownOpen(false)
                        }}
                        className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left text-xs transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-sky-50 text-sky-950 font-bold'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="truncate text-xs font-semibold">{b.title}</p>
                          {b.description && (
                            <p className="truncate text-[10px] text-slate-400">
                              {b.description}
                            </p>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-4 h-4 text-sky-600 shrink-0 stroke-[2.5]" />
                        )}
                      </button>
                    )
                  })}
                </div>

                <div className="p-1 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBoardDropdownOpen(false)
                      onCreateBoardClick()
                    }}
                    className="w-full flex items-center gap-2 p-2.5 text-xs font-semibold text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>{t('boards.createNewBoard')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions, Language, User profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Board Settings & Members button */}
          {currentBoard && (
            <button
              type="button"
              onClick={onBoardSettingsClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-800 text-slate-200 border border-slate-700/80 transition-colors cursor-pointer"
              title={t('boards.boardSettings')}
            >
              {isAdmin ? (
                <Shield className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <Settings className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span className="hidden md:inline">
                {isAdmin ? t('boards.manageMembers') : t('boards.boardSettings')}
              </span>
            </button>
          )}

          {/* New Task button */}
          <button
            type="button"
            onClick={() => onAddNewTaskClick()}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-sky-500 hover:bg-sky-400 rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span className="hidden sm:inline">{t('addTask')}</span>
          </button>

          {/* Language Selector */}
          <LanguageSelector />

          {/* User Profile / Auth Menu */}
          <div className="relative" ref={userMenuRef}>
            {currentUser ? (
              <button
                type="button"
                onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                className="flex items-center gap-2 p-1 pl-2 bg-slate-800 hover:bg-slate-700 rounded-full border border-slate-700 transition-colors cursor-pointer"
              >
                <span className="text-xs font-semibold text-slate-200 hidden sm:inline max-w-[120px] truncate">
                  {currentUser.displayName || currentUser.email?.split('@')[0]}
                </span>
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-sky-400 to-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                  {(currentUser.displayName || currentUser.email || 'U')
                    .charAt(0)
                    .toUpperCase()}
                </div>
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-sky-600 hover:bg-sky-500 text-white transition-colors cursor-pointer shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>{t('auth.logIn')}</span>
              </button>
            )}

            {isUserMenuOpen && currentUser && (
              <div className="absolute right-0 mt-2 w-52 bg-white text-slate-900 border border-slate-200 rounded-2xl shadow-2xl overflow-hidden py-1 z-50 animate-dropdown-in">
                <div className="px-3.5 py-2.5 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900 truncate">
                    {currentUser.displayName || t('guestUser')}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {currentUser.email || ''}
                  </p>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false)
                      logout()
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>{t('auth.logOut')}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
