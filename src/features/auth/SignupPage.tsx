import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { PasswordInput } from './PasswordInput'
import { useAuth } from './auth-context'
import { useI18n } from '../i18n/context'
import { btnPrimary, fieldLine } from '../../lib/ui'

export function SignupPage() {
  const { session, loading, signUp } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-ground">
        <div className="h-8 w-8 animate-spin border border-rule border-t-signal" />
      </div>
    )
  }

  if (session) {
    return <Navigate to="/" replace />
  }

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
    const { error: signUpError, needsConfirmation } = await signUp(
      email.trim(),
      password,
    )
    setSubmitting(false)

    if (signUpError) {
      setError(signUpError.message)
      return
    }

    if (needsConfirmation) {
      navigate(`/verify-email?email=${encodeURIComponent(email.trim())}`, {
        replace: true,
      })
      return
    }

    navigate('/', { replace: true })
  }

  return (
    <AuthShell
      title={t('auth.signupTitle')}
      subtitle={t('auth.signupSubtitle')}
      brandLine={t('auth.brandLine')}
    >
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-dim" htmlFor="email">
            {t('auth.email')}
          </label>
          <input
            id="email"
            className={fieldLine}
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </div>

        <div>
          <label className="text-[10px] uppercase tracking-[0.16em] text-dim" htmlFor="password">
            {t('auth.password')}
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
            {t('auth.confirmPassword')}
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
          {submitting ? t('auth.creating') : t('auth.create')}
        </button>
      </form>

      <p className="mt-5 text-center text-[11px] text-dim">
        {t('auth.hasAccount')}{' '}
        <Link
          className="text-signal underline-offset-4 transition hover:underline"
          to="/login"
        >
          {t('auth.signInLink')}
        </Link>
      </p>
    </AuthShell>
  )
}
