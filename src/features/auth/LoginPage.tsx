import { useState, type FormEvent } from 'react'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { PasswordInput } from './PasswordInput'
import { useAuth } from './auth-context'
import { useI18n } from '../i18n/context'
import { btnPrimary, fieldLine } from '../../lib/ui'

export function LoginPage() {
  const { session, loading, signIn } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
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
    setSubmitting(true)
    const { error: signInError } = await signIn(email.trim(), password)
    setSubmitting(false)

    if (signInError) {
      setError(signInError.message)
      return
    }

    const from =
      (location.state as { from?: string } | null)?.from ?? '/'
    navigate(from, { replace: true })
  }

  return (
    <AuthShell
      title={t('auth.loginTitle')}
      subtitle={t('auth.loginSubtitle')}
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

        <div className="space-y-2">
          <div className="flex items-end justify-between gap-2">
            <label className="text-[10px] uppercase tracking-[0.16em] text-dim" htmlFor="password">
              {t('auth.password')}
            </label>
            <Link
              className="text-[10px] uppercase tracking-[0.12em] text-signal transition hover:underline"
              to="/forgot-password"
            >
              {t('auth.forgot')}
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {error ? <p className="text-[11px] text-danger">{error}</p> : null}

        <button className={btnPrimary} type="submit" disabled={submitting}>
          {submitting ? t('auth.signingIn') : t('auth.signIn')}
        </button>
      </form>

      <p className="mt-5 text-center text-[11px] text-dim">
        {t('auth.noAccount')}{' '}
        <Link
          className="text-signal underline-offset-4 transition hover:underline"
          to="/signup"
        >
          {t('auth.signUpLink')}
        </Link>
      </p>
    </AuthShell>
  )
}
