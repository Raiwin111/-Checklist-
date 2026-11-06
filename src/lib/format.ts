import type { TaskEventType, TaskStatus } from '../types/database'

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('th-TH', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function formatRelative(value: string | null | undefined): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'

  const diffMs = Date.now() - date.getTime()
  const minutes = Math.round(diffMs / 60_000)

  if (minutes < 1) return 'เมื่อสักครู่'
  if (minutes < 60) return `${minutes} นาทีที่แล้ว`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ชั่วโมงที่แล้ว`

  const days = Math.round(hours / 24)
  if (days < 7) return `${days} วันที่แล้ว`

  return formatDateTime(value)
}

export const statusLabel: Record<TaskStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
  on_hold: 'On Hold',
}

export const statusLabelTh: Record<TaskStatus, string> = {
  not_started: 'ยังไม่เริ่ม',
  in_progress: 'กำลังทำ',
  completed: 'เสร็จแล้ว',
  on_hold: 'พักไว้',
}

export const statusClasses: Record<TaskStatus, string> = {
  not_started: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300',
  in_progress:
    'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300',
  completed:
    'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300',
  on_hold:
    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
}

export const eventLabel: Record<TaskEventType, string> = {
  created: 'สร้าง Task',
  updated: 'แก้ไขข้อมูล',
  status_changed: 'เปลี่ยนสถานะ',
  progress_changed: 'อัปเดตความคืบหน้า',
  image_added: 'เพิ่มรูปภาพ',
  image_removed: 'ลบรูปภาพ',
  deleted: 'ลบ Task',
  restored: 'กู้คืน Task',
}
