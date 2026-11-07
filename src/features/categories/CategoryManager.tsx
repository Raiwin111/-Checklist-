import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Briefcase,
  FolderKanban,
  Loader2,
  Microscope,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react'
import type { Category } from '../../types/database'
import {
  countTasksInCategory,
  createCategory,
  deleteCategory,
  reassignTasks,
  updateCategory,
} from '../../lib/api/categories'
import { getErrorMessage } from '../../lib/errors'
import { Modal } from '../../components/Modal'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { useCategories } from '../tasks/useCategories'
import { useI18n } from '../i18n/context'
import type { TranslationKey } from '../i18n/dictionary'

const ICON_OPTIONS: Array<{
  value: string
  labelKey: TranslationKey
  Icon: typeof FolderKanban
}> = [
  { value: 'folder', labelKey: 'icon.folder', Icon: FolderKanban },
  { value: 'book-open', labelKey: 'icon.book', Icon: BookOpen },
  { value: 'microscope', labelKey: 'icon.research', Icon: Microscope },
  { value: 'briefcase', labelKey: 'icon.work', Icon: Briefcase },
  { value: 'palette', labelKey: 'icon.creative', Icon: Palette },
]

const COLOR_OPTIONS = [
  '#3b82f6',
  '#10b981',
  '#8b5cf6',
  '#f59e0b',
  '#ef4444',
  '#06b6d4',
  '#ec4899',
  '#64748b',
]

const inputClass =
  'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-slate-700 dark:bg-slate-950'

type CategoryFormValues = {
  nameTh: string
  nameEn: string
  color: string
  icon: string
}

function categoryIcon(icon: string) {
  return ICON_OPTIONS.find((option) => option.value === icon)?.Icon ?? FolderKanban
}

