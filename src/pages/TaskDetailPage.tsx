import { useState } from 'react'
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom'
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Pencil,
  Trash2,
} from 'lucide-react'
import { useAuth } from '../features/auth/auth-context'
import { useTaskDetail } from '../features/tasks/useTaskDetail'
import { useCategories } from '../features/tasks/useCategories'
import { TaskForm, type TaskFormValues } from '../features/tasks/TaskForm'
import { StatusBadge } from '../features/tasks/StatusBadge'
import { ProgressBar } from '../features/tasks/ProgressBar'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { CacheNotice } from '../components/CacheNotice'
import { updateTask, softDeleteTask } from '../lib/api/tasks'
import { deleteTaskImage, uploadTaskImage } from '../lib/api/images'
import { deleteTaskEvent, logTaskEvent } from '../lib/api/events'
import { formatDateTime, formatRelative } from '../lib/format'
import { getErrorMessage } from '../lib/errors'
import { describeEvent } from '../features/tasks/eventDetails'
import { useI18n } from '../features/i18n/context'
import { updateLocalTask, deleteLocalTask } from '../lib/offline/local'
import { isOnline } from '../lib/offline/network'
import { tr } from '../lib/messages'
import type { TaskEvent } from '../types/database'
import {
  btnDanger,
  btnPrimary,
  dataRow,
  errorBox,
  label,
  pageTitle,
  section,
  warningBox,
} from '../lib/ui'

