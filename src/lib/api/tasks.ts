import { supabase } from '../supabase'
import { logTaskEvent } from './events'
import { attachSignedUrls, type TaskImageWithUrl } from './images'
import { normalizeStatusProgress } from '../../features/tasks/statusProgress'
import { assertOnline } from '../offline/network'
import type {
  Category,
  Task,
  TaskEvent,
  TaskStatus,
} from '../../types/database'

export type TaskCategory = Pick<
  Category,
  'id' | 'name_th' | 'name_en' | 'color' | 'icon'
>

export type TaskWithRelations = Task & {
  category: TaskCategory | null
  images: TaskImageWithUrl[]
}

export type TaskUpdateInput = {
  title?: string
  description?: string | null
  categoryId?: string | null
  status?: TaskStatus
  progress?: number
}

export type DashboardStats = {
  total: number
  completed: number
  inProgress: number
  notStarted: number
  onHold: number
  averageProgress: number
}

export type TimelineEvent = TaskEvent & {
  taskTitle: string | null
}

export type DashboardData = {
  stats: DashboardStats
  events: TimelineEvent[]
  categories: Category[]
}

const TASK_SELECT = `
  *,
  category:categories(id,name_th,name_en,color,icon),
  images:task_images(id,storage_path,file_name,mime_type,size_bytes,width,height,created_at,deleted_at)
`

async function hydrateTaskImages(
  task: Task & { images?: unknown; category?: unknown },
): Promise<TaskWithRelations> {
  const images = Array.isArray(task.images) ? (task.images as TaskWithRelations['images']) : []
  const visibleImages = images.filter((image) => !image.deleted_at)
  const hydratedImages = await attachSignedUrls(visibleImages)

  return {
    ...(task as Task),
    category: (task.category as TaskCategory | null) ?? null,
    images: hydratedImages,
  }
}

export async function fetchTasks(userId: string): Promise<TaskWithRelations[]> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('server_updated_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as Array<
    Task & { images?: unknown; category?: unknown }
  >

  return Promise.all(rows.map(hydrateTaskImages))
}

export async function fetchTask(
  taskId: string,
): Promise<TaskWithRelations | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(TASK_SELECT)
    .eq('id', taskId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return hydrateTaskImages(
    data as Task & { images?: unknown; category?: unknown },
  )
}

export async function fetchTaskEvents(taskId: string): Promise<TaskEvent[]> {
  const { data, error } = await supabase
    .from('task_events')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []) as TaskEvent[]
}

export async function createTask(
  userId: string,
  input: {
    title: string
    description: string
    categoryId: string | null
    status: TaskStatus
    progress: number
  },
): Promise<Task> {
  assertOnline()

  const normalized = normalizeStatusProgress({
    status: input.status,
    progress: input.progress,
  })

  const { data, error } = await supabase
    .from('tasks')
    .insert({
      user_id: userId,
      title: input.title.trim(),
      description: input.description.trim() || null,
      category_id: input.categoryId,
      status: normalized.status,
      progress: normalized.progress,
      client_updated_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error) throw error

  const task = data as Task
  await logTaskEvent({
    taskId: task.id,
    userId,
    eventType: 'created',
    payload: {
      title: task.title,
      status: task.status,
      progress: task.progress,
    },
  })

  return task
}

export async function updateTask(
  taskId: string,
  userId: string,
  input: TaskUpdateInput,
  previous: Task,
): Promise<Task> {
  assertOnline()

  const patch: Record<string, unknown> = {
    client_updated_at: new Date().toISOString(),
  }

  if (input.title !== undefined) patch.title = input.title.trim()
  if (input.description !== undefined) {
    patch.description =
      input.description === null ? null : input.description.trim() || null
  }
  if (input.categoryId !== undefined) patch.category_id = input.categoryId
  if (input.status !== undefined) patch.status = input.status
  if (input.progress !== undefined) patch.progress = input.progress

  const { data, error } = await supabase
    .from('tasks')
    .update(patch)
    .eq('id', taskId)
    .select('*')
    .single()

  if (error) throw error

  const updated = data as Task
  const statusChanged = previous.status !== updated.status
  const progressChanged = previous.progress !== updated.progress

  if (statusChanged) {
    await logTaskEvent({
      taskId,
      userId,
      eventType: 'status_changed',
      payload: {
        from: previous.status,
        to: updated.status,
        progressFrom: previous.progress,
        progressTo: updated.progress,
      },
    })
  } else if (progressChanged) {
    await logTaskEvent({
      taskId,
      userId,
      eventType: 'progress_changed',
      payload: { from: previous.progress, to: updated.progress },
    })
  }

  const changedFields: string[] = []
  if (previous.title !== updated.title) changedFields.push('title')
  if ((previous.description ?? '') !== (updated.description ?? '')) {
    changedFields.push('description')
  }
  if (previous.category_id !== updated.category_id) {
    changedFields.push('category')
  }

  if (changedFields.length > 0) {
    await logTaskEvent({
      taskId,
      userId,
      eventType: 'updated',
      payload: { fields: changedFields },
    })
  }

  return updated
}

export async function softDeleteTask(
  taskId: string,
  userId: string,
): Promise<Task> {
  assertOnline()

  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from('tasks')
    .update({ deleted_at: now, client_updated_at: now })
    .eq('id', taskId)
    .select('*')
    .single()

  if (error) throw error

  const task = data as Task
  await logTaskEvent({
    taskId,
    userId,
    eventType: 'deleted',
    payload: { title: task.title },
  })

  return task
}

export async function fetchDashboardData(
  userId: string,
): Promise<DashboardData> {
  const [tasksResult, eventsResult, categoriesResult] = await Promise.all([
    supabase
      .from('tasks')
      .select('id,title,status,progress,category_id,updated_at,client_updated_at')
      .eq('user_id', userId)
      .is('deleted_at', null),
    supabase
      .from('task_events')
      .select('*, task:tasks(title)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(12),
    supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('sort_order', { ascending: true }),
  ])

  if (tasksResult.error) throw tasksResult.error
  if (eventsResult.error) throw eventsResult.error
  if (categoriesResult.error) throw categoriesResult.error

  const tasks = (tasksResult.data ?? []) as Array<
    Pick<
      Task,
      'id' | 'title' | 'status' | 'progress' | 'category_id' | 'updated_at' | 'client_updated_at'
    >
  >

  const total = tasks.length
  const completed = tasks.filter((task) => task.status === 'completed').length
  const inProgress = tasks.filter((task) => task.status === 'in_progress').length
  const notStarted = tasks.filter((task) => task.status === 'not_started').length
  const onHold = tasks.filter((task) => task.status === 'on_hold').length
  const averageProgress =
    total === 0
      ? 0
      : Math.round(
          tasks.reduce((sum, task) => sum + task.progress, 0) / total,
        )

  const events = ((eventsResult.data ?? []) as Array<
    TaskEvent & { task?: { title?: string } | Array<{ title?: string }> | null }
  >).map((event) => {
    const related = Array.isArray(event.task) ? event.task[0] : event.task
    return {
      ...event,
      taskTitle: related?.title ?? null,
    }
  })

  return {
    stats: { total, completed, inProgress, notStarted, onHold, averageProgress },
    events,
    categories: (categoriesResult.data ?? []) as Category[],
  }
}
