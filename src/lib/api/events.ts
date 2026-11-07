import { supabase } from '../supabase'
import type { TaskEventType } from '../../types/database'
import { assertOnline } from '../offline/network'

type LogTaskEventInput = {
  taskId: string
  userId: string
  eventType: TaskEventType
  payload?: Record<string, unknown>
}

export async function logTaskEvent({
  taskId,
  userId,
  eventType,
  payload = {},
}: LogTaskEventInput): Promise<void> {
  const { error } = await supabase.from('task_events').insert({
    task_id: taskId,
    user_id: userId,
    event_type: eventType,
    payload,
    client_created_at: new Date().toISOString(),
  })

  if (error) {
    // Timeline logging is best-effort: never block the task mutation itself.
    console.error('Failed to log task event', error)
  }
}

export async function deleteTaskEvent(eventId: string): Promise<void> {
  assertOnline()

  const { error } = await supabase
    .from('task_events')
    .delete()
    .eq('id', eventId)

  if (error) throw error
}
