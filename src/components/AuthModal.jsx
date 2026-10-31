import { useState } from 'react'
import {
  auth,
  sendPasswordResetEmail,
} from '../firebase'
import { useAuth } from '../context/AuthContext'
import {
  LogIn,
  UserPlus,
  Mail,
  Lock,
  User,
  AlertCircle,
  Loader2,
  X,
  KeyRound,
  CheckCircle2,
  ArrowLeft,
  Sparkles,
} from 'lucide-react'
import { useTranslation } from '../i18n'

export default function AuthModal({ isOpen, onClose }) {
  const { t } = useTranslation()
  const { loginWithGoogle, loginWithEmail, signupWithEmail, loginAsGuest } = useAuth()

  const [authMode, setAuthMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const isSignUp = authMode === 'signup'
  const isForgot = authMode === 'forgot'

  const getFriendlyErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return t('auth.invalidEmail')
      case 'auth/user-disabled':
        return t('auth.userDisabled')
      case 'auth/user-not-found':
        return t('auth.userNotFound')
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return t('auth.wrongPassword')
      case 'auth/email-already-in-use':
        return t('auth.emailAlreadyInUse')
      case 'auth/weak-password':
        return t('auth.weakPassword')
      case 'auth/popup-closed-by-user':
        return t('auth.popupClosed')
      case 'auth/operation-not-allowed':
        return t('auth.operationNotAllowed')
      case 'auth/too-many-requests':
        return t('auth.tooManyRequests')
      default:
        return t('auth.genericError')
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    const normalizedEmail = email.trim().toLowerCase()
    if (!normalizedEmail) {
      setError(t('auth.enterEmailPrompt'))
      setLoading(false)
      return
    }

    try {
      if (auth) {
        await sendPasswordResetEmail(auth, normalizedEmail)
      }
      setSuccessMessage(t('auth.resetPasswordSuccess', { email: normalizedEmail }))
    } catch (err) {
      console.error('Password reset error:', err)
      setError(getFriendlyErrorMessage(err.code || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      if (isSignUp) {
        await signupWithEmail(email.trim(), password, displayName.trim())
      } else {
        await loginWithEmail(email.trim(), password)
      }
      onClose()
    } catch (err) {
      console.error('Email authentication error:', err)
      setError(getFriendlyErrorMessage(err.code || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError('')
    setSuccessMessage('')
    setLoading(true)

    try {
      await loginWithGoogle()
      onClose()
    } catch (err) {
      console.error('Google login error:', err)
      setError(getFriendlyErrorMessage(err.code || err.message))
    } finally {
      setLoading(false)
    }
  }

  const handleGuestLogin = () => {
    loginAsGuest()
    onClose()
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border border-slate-200 overflow-hidden animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label={t('close')}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-gradient-to-tr from-sky-500 to-indigo-600 text-white rounded-xl shadow-md">
            {isForgot ? (
              <KeyRound className="w-6 h-6" />
            ) : isSignUp ? (
              <UserPlus className="w-6 h-6" />
            ) : (
              <LogIn className="w-6 h-6" />
            )}
          </div>
          <div>
            <h3 id="auth-modal-title" className="text-xl font-bold text-slate-900 tracking-tight">
              {isForgot
                ? t('auth.modalForgotTitle')
                : isSignUp
                  ? t('auth.modalSignupTitle')
                  : t('auth.modalLoginTitle')}
            </h3>
            <p className="text-xs text-slate-500">
              {isForgot
                ? t('auth.modalForgotSubtitle')
                : isSignUp
                  ? t('auth.modalSignupSubtitle')
                  : t('auth.modalLoginSubtitle')}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3.5 bg-red-50/90 border border-red-200/80 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
            <span className="leading-relaxed">{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3.5 bg-emerald-50/90 border border-emerald-200/80 rounded-xl flex items-start gap-2.5 text-xs text-emerald-800 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
            <span className="leading-relaxed">{successMessage}</span>
          </div>
        )}

        {!isForgot ? (
          <>
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-2.5 px-4 bg-white border border-slate-300 hover:border-slate-400 hover:bg-slate-50 text-slate-700 rounded-xl font-medium text-sm transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed mb-4"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{t('auth.googleSignIn')}</span>
            </button>

            <div className="relative flex py-2 items-center mb-4">
              <div className="grow border-t border-slate-200"></div>
              <span className="shrink mx-4 text-xs text-slate-400 font-medium">
                {t('auth.orWithEmail')}
              </span>
              <div className="grow border-t border-slate-200"></div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t('auth.fullNameLabel')}
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      placeholder={t('auth.fullNamePlaceholder')}
                      className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {t('auth.emailLabel')}
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t('auth.emailPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    {t('auth.passwordLabel')}
                  </label>
                  {!isSignUp && (
                    <button
                      type="button"
                      onClick={() => {
                        setError('')
                        setSuccessMessage('')
                        setAuthMode('forgot')
                      }}
                      className="text-[11px] text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                    >
                      {t('auth.forgotPasswordLink')}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t('auth.passwordPlaceholder')}
                    className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                <span>
                  {loading
                    ? t('auth.submitting')
                    : isSignUp
                      ? t('auth.signupSubmitButton')
                      : t('auth.loginSubmitButton')}
                </span>
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2 text-center text-xs">
              <button
                type="button"
                onClick={handleGuestLogin}
                className="inline-flex items-center justify-center gap-1.5 py-2 px-3 text-slate-600 hover:text-sky-700 hover:bg-sky-50 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>{t('auth.guestSignIn')}</span>
              </button>

              <div className="text-slate-500">
                {isSignUp ? t('auth.haveAccountPrompt') : t('auth.noAccountPrompt')}{' '}
                <button
                  type="button"
                  onClick={() => {
                    setError('')
                    setSuccessMessage('')
                    setAuthMode(isSignUp ? 'login' : 'signup')
                  }}
                  className="font-semibold text-sky-600 hover:text-sky-800 hover:underline cursor-pointer"
                >
                  {isSignUp ? t('auth.loginLink') : t('auth.createAccountLink')}
                </button>
              </div>
            </div>
          </>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {t('auth.emailLabel')}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('auth.emailPlaceholder')}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-medium text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{loading ? t('auth.submitting') : t('auth.forgotSubmitButton')}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setError('')
                setSuccessMessage('')
                setAuthMode('login')
              }}
              className="w-full flex items-center justify-center gap-1.5 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>{t('auth.backToLogin')}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
