import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { useI18n } from '../i18n/context'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const email = searchParams.get('email')

  return (
    <AuthShell
      title={t('auth.verifyTitle')}
      subtitle={t('auth.verifySubtitle')}
    >
      <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
        {email ? (
          <p>
            {t('auth.verifySentTo', { email })}
          </p>
        ) : null}
        <p>{t('auth.verifyHint')}</p>
        <p className="rounded-xl bg-slate-100 px-4 py-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
          {t('auth.verifySpam')}
        </p>
        <Link
          className="block w-full rounded-xl bg-indigo-600 px-4 py-3 text-center text-sm font-semibold text-white transition hover:bg-indigo-500"
          to="/login"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    </AuthShell>
  )
}
