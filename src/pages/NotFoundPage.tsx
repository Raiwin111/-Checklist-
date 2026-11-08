import { Link } from 'react-router-dom'
import { useI18n } from '../features/i18n/context'
import { btnPrimary } from '../lib/ui'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
      <p className="text-[48px] font-medium leading-none text-ink">
        404
      </p>
      <h1 className="text-[20px] font-semibold">{t('notFound.title')}</h1>
      <p className="max-w-sm text-[13px] leading-relaxed text-muted">
        {t('notFound.subtitle')}
      </p>
      <Link className={btnPrimary} to="/">
        {t('notFound.back')}
      </Link>
    </div>
  )
}
