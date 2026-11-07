export type TaskStatus =
  | 'not_started'
  | 'in_progress'
  | 'completed'
  | 'on_hold'

export type Locale = 'th' | 'en'
export type Theme = 'light' | 'dark' | 'system'

export type SourceType =
  | 'academic'
  | 'news'
  | 'official'
  | 'documentation'
  | 'blog'
  | 'other'
  | 'unknown'

export type ClassificationMethod = 'rule_based' | 'ai' | 'manual' | 'unknown'

export type ConfidenceLevel = 'high' | 'medium' | 'low' | 'unknown'

export type TaskEventType =
  | 'created'
  | 'updated'
  | 'status_changed'
  | 'progress_changed'
  | 'image_added'
  | 'image_removed'
  | 'deleted'
  | 'restored'

export type Profile = {
  id: string
  display_name: string | null
  locale: Locale
  theme: Theme
  created_at: string
  updated_at: string
}

export type Category = {
  id: string
  user_id: string
  key: string
  name_th: string
  name_en: string
  color: string
  icon: string
  is_system: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type Task = {
  id: string
  user_id: string
  title: string
  description: string | null
  category_id: string | null
  status: TaskStatus
  progress: number
  created_at: string
  updated_at: string
  server_updated_at: string
  client_updated_at: string | null
  revision: number
  deleted_at: string | null
  last_device_id: string | null
}

export type TaskImage = {
  id: string
  task_id: string
  user_id: string
  storage_path: string
  file_name: string
  mime_type: string
  size_bytes: number
  width: number | null
  height: number | null
  created_at: string
  deleted_at: string | null
}

export type TaskEvent = {
  id: string
  task_id: string
  user_id: string
  event_type: TaskEventType
  payload: Record<string, unknown>
  created_at: string
  client_created_at: string | null
  device_id: string | null
}

export type SearchSession = {
  id: string
  user_id: string
  query: string
  created_at: string
}

export type SearchResult = {
  id: string
  session_id: string
  user_id: string
  source_name: string
  source_url: string
  source_type: SourceType
  topic: string | null
  summary: string | null
  classification_method: ClassificationMethod
  is_ai_generated: boolean
  confidence: ConfidenceLevel
  created_at: string
}

export type SyncConflict = {
  id: string
  user_id: string
  task_id: string
  losing_payload: Record<string, unknown>
  resolved_at: string | null
  created_at: string
}

export type Device = {
  id: string
  user_id: string
  name: string | null
  last_seen_at: string
  created_at: string
}
