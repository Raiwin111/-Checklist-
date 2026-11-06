import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from 'react'
import { ImagePlus, Loader2, RotateCcw, Save, X } from 'lucide-react'
import type { Category, TaskStatus } from '../../types/database'
import { normalizeStatusProgress } from './statusProgress'
import {
  MAX_IMAGE_BYTES,
  type TaskImageWithUrl,
} from '../../lib/api/images'
import { getErrorMessage } from '../../lib/errors'

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950'

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
        setError(`ไฟล์ "${file.name}" ไม่ใช่รูปภาพ`)
        continue
      }
      if (file.size > MAX_IMAGE_BYTES) {
        setError(`ไฟล์ "${file.name}" ใหญ่เกิน 20MB`)
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
      setError('กรุณากรอกชื่องาน')
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
    <form className="space-y-5" onSubmit={handleSubmit}>
      {error ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="task-title">
          ชื่องาน
        </label>
        <input
          id="task-title"
          className={inputClass}
          placeholder="เช่น สรุปบทความวิจัย"
          required
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="task-description">
          รายละเอียด
        </label>
        <textarea
          id="task-description"
          className={`${inputClass} min-h-28 resize-y`}
          placeholder="รายละเอียดเพิ่มเติม"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="task-category">
            ประเภท
          </label>
          <select
            id="task-category"
            className={inputClass}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
          >
            <option value="">ไม่มีประเภท</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name_th} ({category.name_en})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="task-status">
            สถานะ
          </label>
          <select
            id="task-status"
            className={inputClass}
            value={status}
            onChange={(event) =>
              handleStatusChange(event.target.value as TaskStatus)
            }
          >
            <option value="not_started">Not Started</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium" htmlFor="task-progress">
            ความคืบหน้า
          </label>
          <span className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">
            {progress}%
          </span>
        </div>
        <input
          id="task-progress"
          className="w-full accent-indigo-600"
          max={100}
          min={0}
          step={1}
          type="range"
          value={progress}
          onChange={(event) => handleProgressChange(Number(event.target.value))}
        />
        <p className="text-xs text-slate-400">
          สถานะและเปอร์เซ็นต์จะปรับให้สอดคล้องกันอัตโนมัติ
        </p>
      </div>

      {existingImages.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">รูปภาพที่แนบอยู่</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {existingImages.map((image) => {
              const removed = removedImageIds.includes(image.id)
              return (
                <div
                  key={image.id}
                  className={[
                    'relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700',
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
                    <div className="flex h-28 items-center justify-center text-xs text-slate-400">
                      ไม่มีตัวอย่าง
                    </div>
                  )}
                  <button
                    aria-label={removed ? 'ยกเลิกการลบ' : 'ลบรูป'}
                    className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/70 p-1 text-white transition hover:bg-slate-950"
                    onClick={() => toggleRemovedImage(image.id)}
                    type="button"
                  >
                    {removed ? (
                      <RotateCcw className="h-3.5 w-3.5" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {removed ? (
                    <span className="absolute inset-x-0 bottom-0 bg-red-600/85 py-1 text-center text-[11px] font-medium text-white">
                      จะถูกลบเมื่อบันทึก
                    </span>
                  ) : null}
                </div>
              )
            })}
          </div>
        </div>
      ) : null}

      {previews.length > 0 ? (
        <div className="space-y-2">
          <p className="text-sm font-medium">รูปใหม่ที่รออัปโหลด</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {previews.map((preview) => (
              <div
                key={preview.id}
                className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <img
                  alt={preview.file.name}
                  className="h-28 w-full object-cover"
                  src={preview.url}
                />
                <button
                  aria-label="เอารูปออก"
                  className="absolute right-1.5 top-1.5 rounded-full bg-slate-950/70 p-1 text-white transition hover:bg-slate-950"
                  onClick={() =>
                    setNewImages((current) =>
                      current.filter((item) => item.id !== preview.id),
                    )
                  }
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium" htmlFor="task-images">
          เพิ่มรูปภาพ
        </label>
        <label
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-7 text-center text-sm text-slate-500 transition hover:border-indigo-400 hover:text-indigo-600 dark:border-slate-700 dark:text-slate-400"
          htmlFor="task-images"
        >
          <ImagePlus className="h-5 w-5" />
          เลือกรูป (สูงสุด 20MB ต่อรูป, บีบอัดอัตโนมัติ)
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
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={submitting}
          type="submit"
        >
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          {submitting ? 'กำลังบันทึก…' : submitLabel}
        </button>

        {onCancel ? (
          <button
            className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onCancel}
            type="button"
          >
            ยกเลิก
          </button>
        ) : null}
      </div>
    </form>
  )
}
