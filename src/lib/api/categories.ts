import { supabase } from '../supabase'
import type { Category } from '../../types/database'
import { assertOnline } from '../offline/network'

export type CategoryInput = {
  nameTh: string
  nameEn: string
  color: string
  icon: string
  key?: string
}

export async function fetchCategories(userId: string): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('user_id', userId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data ?? []) as Category[]
}

function slugify(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u0E00-\u0E7F]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

export async function createCategory(
  userId: string,
  input: CategoryInput,
): Promise<Category> {
  assertOnline()

  const key = slugify(input.key || input.nameEn || input.nameTh) || 'custom'
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      key,
      name_th: input.nameTh.trim(),
      name_en: input.nameEn.trim() || input.nameTh.trim(),
      color: input.color,
      icon: input.icon,
      is_system: false,
      sort_order: 100,
    })
    .select('*')
    .single()

  if (error) throw error
  return data as Category
}

export async function updateCategory(
  id: string,
  input: Partial<CategoryInput>,
): Promise<Category> {
  assertOnline()

  const patch: Record<string, unknown> = {}

  if (input.nameTh !== undefined) patch.name_th = input.nameTh.trim()
  if (input.nameEn !== undefined) {
    patch.name_en = input.nameEn.trim() || input.nameTh?.trim() || ''
  }
  if (input.color !== undefined) patch.color = input.color
  if (input.icon !== undefined) patch.icon = input.icon

  const { data, error } = await supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data as Category
}

export async function deleteCategory(id: string): Promise<void> {
  assertOnline()

  const { error } = await supabase.from('categories').delete().eq('id', id)
  if (error) throw error
}

export async function countTasksInCategory(
  categoryId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from('tasks')
    .select('*', { count: 'exact', head: true })
    .eq('category_id', categoryId)
    .is('deleted_at', null)

  if (error) throw error
  return count ?? 0
}

export async function reassignTasks(
  fromCategoryId: string,
  toCategoryId: string | null,
): Promise<void> {
  assertOnline()

  const { error } = await supabase
    .from('tasks')
    .update({ category_id: toCategoryId })
    .eq('category_id', fromCategoryId)
    .is('deleted_at', null)

  if (error) throw error
}
