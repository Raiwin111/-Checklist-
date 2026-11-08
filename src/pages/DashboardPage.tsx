import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useDashboard } from '../features/tasks/useDashboard'
import { describeEvent } from '../features/tasks/eventDetails'
import { ProgressBar } from '../features/tasks/ProgressBar'
import { StatusBadge } from '../features/tasks/StatusBadge'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CacheNotice } from '../components/CacheNotice'
import { deleteTaskEvent } from '../lib/api/events'
import type { DashboardTask, TimelineEvent } from '../lib/api/tasks'
import { getErrorMessage } from '../lib/errors'
import { formatRelative } from '../lib/format'
import { useI18n } from '../features/i18n/context'
import type { TaskStatus } from '../types/database'
import { btnPrimary, btnSecondary, label } from '../lib/ui'

const LEGEND_ORDER: TaskStatus[] = [
  'in_progress',
  'on_hold',
  'completed',
  'not_started',
]

export function DashboardPage() {
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const { data, loading, error, refresh, fromCache, cachedAt } = useDashboard(
    user?.id,
  )
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

  const tasks = data?.tasks ?? []
  const categoryName = new Map(
    (data?.categories ?? []).map((category) => [
      category.id,
      locale === 'th' ? category.name_th : category.name_en,
    ]),
  )

  const openTasks = tasks.filter((task) => task.status !== 'completed')
  const nowTasks = openTasks
    .filter((task) => task.status === 'in_progress' || task.status === 'on_hold')
    .slice(0, 3)
  const nextTasks = openTasks
    .filter((task) => task.status === 'not_started')
    .slice(0, 3)

  function renderLine(task: DashboardTask) {
    const name = task.category_id
      ? categoryName.get(task.category_id)
      : undefined

    return (
      <li
        key={task.id}
        className="relative border-b border-rule-soft last:border-b-0"
      >
        <span
          aria-hidden
          className="absolute -left-4 top-1/2 hidden h-px w-3 bg-rule lg:block"
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 gap-y-2 py-3 lg:grid-cols-[minmax(0,1fr)_120px_96px] lg:items-center lg:gap-5">
          <div className="min-w-0">
            <Link
              className="block truncate text-[14px] font-medium text-ink transition hover:text-signal"
              to={`/tasks/${task.id}`}
            >
              {task.title}
            </Link>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[10px] text-dim">
              <span className="truncate uppercase tracking-[0.12em]">
                {name ?? t('common.noCategory')}
              </span>
              <span aria-hidden>·</span>
              <span>{formatRelative(task.client_updated_at ?? task.updated_at)}</span>
            </p>
          </div>

          <div className="col-span-2 lg:col-span-1">
            <ProgressBar status={task.status} value={task.progress} />
          </div>

          <div className="flex flex-col items-end gap-0.5 lg:flex-row lg:items-baseline lg:gap-3">
            <span className="text-[10px] tabular-nums text-muted">
              {task.progress}%
            </span>
            <StatusBadge status={task.status} />
          </div>
        </div>
      </li>
    )
  }

  return (
    <div className="space-y-5">
      {fromCache ? <CacheNotice cachedAt={cachedAt} /> : null}

      {error ? (
        <p className="border-l border-danger bg-danger/10 px-3 py-2 text-[12px] text-danger">
          {error}
        </p>
      ) : null}

      {actionError ? (
        <p className="border-l border-danger bg-danger/10 px-3 py-2 text-[12px] text-danger">
          {actionError}
        </p>
      ) : null}

      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-rule pb-4">
        <div className="min-w-0">
          <h1 className="text-[28px] font-semibold leading-[1.05] tracking-[-0.025em] sm:text-[30px]">
            {loading ? (
              <span className="tabular-nums text-signal">— </span>
            ) : (
              <span className="tabular-nums text-signal">{openTasks.length} </span>
            )}
            <span className="text-ink">{t('dashboard.openHeading')}</span>
          </h1>
          <p className="mt-1.5 max-w-[48ch] text-[12px] leading-relaxed text-muted">
            {t('dashboard.subtitle')}
          </p>
        </div>

        <div className="flex items-baseline gap-4">
          <div>
            <p className={label}>{t('dashboard.average')}</p>
            <p className="mt-0.5 text-[22px] font-medium leading-none tracking-[-0.03em] tabular-nums">
              {stats.averageProgress}
              <span className="ml-0.5 text-[12px] text-dim">%</span>
            </p>
          </div>
        </div>
      </header>

      <section aria-label={t('dashboard.lineForm')}>
        <div className="flex h-[2px] w-full overflow-hidden">
          <span className="h-full flex-1" style={{ background: 'var(--status-todo)' }} />
          <span className="h-full flex-1" style={{ background: 'var(--status-live)' }} />
          <span className="h-full flex-1" style={{ background: 'var(--status-done)' }} />
          <span className="h-full flex-1" style={{ background: 'var(--status-hold)' }} />
        </div>
        <ul className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1">
          {LEGEND_ORDER.map((status) => (
            <li key={status}>
              <StatusBadge status={status} />
            </li>
          ))}
        </ul>
      </section>

      {loading ? (
        <div className="space-y-2 border-t border-rule pt-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-rule-soft py-3"
            >
              <div className="h-2.5 flex-1 animate-pulse bg-plate-2" />
              <div className="h-[2px] w-24 animate-pulse bg-plate-2" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-5">
            {nowTasks.length > 0 ? (
              <DashboardGroup
                labelText={t('dashboard.now')}
                tasks={nowTasks}
                renderLine={renderLine}
                viewAll={t('dashboard.viewAll')}
              />
            ) : null}

            {nextTasks.length > 0 ? (
              <DashboardGroup
                labelText={t('dashboard.next')}
                tasks={nextTasks}
                renderLine={renderLine}
                viewAll={t('dashboard.viewAll')}
              />
            ) : null}

            {tasks.length === 0 ? (
              <div className="border-y border-rule py-12 text-center">
                <div
                  aria-hidden
                  className="mx-auto flex h-8 w-8 items-center justify-center border border-rule text-dim"
                >
                  <Plus className="h-3.5 w-3.5" />
                </div>
                <h2 className="mt-3 text-[13px] font-medium">
                  {t('dashboard.empty')}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">
                  {t('dashboard.emptyHint')}
                </p>
                <Link className={`${btnPrimary} mt-4`} to="/tasks/new">
                  {t('dashboard.addFirst')}
                </Link>
              </div>
            ) : openTasks.length === 0 ? (
              <div className="border-y border-rule py-12 text-center">
                <p className="text-[20px] font-medium leading-tight tracking-[-0.02em] text-status-done">
                  {t('dashboard.allClear')}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  {t('dashboard.allClearHint')}
                </p>
                <Link className={`${btnSecondary} mt-4`} to="/tasks/new">
                  {t('nav.addTask')}
                </Link>
              </div>
            ) : null}
          </div>

          <aside className="border-t border-rule pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-1.5">
              <h2 className={label}>{t('dashboard.timeline')}</h2>
              <span className="text-[9px] tabular-nums text-dim">
                {data?.events.length ?? 0}
              </span>
            </div>

            {loading ? (
              <p className="mt-3 flex items-center gap-2 text-[11px] text-dim">
                <Loader2 className="h-3 w-3 animate-spin" />
                {t('dashboard.loadingActivity')}
              </p>
            ) : !data || data.events.length === 0 ? (
              <p className="mt-3 text-[11px] leading-relaxed text-dim">
                {t('dashboard.timelineEmpty')}
              </p>
            ) : (
              <ol className="border-l border-rule-soft">
                {data.events.slice(0, 12).map((event) => {
                  const detail = describeEvent(event, t)
                  const isDeleted = event.event_type === 'deleted'

                  return (
                    <li
                      key={event.id}
                      className="relative border-b border-rule-soft py-2.5 pl-3 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className="absolute -left-px top-[18px] h-px w-2 bg-rule"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {isDeleted ? (
                            <p className="truncate text-[12px] font-medium text-muted">
                              {event.taskTitle ?? t('dashboard.deletedTask')}
                            </p>
                          ) : (
                            <Link
                              className="block truncate text-[12px] font-medium text-ink transition hover:text-signal"
                              to={`/tasks/${event.task_id}`}
                            >
                              {event.taskTitle ?? 'Task'}
                            </Link>
                          )}
                          <p className="mt-0.5 text-[10px] text-muted">
                            {t(`event.${event.event_type}`)}
                            {detail ? ` · ${detail}` : ''}
                          </p>
                          <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-dim">
                            {formatRelative(event.created_at)}
                          </p>
                        </div>

                        <button
                          aria-label={t('detail.deleteEventAria')}
                          className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-dim transition hover:text-danger"
                          onClick={() => setEventToDelete(event)}
                          title={t('detail.deleteEventAria')}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </li>
                  )
                })}
              </ol>
            )}
          </aside>
        </div>
      )}

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

function DashboardGroup({
  labelText,
  tasks,
  renderLine,
  viewAll,
}: {
  labelText: string
  tasks: DashboardTask[]
  renderLine: (task: DashboardTask) => ReactNode
  viewAll: string
}) {
  return (
    <section>
      <div className="flex items-baseline justify-between gap-3 border-b border-rule pb-1.5">
        <h2 className={label}>{labelText}</h2>
        <Link
          className="text-[9px] font-medium uppercase tracking-[0.14em] text-dim transition hover:text-signal"
          to="/tasks"
        >
          {viewAll}
        </Link>
      </div>
      <ul className="lg:border-l lg:border-rule lg:pl-4">
        {tasks.map((task) => renderLine(task))}
      </ul>
    </section>
  )
}
