import { tr } from './messages'

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === 'string') return error

  if (error && typeof error === 'object') {
    const record = error as { message?: unknown; code?: unknown; details?: unknown }
    const message =
      typeof record.message === 'string' ? record.message : undefined

    // 23503 = foreign_key_violation. The most likely cause here is a missing
    // profile row, which makes tasks.user_id fail tasks_user_id_fkey.
    if (
      record.code === '23503' &&
      (message ?? '').includes('tasks_user_id_fkey')
    ) {
      return tr('error.profileMissing')
    }

    if (message) return message
  }

  return tr('error.unknown')
}
