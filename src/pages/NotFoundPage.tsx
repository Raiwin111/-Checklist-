import { Link } from 'react-router-dom'
import { useI18n } from '../features/i18n/context'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-950">
      <p className="text-6xl font-black text-indigo-600 dark:text-indigo-400">404</p>
      <h1 className="text-xl font-bold">{t('notFound.title')}</h1>
      <p className="max-w-sm text-sm text-slate-500 dark:text-slate-400">
        {t('notFound.subtitle')}
      </p>
      <Link
        className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
        to="/"
      >
        {t('notFound.back')}
      </Link>
    </div>
  )
}
