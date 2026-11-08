import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { api, insertMock } = vi.hoisted(() => ({
  api: {
    createTask: vi.fn(),
    updateTask: vi.fn(),
    softDeleteTask: vi.fn(),
    fetchTask: vi.fn(),
  },
  insertMock: vi.fn(),
}))

vi.mock('../src/lib/api/tasks', () => api)
vi.mock('../src/lib/supabase', () => ({
  supabase: {
    from: () => ({ insert: insertMock }),
  },
}))

import {
  deleteUserCache,
  getOfflineDatabase,
  type SyncQueueItem,
} from '../src/lib/offline/cache'
import { SyncManager } from '../src/lib/offline/sync'
import type { Task } from '../src/types/database'

const userIds: string[] = []

function newUser(): string {
  const id = crypto.randomUUID()
  userIds.push(id)
  return id
}

function task(overrides: Partial<Task> = {}): Task {
  return {
    id: crypto.randomUUID(),
    user_id: 'user',
    title: 'Local title',
    description: null,
    category_id: null,
    status: 'in_progress',
    progress: 40,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    server_updated_at: '2026-01-01T00:00:00.000Z',
    client_updated_at: '2026-01-01T00:00:00.000Z',
    revision: 1,
    deleted_at: null,
    last_device_id: null,
    ...overrides,
  }
}

async function seedQueue(
  userId: string,
  local: Task,
  item: Partial<SyncQueueItem> & Pick<SyncQueueItem, 'operation'>,
): Promise<SyncQueueItem> {
  const db = getOfflineDatabase(userId)
  const queueItem: SyncQueueItem = {
    id: crypto.randomUUID(),
    userId,
    taskId: local.id,
    payload: { title: 'Offline title' },
    createdAt: new Date().toISOString(),
    attempts: 0,
    baseRevision: local.revision,
    ...item,
  }
  await db.localTasks.put(local)
  await db.syncQueue.put(queueItem)
  return queueItem
}

beforeEach(() => {
  api.createTask.mockReset()
  api.updateTask.mockReset()
  api.softDeleteTask.mockReset()
  api.fetchTask.mockReset()
  insertMock.mockReset()
  insertMock.mockResolvedValue({ error: null })
})

afterEach(async () => {
  while (userIds.length > 0) {
    await deleteUserCache(userIds.pop()!)
  }
})

