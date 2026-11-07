import { supabase } from '../supabase'
import { fetchCategories } from './categories'
import { fetchTasks } from './tasks'
import type { TaskEvent } from '../../types/database'

/**
 * Download everything the user owns as a single JSON file.
 * Image binaries stay in Storage (private); this exports their metadata so the
 * export remains small and portable.
 */
export async function exportUserData(userId: string): Promise<void> {
  const [tasks, categories, eventsResult, profileResult] = await Promise.all([
    fetchTasks(userId),
    fetchCategories(userId),
    supabase
      .from('task_events')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true }),
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
  ])

  if (eventsResult.error) throw eventsResult.error
  if (profileResult.error) throw profileResult.error

  const payload = {
    app: 'personal-task-research-system',
    version: 1,
    exportedAt: new Date().toISOString(),
    profile: profileResult.data ?? null,
    categories,
    tasks: tasks.map((task) => ({
      id: task.id,
      user_id: task.user_id,
      title: task.title,
      description: task.description,
      category_id: task.category_id,
      category: task.category,
      status: task.status,
      progress: task.progress,
      created_at: task.created_at,
      updated_at: task.updated_at,
      server_updated_at: task.server_updated_at,
      client_updated_at: task.client_updated_at,
      revision: task.revision,
      deleted_at: task.deleted_at,
      images: task.images.map((image) => ({
        id: image.id,
        task_id: image.task_id,
        user_id: image.user_id,
        storage_path: image.storage_path,
        file_name: image.file_name,
        mime_type: image.mime_type,
        size_bytes: image.size_bytes,
        width: image.width,
        height: image.height,
        created_at: image.created_at,
        deleted_at: image.deleted_at,
      })),
    })),
    events: (eventsResult.data ?? []) as TaskEvent[],
  }

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `personal-tasks-${new Date().toISOString().slice(0, 10)}.json`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
