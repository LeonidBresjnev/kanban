import { useState } from 'react'
import { Mail, Check, X, Shield, Users } from 'lucide-react'
import { useTranslation } from '../i18n'
import type { PendingInvitation } from '../types'

interface InvitationBannerProps {
  invitations?: PendingInvitation[]
  onAcceptInvitation: (boardId: string, invitationId: string) => Promise<unknown> | void
  onDeclineInvitation: (boardId: string, invitationId: string) => Promise<unknown> | void
}

export default function InvitationBanner({
  invitations = [],
  onAcceptInvitation,
  onDeclineInvitation,
}: InvitationBannerProps) {
  const { t } = useTranslation()
  const [loadingId, setLoadingId] = useState<string | null>(null)

  if (!invitations || invitations.length === 0) {
    return null
  }

  const handleAccept = async (boardId: string, invitationId: string): Promise<void> => {
    try {
      setLoadingId(invitationId)
      await onAcceptInvitation(boardId, invitationId)
    } finally {
      setLoadingId(null)
    }
  }

  const handleDecline = async (boardId: string, invitationId: string): Promise<void> => {
    try {
      setLoadingId(invitationId)
      await onDeclineInvitation(boardId, invitationId)
    } finally {
      setLoadingId(null)
    }
  }

  return (
    <div className="bg-gradient-to-r from-sky-50 via-indigo-50/70 to-blue-50 border-b border-sky-200/80 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5">
        <div className="flex items-center gap-2 mb-2 text-sky-900 font-bold text-xs uppercase tracking-wider">
          <Mail className="w-4 h-4 text-sky-600 animate-pulse" />
          <span>
            {t('invitations.bannerTitle')} ({invitations.length})
          </span>
        </div>

        <div className="space-y-2.5">
          {invitations.map((inv) => {
            const isLoading = loadingId === inv.invitationId
            const roleLabel =
              inv.role === 'admin'
                ? t('members.roleAdmin')
                : t('members.roleMember')

            return (
              <div
                key={inv.invitationId || inv.boardId}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white/90 backdrop-blur-xs border border-sky-200 rounded-2xl shadow-xs transition-all hover:shadow-md"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    {inv.role === 'admin' ? (
                      <Shield className="w-5 h-5" />
                    ) : (
                      <Users className="w-5 h-5" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-slate-800 font-semibold leading-snug">
                      {t('invitations.invitedToJoin', {
                        boardTitle: inv.boardTitle,
                        role: roleLabel,
                      })}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                      <span>
                        {t('invitations.invitedBy', { name: inv.invitedBy })}
                      </span>
                      {inv.boardDescription && (
                        <>
                          <span>•</span>
                          <span className="italic truncate max-w-xs sm:max-w-md">
                            "{inv.boardDescription}"
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleDecline(inv.boardId, inv.invitationId)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5 text-slate-400" />
                    <span>{t('invitations.decline')}</span>
                  </button>

                  <button
                    type="button"
                    disabled={isLoading}
                    onClick={() => handleAccept(inv.boardId, inv.invitationId)}
                    className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 active:bg-sky-800 rounded-xl shadow-sm hover:shadow transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>{t('invitations.accept')}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