describe('SyncManager.startSync', () => {
  it('reports idle when the queue is empty', async () => {
    const userId = newUser()
    const result = await new SyncManager().startSync(userId)
    expect(result).toEqual({ status: 'idle' })
  })

  it('applies an update when the base revision still matches', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID(), revision: 1 })
    await seedQueue(userId, local, { operation: 'update' })

    const server = task({ ...local, revision: 1 })
    const updated = task({ ...local, title: 'Synced title', revision: 2 })
    api.fetchTask.mockResolvedValue(server)
    api.updateTask.mockResolvedValue(updated)

    const result = await new SyncManager().startSync(userId)

    expect(result.status).toBe('completed')
    expect(api.updateTask).toHaveBeenCalledWith(
      local.id,
      userId,
      expect.objectContaining({ title: 'Offline title' }),
      expect.objectContaining({ revision: 1 }),
    )
    expect(await getOfflineDatabase(userId).syncQueue.count()).toBe(0)
    const stored = await getOfflineDatabase(userId).localTasks.get(local.id)
    expect(stored?.title).toBe('Synced title')
  })

  it('records a conflict and keeps the server copy when another device won', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID(), revision: 1 })
    await seedQueue(userId, local, { operation: 'update', baseRevision: 1 })

    const server = task({ ...local, title: 'Server wins', revision: 2 })
    api.fetchTask.mockResolvedValue(server)

    const result = await new SyncManager().startSync(userId)

    expect(result.status).toBe('completed')
    expect(api.updateTask).not.toHaveBeenCalled()
    expect(insertMock).toHaveBeenCalledTimes(1)
    expect(insertMock.mock.calls[0][0]).toMatchObject({
      user_id: userId,
      task_id: local.id,
      losing_payload: expect.objectContaining({ title: 'Local title' }),
    })
    expect(await getOfflineDatabase(userId).syncQueue.count()).toBe(0)
    const stored = await getOfflineDatabase(userId).localTasks.get(local.id)
    expect(stored?.title).toBe('Server wins')
    if (result.status === 'completed') {
      expect(result.results[0].status).toBe('conflict')
    }
  })

  it('swaps the local placeholder id after creating on the server', async () => {
    const userId = newUser()
    const local = task({
      id: `local-${crypto.randomUUID()}`,
      title: 'Brand new',
    })
    await seedQueue(userId, local, {
      operation: 'create',
      payload: { title: 'Brand new', status: 'in_progress', progress: 40 },
      baseRevision: 0,
    })

    const created = task({ id: crypto.randomUUID(), title: 'Brand new' })
    api.createTask.mockResolvedValue(created)

    const result = await new SyncManager().startSync(userId)

    expect(result.status).toBe('completed')
    const db = getOfflineDatabase(userId)
    expect(await db.localTasks.get(local.id)).toBeUndefined()
    expect((await db.localTasks.get(created.id))?.title).toBe('Brand new')
    expect(await db.syncQueue.count()).toBe(0)
  })

  it('soft-deletes when the delete is based on the current revision', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID(), revision: 1 })
    await seedQueue(userId, local, { operation: 'delete' })

    api.fetchTask.mockResolvedValue(task({ ...local, revision: 1 }))
    const deleted = task({
      ...local,
      revision: 2,
      deleted_at: '2026-01-02T00:00:00.000Z',
    })
    api.softDeleteTask.mockResolvedValue(deleted)

    const result = await new SyncManager().startSync(userId)

    expect(result.status).toBe('completed')
    expect(api.softDeleteTask).toHaveBeenCalledWith(local.id, userId)
    expect(await getOfflineDatabase(userId).syncQueue.count()).toBe(0)
  })

  it('turns a delete into a conflict when the server moved on', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID(), revision: 1 })
    await seedQueue(userId, local, { operation: 'delete', baseRevision: 1 })

    api.fetchTask.mockResolvedValue(
      task({ ...local, title: 'Edited elsewhere', revision: 3 }),
    )

    const result = await new SyncManager().startSync(userId)

    expect(result.status).toBe('completed')
    expect(api.softDeleteTask).not.toHaveBeenCalled()
    expect(insertMock).toHaveBeenCalledTimes(1)
    const stored = await getOfflineDatabase(userId).localTasks.get(local.id)
    expect(stored?.title).toBe('Edited elsewhere')
  })

  it('skips an update whose task was deleted on the server', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID() })
    await seedQueue(userId, local, { operation: 'update' })
    api.fetchTask.mockResolvedValue(null)

    const result = await new SyncManager().startSync(userId)

    expect(result.status).toBe('completed')
    expect(api.updateTask).not.toHaveBeenCalled()
    expect(await getOfflineDatabase(userId).syncQueue.count()).toBe(0)
    if (result.status === 'completed') {
      expect(result.results[0]).toEqual({
        status: 'skipped',
        reason: 'task-deleted-on-server',
      })
    }
  })

  it('keeps the queue item with an incremented attempt count on failure', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID() })
    await seedQueue(userId, local, { operation: 'update' })
    api.fetchTask.mockResolvedValue(task({ ...local }))
    api.updateTask.mockRejectedValue(new Error('network down'))
    const consoleError = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    try {
      const result = await new SyncManager().startSync(userId)

      expect(result.status).toBe('completed')
      if (result.status === 'completed') {
        expect(result.results[0].status).toBe('error')
      }
      const queue = await getOfflineDatabase(userId).syncQueue.toArray()
      expect(queue).toHaveLength(1)
      expect(queue[0].attempts).toBe(1)
      expect(queue[0].error).toBe('network down')
    } finally {
      consoleError.mockRestore()
    }
  })

  it('emits syncing and synced status events', async () => {
    const userId = newUser()
    const local = task({ id: crypto.randomUUID() })
    await seedQueue(userId, local, { operation: 'update' })
    api.fetchTask.mockResolvedValue(task({ ...local }))
    api.updateTask.mockResolvedValue(task({ ...local, revision: 2 }))

    const manager = new SyncManager()
    const events: string[] = []
    manager.onStatusChange((status) => events.push(status.kind))

    await manager.startSync(userId)

    expect(events).toEqual(['syncing', 'synced'])
  })
})