export function TaskDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const { t, locale } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const { task, events, loading, error, refresh, fromCache, cachedAt } =
    useTaskDetail(id, user?.id)
  const { categories } = useCategories(user?.id)

  const [editing, setEditing] = useState(
    () => new URLSearchParams(location.search).get('edit') === '1',
  )
  const [submitting, setSubmitting] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [eventToDelete, setEventToDelete] = useState<TaskEvent | null>(null)
  const [deletingEvent, setDeletingEvent] = useState(false)

  const warning = (location.state as { warning?: string } | null)?.warning

  async function handleUpdate(values: TaskFormValues) {
    if (!user || !task) return

    setSubmitting(true)
    setActionError(null)

    try {
      if (isOnline()) {
        await updateTask(
          task.id,
          user.id,
          {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId || null,
            status: values.status,
            progress: values.progress,
          },
          task,
        )

        const removedImages = task.images.filter((image) =>
          values.removedImageIds.includes(image.id),
        )
        await Promise.allSettled(
          removedImages.map((image) => deleteTaskImage(image)),
        )
        if (removedImages.length > 0) {
          await logTaskEvent({
            taskId: task.id,
            userId: user.id,
            eventType: 'image_removed',
            payload: { count: removedImages.length },
          })
        }

        let uploadedCount = 0
        const failedImages: string[] = []

        for (const file of values.newImages) {
          try {
            await uploadTaskImage(user.id, task.id, file)
            uploadedCount += 1
          } catch (uploadError) {
            console.error('Failed to upload image', uploadError)
            failedImages.push(file.name)
          }
        }

        if (uploadedCount > 0) {
          await logTaskEvent({
            taskId: task.id,
            userId: user.id,
            eventType: 'image_added',
            payload: { count: uploadedCount },
          })
        }

        if (failedImages.length > 0) {
          setActionError(
            t('form.uploadFailed', { names: failedImages.join(', ') }),
          )
        }

        setEditing(false)
        refresh()
      } else {
        await updateLocalTask(
          user.id,
          task.id,
          {
            title: values.title,
            description: values.description,
            categoryId: values.categoryId || null,
            status: values.status,
            progress: values.progress,
          },
          task,
        )
        setEditing(false)
        setActionError(
          values.newImages.length > 0 || values.removedImageIds.length > 0
            ? t('offline.imagesSkipped', {
                count:
                  values.newImages.length + values.removedImageIds.length,
              })
            : tr('offline.updatedOffline'),
        )
        refresh()
      }
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!user || !task) return

    setDeleting(true)
    setActionError(null)

    try {
      if (isOnline()) {
        await Promise.allSettled(
          task.images.map((image) => deleteTaskImage(image)),
        )
        await softDeleteTask(task.id, user.id)
      } else {
        await deleteLocalTask(user.id, task.id, task)
        setActionError(tr('offline.deletedOffline'))
      }
      navigate('/tasks', { replace: true })
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

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

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-signal" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className={errorBox}>{error}</p>
        <Link className="text-[11px] uppercase tracking-[0.14em] text-signal" to="/tasks">
          {t('detail.backToTasks')}
        </Link>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="border-y border-rule py-16 text-center">
        <h1 className="text-[15px] font-medium">{t('detail.notFound')}</h1>
        <p className="mt-1 text-[12px] text-muted">{t('detail.notFoundHint')}</p>
        <Link className={`${btnPrimary} mt-5`} to="/tasks">
          {t('detail.backToTasks')}
        </Link>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="mx-auto max-w-2xl space-y-7">
        <div>
          <button
            className="inline-flex min-h-11 items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-dim transition hover:text-ink"
            onClick={() => setEditing(false)}
            type="button"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('detail.backToDetail')}
          </button>
          <h1 className={`${pageTitle} mt-2`}>{t('detail.editTitle')}</h1>
        </div>

        {actionError ? <p className={warningBox}>{actionError}</p> : null}

        <TaskForm
          key={task.id}
          categories={categories}
          existingImages={task.images}
          initial={{
            title: task.title,
            description: task.description,
            categoryId: task.category_id,
            status: task.status,
            progress: task.progress,
          }}
          submitLabel={t('detail.saveChanges')}
          submitting={submitting}
          onCancel={() => setEditing(false)}
          onSubmit={handleUpdate}
        />
      </div>
    )
  }

  const eventDetail = (event: TaskEvent) => describeEvent(event, t)
  const categoryName = task.category
    ? locale === 'th'
      ? task.category.name_th
      : task.category.name_en
    : null

  return (
    <div className="space-y-7">
      {fromCache ? <CacheNotice cachedAt={cachedAt} /> : null}
      {warning ? <p className={warningBox}>{warning}</p> : null}
      {actionError ? <p className={warningBox}>{actionError}</p> : null}

      <div>
        <Link
          className="inline-flex min-h-11 items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-dim transition hover:text-ink"
          to="/tasks"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('detail.backToTasks')}
        </Link>

        <div className="mt-1 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
          <div className="min-w-0">
            <h1 className="break-words text-[28px] font-semibold leading-[1.05] tracking-[-0.03em] sm:text-[36px]">
              {task.title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
              <StatusBadge status={task.status} />
              <span className="inline-flex items-center gap-1.5 text-[9px] uppercase tracking-[0.14em] text-muted">
                {task.category ? (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5"
                    style={{ backgroundColor: task.category.color }}
                  />
                ) : null}
                {categoryName ?? t('common.noCategory')}
              </span>
              <span className="text-[9px] uppercase tracking-[0.12em] text-dim">
                {t('detail.updatedRelative', {
                  time: formatRelative(
                    task.client_updated_at ?? task.updated_at,
                  ),
                })}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              className={btnPrimary}
              onClick={() => setEditing(true)}
              type="button"
            >
              <Pencil className="h-4 w-4" />
              {t('common.edit')}
            </button>
            <button
              className={btnDanger}
              onClick={() => setDeleteOpen(true)}
              type="button"
            >
              <Trash2 className="h-4 w-4" />
              {t('common.delete')}
            </button>
          </div>
        </div>
      </div>

      <section
        aria-label={t('detail.progress')}
        className="border-y border-rule py-5"
      >
        <div className="flex items-end justify-between gap-3">
          <p className={label}>{t('detail.progress')}</p>
          <p className="text-[40px] font-medium leading-none tracking-[-0.04em] tabular-nums">
            {task.progress}
            <span className="ml-0.5 text-[16px] text-dim">%</span>
          </p>
        </div>
        <ProgressBar
          className="mt-4"
          status={task.status}
          value={task.progress}
        />
      </section>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="space-y-7">
          <section className={section}>
            <h2 className={label}>{t('detail.details')}</h2>
            <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-muted">
              {task.description || t('detail.noDescription')}
            </p>
          </section>

          {task.images.length > 0 ? (
            <section className={section}>
              <h2 className={`${label} flex items-center gap-2`}>
                <ImageIcon className="h-3.5 w-3.5" />
                {t('detail.imagesCount', { count: task.images.length })}
              </h2>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {task.images.map((image) => (
                  <a
                    key={image.id}
                    className="group relative overflow-hidden border border-rule"
                    href={image.signedUrl ?? '#'}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {image.signedUrl ? (
                      <img
                        alt={image.file_name}
                        className="h-36 w-full object-cover transition duration-300 group-hover:opacity-85"
                        src={image.signedUrl}
                      />
                    ) : (
                      <div className="flex h-36 items-center justify-center text-[11px] text-dim">
                        {t('common.noPreview')}
                      </div>
                    )}
                  </a>
                ))}
              </div>
            </section>
          ) : null}

          <section className={section}>
            <div className="flex items-baseline justify-between gap-3">
              <h2 className={label}>{t('detail.timeline')}</h2>
              <span className="text-[10px] tabular-nums text-dim">
                {events.length}
              </span>
            </div>

            {events.length === 0 ? (
              <p className="mt-4 text-[12px] text-dim">
                {t('detail.noActivity')}
              </p>
            ) : (
              <ol className="mt-3 border-l border-rule-soft">
                {events.map((event) => {
                  const detail = eventDetail(event)
                  return (
                    <li
                      key={event.id}
                      className="relative border-b border-rule-soft py-3 pl-4 last:border-b-0"
                    >
                      <span
                        aria-hidden
                        className="absolute -left-px top-[22px] h-px w-2 bg-rule"
                      />
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[13px] font-medium">
                            {t(`event.${event.event_type}`)}
                          </p>
                          {detail ? (
                            <p className="mt-0.5 text-[11px] text-muted">
                              {detail}
                            </p>
                          ) : null}
                          <p className="mt-0.5 text-[9px] uppercase tracking-[0.1em] text-dim">
                            {formatDateTime(event.created_at)}
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
          </section>
        </div>

        <aside className="border-t border-rule pt-5 lg:border-t-0 lg:pt-0">
          <h2 className={`${label} border-b border-rule pb-2`}>
            {t('detail.info')}
          </h2>
          <dl className="text-[12px]">
            <div className={dataRow}>
              <dt className={label}>{t('detail.category')}</dt>
              <dd className="text-right">
                {categoryName ?? t('common.noCategory')}
              </dd>
            </div>
            <div className={dataRow}>
              <dt className={label}>{t('detail.status')}</dt>
              <dd className="text-right">
                <StatusBadge status={task.status} />
              </dd>
            </div>
            <div className={dataRow}>
              <dt className={label}>{t('detail.createdAt')}</dt>
              <dd className="text-right tabular-nums">
                {formatDateTime(task.created_at)}
              </dd>
            </div>
            <div className={dataRow}>
              <dt className={label}>{t('detail.updatedAt')}</dt>
              <dd className="text-right tabular-nums">
                {formatDateTime(task.client_updated_at ?? task.updated_at)}
              </dd>
            </div>
            <div className={dataRow}>
              <dt className={label}>{t('detail.imageCount')}</dt>
              <dd className="text-right">
                {t('detail.imageUnit', { count: task.images.length })}
              </dd>
            </div>
          </dl>
        </aside>
      </div>

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

      <ConfirmDialog
        busy={deleting}
        danger
        confirmLabel={t('tasks.deleteConfirm')}
        description={t('detail.deleteDescription', { title: task.title })}
        onClose={() => setDeleteOpen(false)}
        onConfirm={() => void handleDelete()}
        open={deleteOpen}
        title={t('detail.deleteTitle')}
      />
    </div>
  )
}
