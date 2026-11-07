import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell, primaryButtonClass } from './AuthShell'
import { PasswordInput } from './PasswordInput'
import { useAuth } from './auth-context'
import { useI18n } from '../i18n/context'

export function ResetPasswordPage() {
  const { session, loading, updatePassword } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError(t('auth.passwordMin'))
      return
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setSubmitting(true)
    const { error: updateError } = await updatePassword(password)
    setSubmitting(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    navigate('/', { replace: true })
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    )
  }

  if (!session) {
    return (
      <AuthShell
        title={t('auth.invalidLinkTitle')}
        subtitle={t('auth.invalidLinkSubtitle')}
      >
        <Link
          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
          to="/forgot-password"
        >
          {t('auth.requestNewLink')}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('auth.newPasswordTitle')}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="password">
            {t('auth.newPassword')}
          </label>
          <PasswordInput
            id="password"
            autoComplete="new-password"
            minLength={8}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="confirm-password">
            {t('auth.confirmNewPassword')}
          </label>
          <PasswordInput
            id="confirm-password"
            autoComplete="new-password"
            minLength={8}
            required
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </div>

        {error ? (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </p>
        ) : null}

        <button className={primaryButtonClass} type="submit" disabled={submitting}>
          {submitting ? t('common.saving') : t('auth.savePassword')}
        </button>
      </form>
    </AuthShell>
  )
}
