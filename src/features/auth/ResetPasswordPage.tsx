import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { PasswordInput } from './PasswordInput'
import { useAuth } from './auth-context'
import { useI18n } from '../i18n/context'
import { btnPrimary } from '../../lib/ui'

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
      <div className="flex min-h-screen items-center justify-center bg-ground">
        <div className="h-8 w-8 animate-spin border border-rule border-t-signal" />
      </div>
    )
  }

  if (!session) {
    return (
      <AuthShell
        title={t('auth.invalidLinkTitle')}
        subtitle={t('auth.invalidLinkSubtitle')}
        brandLine={t('auth.brandNote')}
      >
        <Link className={btnPrimary} to="/forgot-password">
          {t('auth.requestNewLink')}
        </Link>
      </AuthShell>
    )
  }

  return (
    <AuthShell title={t('auth.newPasswordTitle')} brandLine={t('auth.brandNote')}>
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-dim" htmlFor="password">
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

        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-dim" htmlFor="confirm-password">
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

        {error ? <p className="text-[11px] text-danger">{error}</p> : null}

        <button className={btnPrimary} type="submit" disabled={submitting}>
          {submitting ? t('common.saving') : t('auth.savePassword')}
        </button>
      </form>
    </AuthShell>
  )
}
