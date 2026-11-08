import type { ReactNode } from 'react'
import { Modal } from './Modal'
import { useI18n } from '../features/i18n/context'
import { btnDanger, btnPrimary, btnSecondary } from '../lib/ui'

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  danger = false,
  busy = false,
  children,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  danger?: boolean
  busy?: boolean
  children?: ReactNode
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useI18n()

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <button className={btnSecondary} onClick={onClose} type="button">
            {cancelLabel ?? t('common.cancel')}
          </button>
          <button
            className={danger ? btnDanger : btnPrimary}
            disabled={busy}
            onClick={onConfirm}
            type="button"
          >
            {busy ? t('common.working') : (confirmLabel ?? t('common.confirm'))}
          </button>
        </>
      }
    >
      <p className="text-[13px] leading-relaxed text-muted">{description}</p>
      {children}
    </Modal>
  )
}
