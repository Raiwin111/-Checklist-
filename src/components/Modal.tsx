import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { useI18n } from '../features/i18n/context'
import { iconBtn } from '../lib/ui'

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
  footer?: ReactNode
}) {
  const { t } = useI18n()

  useEffect(() => {
    if (!open) return

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        aria-label={title}
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border-t border-rule bg-plate p-5 sm:border sm:border-rule"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4 border-b border-rule pb-3">
          <h2 className="text-[11px] font-medium uppercase leading-tight tracking-[0.16em] text-ink">
            {title}
          </h2>
          <button
            aria-label={t('common.close')}
            className={iconBtn}
            onClick={onClose}
            type="button"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="pt-4">{children}</div>
        {footer ? (
          <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-rule pt-4">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  )
}
