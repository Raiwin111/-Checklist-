import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { ImagePlus, Loader2, RotateCcw, Save, X } from 'lucide-react'
import type { Category, TaskStatus } from '../../types/database'
import { normalizeStatusProgress } from './statusProgress'
import { StatusBadge } from './StatusBadge'
import { ProgressBar } from './ProgressBar'
import { MAX_IMAGE_BYTES, type TaskImageWithUrl } from '../../lib/api/images'
import { getErrorMessage } from '../../lib/errors'
import { useI18n } from '../i18n/context'
import {
  btnPrimary,
  btnSecondary,
  errorBox,
  fieldLine,
  label,
  section,
} from '../../lib/ui'

const STATUS_OPTIONS: TaskStatus[] = [
  'not_started',
  'in_progress',
  'completed',
  'on_hold',
]

type NewImage = {
  id: string
  file: File
}

export type TaskFormValues = {
  title: string
  description: string
  categoryId: string
  status: TaskStatus
  progress: number
  newImages: File[]
  removedImageIds: string[]
}

type TaskFormProps = {
  initial?: {
    title: string
    description: string | null
    categoryId: string | null
    status: TaskStatus
    progress: number
  }
  categories: Category[]
  existingImages?: TaskImageWithUrl[]
  submitLabel: string
  submitting: boolean
  onSubmit: (values: TaskFormValues) => Promise<void>
  onCancel?: () => void
}