function CategoryFormModal({
  open,
  initial,
  submitting,
  error,
  onClose,
  onSubmit,
}: {
  open: boolean
  initial: Category | null
  submitting: boolean
  error: string | null
  onClose: () => void
  onSubmit: (values: CategoryFormValues) => void
}) {
  const { t } = useI18n()
  const [nameTh, setNameTh] = useState('')
  const [nameEn, setNameEn] = useState('')
  const [color, setColor] = useState(COLOR_OPTIONS[0])
  const [icon, setIcon] = useState('folder')

  useEffect(() => {
    if (!open) return
    setNameTh(initial?.name_th ?? '')
    setNameEn(initial?.name_en ?? '')
    setColor(initial?.color ?? COLOR_OPTIONS[0])
    setIcon(initial?.icon ?? 'folder')
  }, [open, initial])

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        initial ? t('categories.editTitle') : t('categories.createTitle')
      }
      footer={
        <>
          <button
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            onClick={onClose}
            type="button"
          >
            {t('common.cancel')}
          </button>
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
            form="category-form"
            type="submit"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            {initial ? t('categories.save') : t('categories.addSubmit')}
          </button>
        </>
      }
    >
      <form
        id="category-form"
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit({
            nameTh: nameTh.trim(),
            nameEn: nameEn.trim(),
            color,
            icon,
          })
        }}
      >
        {error ? (
          <div className="rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="category-name-th">
            {t('categories.nameTh')}
          </label>
          <input
            id="category-name-th"
            className={inputClass}
            placeholder={t('categories.nameThPlaceholder')}
            required
            value={nameTh}
            onChange={(event) => setNameTh(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-sm font-medium" htmlFor="category-name-en">
            {t('categories.nameEn')}
          </label>
          <input
            id="category-name-en"
            className={inputClass}
            placeholder={t('categories.nameEnPlaceholder')}
            value={nameEn}
            onChange={(event) => setNameEn(event.target.value)}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t('categories.color')}</span>
          <div className="flex flex-wrap items-center gap-2">
            {COLOR_OPTIONS.map((option) => (
              <button
                key={option}
                aria-label={`${t('categories.color')} ${option}`}
                className={[
                  'h-8 w-8 rounded-full border-2 transition',
                  color === option
                    ? 'border-slate-900 dark:border-white'
                    : 'border-transparent',
                ].join(' ')}
                onClick={() => setColor(option)}
                style={{ backgroundColor: option }}
                type="button"
              />
            ))}
            <input
              aria-label={t('categories.color')}
              className="h-8 w-10 cursor-pointer rounded-lg border border-slate-300 bg-transparent dark:border-slate-700"
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <span className="text-sm font-medium">{t('categories.icon')}</span>
          <div className="flex flex-wrap gap-2">
            {ICON_OPTIONS.map((option) => (
              <button
                key={option.value}
                className={[
                  'inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition',
                  icon === option.value
                    ? 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-500/40 dark:bg-indigo-500/10 dark:text-indigo-300'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800',
                ].join(' ')}
                onClick={() => setIcon(option.value)}
                type="button"
              >
                <option.Icon className="h-4 w-4" />
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>
      </form>
    </Modal>
  )
}

export function CategoryManager({ userId }: { userId: string }) {
  const { t, locale } = useI18n()
  const { categories, loading, error, refresh } = useCategories(userId)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [countsLoading, setCountsLoading] = useState(false)

  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Category | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
  const [reassignTo, setReassignTo] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    if (categories.length === 0) {
      setCounts({})
      return
    }

    let active = true
    setCountsLoading(true)

    Promise.all(
      categories.map(async (category) => {
        const count = await countTasksInCategory(category.id)
        return [category.id, count] as const
      }),
    )
      .then((entries) => {
        if (!active) return
        setCounts(Object.fromEntries(entries))
        setCountsLoading(false)
      })
      .catch((countError: unknown) => {
        if (!active) return
        console.error('Failed to count category tasks', countError)
        setCountsLoading(false)
      })

    return () => {
      active = false
    }
  }, [categories])

  const deleteOptions = useMemo(
    () => categories.filter((category) => category.id !== deleteTarget?.id),
    [categories, deleteTarget],
  )

  function openCreate() {
    setEditing(null)
    setFormError(null)
    setFormOpen(true)
  }

  function openEdit(category: Category) {
    setEditing(category)
    setFormError(null)
    setFormOpen(true)
  }

  async function handleSubmit(values: CategoryFormValues) {
    if (!values.nameTh) {
      setFormError(t('categories.nameRequired'))
      return
    }

    setSubmitting(true)
    setFormError(null)

    try {
      if (editing) {
        await updateCategory(editing.id, values)
      } else {
        await createCategory(userId, values)
      }
      setFormOpen(false)
      setEditing(null)
      refresh()
    } catch (submitError) {
      setFormError(getErrorMessage(submitError))
    } finally {
      setSubmitting(false)
    }
  }

  function openDelete(category: Category) {
    setDeleteTarget(category)
    setReassignTo('')
    setActionError(null)
  }

  async function handleDelete() {
    if (!deleteTarget) return

    setDeleting(true)
    setActionError(null)

    try {
      if (reassignTo) {
        await reassignTasks(deleteTarget.id, reassignTo)
      }
      await deleteCategory(deleteTarget.id)
      setDeleteTarget(null)
      refresh()
    } catch (deleteError) {
      setActionError(getErrorMessage(deleteError))
    } finally {
      setDeleting(false)
    }
  }

  const deleteCount = deleteTarget ? (counts[deleteTarget.id] ?? 0) : 0
  const deleteName = deleteTarget
    ? locale === 'th'
      ? deleteTarget.name_th
      : deleteTarget.name_en
    : ''

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FolderKanban className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            {t('categories.title')}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t('categories.subtitle')}
          </p>
        </div>
        <button
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-indigo-500"
          onClick={openCreate}
          type="button"
        >
          <Plus className="h-3.5 w-3.5" />
          {t('categories.add')}
        </button>
      </div>

      {error ? (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {error}
        </div>
      ) : null}

      {actionError && !deleteTarget ? (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-700 dark:bg-red-950/50 dark:text-red-300">
          {actionError}
        </div>
      ) : null}

      {loading ? (
        <div className="mt-4 flex items-center gap-2 text-sm text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t('categories.loading')}
        </div>
      ) : categories.length === 0 ? (
        <p className="mt-4 text-sm text-slate-400">{t('categories.empty')}</p>
      ) : (
        <ul className="mt-4 space-y-2">
          {categories.map((category) => {
            const Icon = categoryIcon(category.icon)
            const name =
              locale === 'th' ? category.name_th : category.name_en
            return (
              <li
                key={category.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 px-3 py-2.5 dark:border-slate-800"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: category.color }}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {name}
                      {category.is_system ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {t('categories.system')}
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-xs text-slate-400">
                      {countsLoading
                        ? t('categories.counting')
                        : t('categories.taskCount', {
                            count: counts[category.id] ?? 0,
                          })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-indigo-600 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-indigo-400"
                    onClick={() => openEdit(category)}
                    type="button"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    {t('common.edit')}
                  </button>
                  <button
                    className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                    disabled={category.is_system}
                    onClick={() => openDelete(category)}
                    title={
                      category.is_system
                        ? t('categories.system')
                        : undefined
                    }
                    type="button"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('common.delete')}
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <CategoryFormModal
        error={formError}
        initial={editing}
        open={formOpen}
        submitting={submitting}
        onClose={() => {
          setFormOpen(false)
          setEditing(null)
        }}
        onSubmit={(values) => void handleSubmit(values)}
      />

      <ConfirmDialog
        busy={deleting}
        danger
        confirmLabel={t('categories.delete')}
        description={
          deleteTarget
            ? deleteCount > 0
              ? t('categories.deleteDescriptionWithTasks', {
                  name: deleteName,
                  count: deleteCount,
                })
              : t('categories.deleteDescription', { name: deleteName })
            : ''
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => void handleDelete()}
        open={deleteTarget !== null}
        title={t('categories.deleteTitle')}
      >
        {deleteCount > 0 ? (
          <div className="mt-3 space-y-1.5">
            <label className="text-sm font-medium" htmlFor="reassign-category">
              {t('categories.reassign')}
            </label>
            <select
              id="reassign-category"
              className={inputClass}
              value={reassignTo}
              onChange={(event) => setReassignTo(event.target.value)}
            >
              <option value="">{t('common.noCategory')}</option>
              {deleteOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {locale === 'th' ? category.name_th : category.name_en}
                </option>
              ))}
            </select>
            {actionError ? (
              <p className="text-xs text-red-600 dark:text-red-400">
                {actionError}
              </p>
            ) : null}
          </div>
        ) : null}
      </ConfirmDialog>
    </div>
  )
}
