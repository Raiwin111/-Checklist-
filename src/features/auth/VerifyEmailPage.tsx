import { Link, useSearchParams } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { useI18n } from '../i18n/context'
import { btnPrimary } from '../../lib/ui'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const { t } = useI18n()
  const email = searchParams.get('email')

  return (
    <AuthShell
      title={t('auth.verifyTitle')}
      subtitle={t('auth.verifySubtitle')}
      brandLine={t('auth.brandNote')}
    >
      <div className="space-y-3">
        {email ? (
          <p className="text-[12px] text-muted">{t('auth.verifySentTo', { email })}</p>
        ) : null}
        <p className="text-[12px] text-muted">{t('auth.verifyHint')}</p>
        <p className="border-l border-danger bg-danger/10 pl-3 py-2 text-[11px] text-danger">
          {t('auth.verifySpam')}
        </p>
        <Link
          className={btnPrimary}
          to="/login"
        >
          {t('auth.backToLogin')}
        </Link>
      </div>
    </AuthShell>
  )
}