export function TaskForm({
  initial,
  categories,
  existingImages = [],
  submitLabel,
  submitting,
  onSubmit,
  onCancel,
}: TaskFormProps) {
  const { t, locale } = useI18n()
  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '')
  const [status, setStatus] = useState<TaskStatus>(
    initial?.status ?? 'not_started',
  )
  const [progress, setProgress] = useState(initial?.progress ?? 0)
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const [removedImageIds, setRemovedImageIds] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  const isCreate = !initial

  useEffect(() => {
    if (isCreate && !categoryId && categories.length > 0) {
      setCategoryId(categories[0].id)
    }
  }, [isCreate, categories, categoryId])

  const previews = useMemo(
    () =>
      newImages.map((item) => ({
        ...item,
        url: URL.createObjectURL(item.file),
      })),
    [newImages],
  )

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview.url))
    }
  }, [previews])

  function handleStatusChange(nextStatus: TaskStatus) {
    const normalized = normalizeStatusProgress(
      { status: nextStatus, progress },
      { status, progress },
    )
    setStatus(normalized.status)
    setProgress(normalized.progress)
  }

  function handleProgressChange(nextProgress: number) {
    const normalized = normalizeStatusProgress(
      { status, progress: nextProgress },
      { status, progress },
    )
    setStatus(normalized.status)
    setProgress(normalized.progress)
  }

  function handleFiles(files: FileList | null) {
    if (!files) return

    setError(null)
    const accepted: NewImage[] = []

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) {
        setError(t('form.notImage', { name: file.name }))
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(t('form.tooLarge', { name: file.name }))
        continue
      }
      accepted.push({ id: crypto.randomUUID(), file })
    }

    if (accepted.length > 0) {
      setNewImages((current) => [...current, ...accepted])
    }
  }

  function toggleRemovedImage(imageId: string) {
    setRemovedImageIds((current) =>
      current.includes(imageId)
        ? current.filter((id) => id !== imageId)
        : [...current, imageId],
    )
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)

    if (!title.trim()) {
      setError(t('form.requiredTitle'))
      return
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        categoryId,
        status,
        progress,
        newImages: newImages.map((item) => item.file),
        removedImageIds,
      })
    } catch (submitError) {
      setError(getErrorMessage(submitError))
    }
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      {error ? <p className={errorBox}>{error}</p> : null}

      <fieldset className="space-y-5">
        <legend className={`${label} mb-4`}>{t('form.sectionDetails')}</legend>

        <div>
          <label className={label} htmlFor="task-title">
            {t('form.title')}
          </label>
          <input
            id="task-title"
            className={fieldLine}
            placeholder={t('form.titlePlaceholder')}
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </div>

        <div>
          <label className={label} htmlFor="task-description">
            {t('form.description')}
          </label>
          <textarea
            id="task-description"
            className={`${fieldLine} min-h-28 resize-y`}
            placeholder={t('form.descriptionPlaceholder')}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={`${label} mb-4`}>{t('form.sectionState')}</legend>

        <div className="space-y-5">
          <div>
            <label className={label} htmlFor="task-category">
              {t('form.category')}
            </label>
            <select
              id="task-category"
              className={fieldLine}
              value={categoryId}
              onChange={(event) => setCategoryId(event.target.value)}
            >
              <option value="">{t('common.noCategory')}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {locale === 'th' ? category.name_th : category.name_en}
                </option>
              ))}
            </select>
          </div>

          <div>
            <p className={label} id="task-status-label">
              {t('form.status')}
            </p>
            <div
              aria-labelledby="task-status-label"
              className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4"
              role="group"
            >
              {STATUS_OPTIONS.map((option) => {
                const selected = status === option
                return (
                  <button
                    key={option}
                    aria-pressed={selected}
                    className={[
                      'flex min-h-11 items-center border px-3 py-2 text-left transition',
                      selected
                        ? 'border-signal bg-signal/10'
                        : 'border-rule hover:border-muted',
                    ].join(' ')}
                    onClick={() => handleStatusChange(option)}
                    type="button"
                  >
                    <StatusBadge status={option} />
                  </button>
                )
              })}
            </div>
          </div>

          <div>
            <div className="flex items-end justify-between gap-3">
              <label className={label} htmlFor="task-progress">
                {t('form.progress')}
              </label>
              <span className="text-[28px] font-medium leading-none tracking-[-0.03em] tabular-nums">
                {progress}
                <span className="ml-0.5 text-[14px] text-dim">%</span>
              </span>
            </div>
            <ProgressBar className="mt-3" status={status} value={progress} />
            <input
              id="task-progress"
              className="mt-2 w-full"
              max={100}
              min={0}
              step={1}
              type="range"
              value={progress}
              onChange={(event) =>
                handleProgressChange(Number(event.target.value))
              }
            />
            <p className="text-[11px] text-dim">{t('form.autoSyncHint')}</p>
          </div>
        </div>
      </fieldset>

      <fieldset className={section}>
        <legend className={`${label} mb-4`}>{t('form.sectionImages')}</legend>

        {existingImages.length > 0 ? (
          <div className="mb-5 space-y-2">
            <p className={label}>{t('form.existingImages')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {existingImages.map((image) => {
                const removed = removedImageIds.includes(image.id)
                return (
                  <div
                    key={image.id}
                    className={[
                      'relative overflow-hidden border border-rule',
                      removed ? 'opacity-40' : '',
                    ].join(' ')}
                  >
                    {image.signedUrl ? (
                      <img
                        alt={image.file_name}
                        className="h-28 w-full object-cover"
                        src={image.signedUrl}
                      />
                    ) : (
                      <div className="flex h-28 items-center justify-center text-[11px] text-dim">
                        {t('common.noPreview')}
                      </div>
                    )}
                    <button
                      aria-label={
                        removed ? t('form.undoRemove') : t('form.removeImage')
                      }
                      className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center bg-ground/85 text-ink transition hover:bg-ground"
                      onClick={() => toggleRemovedImage(image.id)}
                      type="button"
                    >
                      {removed ? (
                        <RotateCcw className="h-4 w-4" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </button>
                    {removed ? (
                      <span className="absolute inset-x-0 bottom-0 bg-danger/90 py-1 text-center text-[9px] uppercase tracking-[0.12em] text-ground">
                        {t('form.willBeDeleted')}
                      </span>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}

        {previews.length > 0 ? (
          <div className="mb-5 space-y-2">
            <p className={label}>{t('form.newImages')}</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {previews.map((preview) => (
                <div
                  key={preview.id}
                  className="relative overflow-hidden border border-rule"
                >
                  <img
                    alt={preview.file.name}
                    className="h-28 w-full object-cover"
                    src={preview.url}
                  />
                  <button
                    aria-label={t('form.removeNew')}
                    className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center bg-ground/85 text-ink transition hover:bg-ground"
                    onClick={() =>
                      setNewImages((current) =>
                        current.filter((item) => item.id !== preview.id),
                      )
                    }
                    type="button"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <label
          className="flex min-h-11 cursor-pointer flex-col items-center justify-center gap-2 border border-dashed border-rule px-4 py-7 text-center transition hover:border-signal hover:text-signal"
          htmlFor="task-images"
        >
          <ImagePlus className="h-5 w-5" />
          <span className={label}>{t('form.addImages')}</span>
          <span className="text-[11px] text-muted">{t('form.addImagesHint')}</span>
        </label>
        <input
          id="task-images"
          className="sr-only"
          multiple
          accept="image/*"
          type="file"
          onChange={(event) => {
            handleFiles(event.target.files)
            event.target.value = ''
          }}
        />
      </fieldset>

      <div className="flex flex-wrap items-center gap-2 border-t border-rule pt-5">
        <button className={btnPrimary} disabled={submitting} type="submit">
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitting ? t('form.saving') : submitLabel}
        </button>

        {onCancel ? (
          <button className={btnSecondary} onClick={onCancel} type="button">
            {t('common.cancel')}
          </button>
        ) : null}
      </div>
    </form>
  )
}
