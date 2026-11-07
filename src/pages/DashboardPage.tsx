import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  Loader2,
  Pencil,
  PlusCircle,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useDashboard } from '../features/tasks/useDashboard'
import { describeEvent } from '../features/tasks/eventDetails'
import { ProgressBar } from '../features/tasks/ProgressBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { deleteTaskEvent } from '../lib/api/events'
import type { TimelineEvent } from '../lib/api/tasks'
import { getErrorMessage } from '../lib/errors'
import { formatDateTime, formatRelative } from '../lib/format'
import { useI18n } from '../features/i18n/context'

export function DashboardPage() {
  const { user } = useAuth()
  const { t } = useI18n()
  const { data, loading, error, refresh } = useDashboard(user?.id)
  const [eventToDelete, setEventToDelete] = useState<TimelineEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function handleDeleteEvent() {
    if (!eventToDelete) return

    setDeletingEvent(true)
    setActionError(null)

    try {
      await deleteTaskEvent(eventToDelete.id)
      setEventToDelete(null)
      refresh()
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
      setEventToDelete(null)
    } finally {
      setDeletingEvent(false)
    }
  }

  const stats = data?.stats ?? {
    total: 0,
    completed: 0,
    inProgress: 0,
    notStarted: 0,
    onHold: 0,
    averageProgress: 0,
  }

  const cards = [
    {
      label: t('dashboard.total'),
      value: stats.total,
      icon: ListChecks,
      tone: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      label: t('dashboard.completed'),
      value: stats.completed,
      icon: CheckCircle2,
      tone: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400',
    },
    {
      label: t('dashboard.inProgress'),
      value: stats.inProgress,
      icon: Clock3,
      tone: 'bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400',
    },
    {
      label: t('dashboard.notStarted'),
      value: stats.notStarted,
      icon: Circle,
      tone: 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-400',
    },
  ]

  return (
    <div className="space-y-6">
      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {actionError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {actionError}
        </div>
      ) : null}

      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-8 text-white shadow-lg shadow-indigo-600/20">
        <p className="text-sm text-indigo-100">{t('dashboard.welcomeBack')}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {user?.email?.split('@')[0] ?? '—'}
        </h1>
        <p className="mt-2 max-w-xl text-sm text-indigo-100">
          {t('dashboard.subtitle')}
        </p>
        <Link
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-50"
          to="/tasks/new"
        >
          <PlusCircle className="h-4 w-4" />
          {t('tasks.addNew')}
        </Link>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"
          >
            <div
              className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${card.tone}`}
            >
              <card.icon className="h-5 w-5" />
            </div>
            {loading ? (
              <div className="h-8 w-12 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
            ) : (
              <p className="text-2xl font-bold">{card.value}</p>
            )}
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {card.label}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              {t('dashboard.progressOverview')}
            </h2>
            <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {stats.averageProgress}%
            </span>
          </div>
          <ProgressBar className="mt-4" value={stats.averageProgress} />
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              {t('dashboard.completed')} {stats.completed}
            </span>
            <span className="rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
              {t('dashboard.inProgress')} {stats.inProgress}
            </span>
            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400">
              {t('dashboard.notStarted')} {stats.notStarted}
            </span>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              {t('dashboard.onHold')} {stats.onHold}
            </span>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h2 className="text-sm font-semibold">{t('dashboard.timeline')}</h2>
          </div>

          {loading ? (
            <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('dashboard.loadingActivity')}
            </div>
          ) : !data || data.events.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-slate-700">
              {t('dashboard.timelineEmpty')}
            </div>
          ) : (
            <ol className="mt-4 space-y-3">
              {data.events.map((event) => {
                const detail = describeEvent(event, t)
                const isDeleted = event.event_type === 'deleted'

                return (
                  <li
                    key={event.id}
                    className="rounded-xl border border-slate-100 px-3 py-2.5 dark:border-slate-800"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        {isDeleted ? (
                          <p className="truncate text-sm font-medium text-slate-500 dark:text-slate-400">
                            {event.taskTitle ?? t('dashboard.deletedTask')}
                          </p>
                        ) : (
                          <Link
                            className="block truncate text-sm font-medium transition hover:text-indigo-600 dark:hover:text-indigo-400"
                            to={`/tasks/${event.task_id}`}
                          >
                            {event.taskTitle ?? 'Task'}
                          </Link>
                        )}
                        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                          {t(`event.${event.event_type}`)}
                          {detail ? ` · ${detail}` : ''}
                        </p>
                        <p className="mt-0.5 text-[11px] text-slate-400">
                          {formatDateTime(event.created_at)} ·{' '}
                          {formatRelative(event.created_at)}
                        </p>
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {!isDeleted ? (
                          <Link
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-medium text-slate-500 transition hover:bg-slate-50 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                            to={`/tasks/${event.task_id}?edit=1`}
                          >
                            <Pencil className="h-3 w-3" />
                            {t('common.edit')}
                          </Link>
                        ) : null}
                        <button
                          aria-label={t('detail.deleteEventAria')}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                          onClick={() => setEventToDelete(event)}
                          title={t('detail.deleteEventAria')}
                          type="button"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </section>

      <ConfirmDialog
        busy={deletingEvent}
        danger
        confirmLabel={t('detail.deleteEvent')}
        description={t('detail.deleteEventDescription')}
        onClose={() => setEventToDelete(null)}
        onConfirm={() => void handleDeleteEvent()}
        open={eventToDelete !== null}
        title={t('detail.deleteEventTitle')}
      />
    </div>
  )
}
