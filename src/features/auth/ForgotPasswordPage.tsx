import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { useAuth } from './auth-context'
import { useI18n } from '../i18n/context'
import { btnPrimary, fieldLine } from '../../lib/ui'

export function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    const { error: resetError } = await resetPassword(email.trim())
    setSubmitting(false)

    if (resetError) {
      setError(resetError.message)
      return
    }

    setSent(true)
  }

  return (
    <AuthShell
      title={t('auth.forgotTitle')}
      subtitle={t('auth.forgotSubtitle')}
      brandLine={t('auth.brandNote')}
    >
      {sent ? (
        <div className="space-y-3">
          <p className="text-[12px] text-muted">{t('auth.forgotSent')}</p>
          <Link className={btnPrimary} to="/login">
            {t('auth.backToLogin')}
          </Link>
        </div>
      ) : (
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

          {error ? <p className="text-[11px] text-danger">{error}</p> : null}

          <button className={btnPrimary} type="submit" disabled={submitting}>
            {submitting ? t('auth.sending') : t('auth.sendReset')}
          </button>
        </form>
      )}

      <p className="mt-5 text-center text-[11px] text-dim">
        <Link
          className="text-signal underline-offset-4 transition hover:underline"
          to="/login"
        >
          {t('auth.backToLogin')}
        </Link>
      </p>
    </AuthShell>
  )
}
