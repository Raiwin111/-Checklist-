import type { Task } from '../../types/database'
import type { TaskWithRelations } from '../api/tasks'
import { isLocalId } from './local'

/** Converts a locally stored Task back into the shape the UI expects. */
export function toTaskWithRelations(
  task: Task,
  base?: TaskWithRelations | null,
): TaskWithRelations {
  return {
    ...task,
    category: base?.category ?? null,
    images: base?.images ?? [],
  }
}

/**
 * Merges local (offline) task rows into a server or cache snapshot.
 *
 * - Rows soft-deleted locally are hidden from the snapshot.
 * - When `overrideAll` is true (offline), every local row overrides the
 *   snapshot row with the same id, because the snapshot is older.
 * - When `overrideAll` is false (online), only rows with a pending queue item
 *   override the snapshot, so stale synced rows never shadow server data.
 * - Local-only creates are appended.
 */
export function mergeTaskLists(
  base: TaskWithRelations[],
  localTasks: Task[],
  pendingIds: ReadonlySet<string>,
  options: { overrideAll?: boolean } = {},
): { tasks: TaskWithRelations[]; pendingCount: number } {
  const overrideAll = options.overrideAll ?? false
  const localById = new Map(localTasks.map((task) => [task.id, task]))
  const baseIds = new Set(base.map((task) => task.id))
  const merged: TaskWithRelations[] = []

  for (const task of base) {
    const local = localById.get(task.id)
    if (local?.deleted_at) continue

    const shouldOverride = local && (overrideAll || pendingIds.has(task.id))
    merged.push(shouldOverride ? toTaskWithRelations(local, task) : task)
  }

  for (const local of localTasks) {
    if (baseIds.has(local.id) || local.deleted_at || !isLocalId(local.id)) {
      continue
    }
    merged.push(toTaskWithRelations(local))
  }

  const pendingCount = localTasks.filter((task) =>
    pendingIds.has(task.id),
  ).length

  return { tasks: merged, pendingCount }
}
