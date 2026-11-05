-- ============================================================================
-- Personal Task & Research System
-- Migration: 20261105000100_init
-- Purpose:   Initial schema, indexes, RLS policies, triggers, storage bucket
--
-- ⚠️  DO NOT RUN until the project owner has reviewed this file.
-- ⚠️  Apply it in Supabase Dashboard → SQL Editor (or `supabase db push`).
-- ⚠️  Never expose the service_role key to the frontend.
-- ============================================================================

create extension if not exists pgcrypto;

-- ============================================================================
-- 1. TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- profiles: one row per auth user
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  locale      text not null default 'th' check (locale in ('th', 'en')),
  theme       text not null default 'system' check (theme in ('light', 'dark', 'system')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- categories: user-owned, extensible task categories
-- The three system categories (study/project/research) are seeded by trigger.
-- ----------------------------------------------------------------------------
create table if not exists public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  key         text not null,
  name_th     text not null,
  name_en     text not null,
  color       text not null default '#64748b',
  icon        text not null default 'folder',
  is_system   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, key)
);

-- ----------------------------------------------------------------------------
-- tasks
-- `updated_at`      = server write time (managed by trigger)
-- `client_updated_at` = device edit time (sent by the client, may be null)
-- `server_updated_at` = authoritative sync cursor (managed by trigger)
-- `revision`        = optimistic concurrency counter (managed by trigger)
-- `deleted_at`      = soft delete so deletions can be synced later
-- ----------------------------------------------------------------------------
create table if not exists public.tasks (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  title             text not null check (char_length(btrim(title)) > 0),
  description       text,
  category_id       uuid references public.categories (id) on delete set null,
  status            text not null default 'not_started'
                      check (status in ('not_started', 'in_progress', 'completed', 'on_hold')),
  progress          smallint not null default 0 check (progress between 0 and 100),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  server_updated_at timestamptz not null default now(),
  client_updated_at timestamptz,
  revision          integer not null default 1,
  deleted_at        timestamptz,
  last_device_id    uuid
);

-- ----------------------------------------------------------------------------
-- task_images: metadata for files stored in the `task-images` bucket
-- Storage path convention: {user_id}/{task_id}/{image_id}.{ext}
-- ----------------------------------------------------------------------------
create table if not exists public.task_images (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid not null references public.tasks (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  storage_path text not null,
  file_name    text not null,
  mime_type    text not null,
  size_bytes   bigint not null check (size_bytes between 1 and 20971520),
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- ----------------------------------------------------------------------------
-- task_events: activity timeline / audit log
-- ----------------------------------------------------------------------------
create table if not exists public.task_events (
  id                uuid primary key default gen_random_uuid(),
  task_id           uuid not null references public.tasks (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  event_type        text not null check (event_type in (
                      'created', 'updated', 'status_changed', 'progress_changed',
                      'image_added', 'image_removed', 'deleted', 'restored'
                    )),
  payload           jsonb not null default '{}'::jsonb,
  created_at        timestamptz not null default now(),
  client_created_at timestamptz,
  device_id         uuid
);

-- ----------------------------------------------------------------------------
-- search_sessions / search_results: persisted search history
-- Classification is rule-based; `is_ai_generated` stays false.
-- ----------------------------------------------------------------------------
create table if not exists public.search_sessions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles (id) on delete cascade,
  query      text not null check (char_length(btrim(query)) > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.search_results (
  id                    uuid primary key default gen_random_uuid(),
  session_id            uuid not null references public.search_sessions (id) on delete cascade,
  user_id               uuid not null references public.profiles (id) on delete cascade,
  source_name           text not null,
  source_url            text not null,
  source_type           text not null default 'unknown'
                          check (source_type in (
                            'academic', 'news', 'official', 'documentation',
                            'blog', 'other', 'unknown'
                          )),
  topic                 text,
  summary               text,
  classification_method text not null default 'rule_based'
                          check (classification_method in ('rule_based', 'ai', 'manual', 'unknown')),
  is_ai_generated       boolean not null default false,
  confidence            text not null default 'unknown'
                          check (confidence in ('high', 'medium', 'low', 'unknown')),
  created_at            timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- sync_conflicts: keeps the losing copy when last-write-wins overwrites a task
-- ----------------------------------------------------------------------------
create table if not exists public.sync_conflicts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references public.profiles (id) on delete cascade,
  task_id        uuid not null,
  losing_payload jsonb not null,
  resolved_at    timestamptz,
  created_at     timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- devices: helps identify which device produced a change
-- ----------------------------------------------------------------------------
create table if not exists public.devices (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles (id) on delete cascade,
  name         text,
  last_seen_at timestamptz not null default now(),
  created_at   timestamptz not null default now()
);

-- ============================================================================
-- 2. INDEXES
-- ============================================================================

create index if not exists tasks_user_status_idx
  on public.tasks (user_id, status)
  where deleted_at is null;

create index if not exists tasks_user_category_idx
  on public.tasks (user_id, category_id)
  where deleted_at is null;

create index if not exists tasks_user_server_updated_idx
  on public.tasks (user_id, server_updated_at);

create index if not exists task_images_task_idx
  on public.task_images (task_id)
  where deleted_at is null;

create index if not exists task_events_task_created_idx
  on public.task_events (task_id, created_at desc);

create index if not exists search_sessions_user_created_idx
  on public.search_sessions (user_id, created_at desc);

create index if not exists search_results_session_idx
  on public.search_results (session_id);

create index if not exists sync_conflicts_user_created_idx
  on public.sync_conflicts (user_id, created_at desc);

create index if not exists devices_user_idx
  on public.devices (user_id);

-- ============================================================================
-- 3. TRIGGER FUNCTIONS
-- ============================================================================

-- Bump updated_at on ordinary tables.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Server-owned task fields + optimistic concurrency revision.
create or replace function public.set_task_server_fields()
returns trigger
language plpgsql
as $$
begin
  new.server_updated_at := now();

  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
  end if;

  return new;
end;
$$;

-- Seed a profile and the three default categories on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.categories
    (user_id, key, name_th, name_en, color, icon, is_system, sort_order)
  values
    (new.id, 'study',    'เรียน',       'Study',    '#3b82f6', 'book-open',     true, 1),
    (new.id, 'project',  'โปรเจกต์',    'Project',  '#10b981', 'folder-kanban', true, 2),
    (new.id, 'research', 'งานวิจัย',    'Research', '#8b5cf6', 'microscope',    true, 3)
  on conflict (user_id, key) do nothing;

  return new;
end;
$$;

-- ============================================================================
-- 4. TRIGGERS
-- ============================================================================

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists categories_set_updated_at on public.categories;
create trigger categories_set_updated_at
before update on public.categories
for each row execute function public.set_updated_at();

drop trigger if exists tasks_set_server_fields on public.tasks;
create trigger tasks_set_server_fields
before insert or update on public.tasks
for each row execute function public.set_task_server_fields();

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============================================================================
-- 5. ROW LEVEL SECURITY
-- ============================================================================

alter table public.profiles       enable row level security;
alter table public.categories     enable row level security;
alter table public.tasks          enable row level security;
alter table public.task_images    enable row level security;
alter table public.task_events    enable row level security;
alter table public.search_sessions enable row level security;
alter table public.search_results  enable row level security;
alter table public.sync_conflicts  enable row level security;
alter table public.devices         enable row level security;

-- ----------------------------------------------------------------------------
-- profiles
-- ----------------------------------------------------------------------------
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select to authenticated
  using (id = auth.uid());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
  on public.profiles for insert to authenticated
  with check (id = auth.uid());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- ----------------------------------------------------------------------------
-- categories
-- System categories cannot be deleted from the client.
-- ----------------------------------------------------------------------------
drop policy if exists "categories_select_own" on public.categories;
create policy "categories_select_own"
  on public.categories for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "categories_insert_own" on public.categories;
create policy "categories_insert_own"
  on public.categories for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "categories_update_own" on public.categories;
create policy "categories_update_own"
  on public.categories for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "categories_delete_own_custom" on public.categories;
create policy "categories_delete_own_custom"
  on public.categories for delete to authenticated
  using (user_id = auth.uid() and is_system = false);

-- ----------------------------------------------------------------------------
-- tasks
-- ----------------------------------------------------------------------------
drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
  on public.tasks for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
  on public.tasks for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
  on public.tasks for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
  on public.tasks for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- task_images
-- ----------------------------------------------------------------------------
drop policy if exists "task_images_select_own" on public.task_images;
create policy "task_images_select_own"
  on public.task_images for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "task_images_insert_own" on public.task_images;
create policy "task_images_insert_own"
  on public.task_images for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "task_images_update_own" on public.task_images;
create policy "task_images_update_own"
  on public.task_images for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "task_images_delete_own" on public.task_images;
create policy "task_images_delete_own"
  on public.task_images for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- task_events: append-only, but the owner may delete their own history.
-- ----------------------------------------------------------------------------
drop policy if exists "task_events_select_own" on public.task_events;
create policy "task_events_select_own"
  on public.task_events for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "task_events_insert_own" on public.task_events;
create policy "task_events_insert_own"
  on public.task_events for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "task_events_delete_own" on public.task_events;
create policy "task_events_delete_own"
  on public.task_events for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- search_sessions
-- ----------------------------------------------------------------------------
drop policy if exists "search_sessions_select_own" on public.search_sessions;
create policy "search_sessions_select_own"
  on public.search_sessions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "search_sessions_insert_own" on public.search_sessions;
create policy "search_sessions_insert_own"
  on public.search_sessions for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "search_sessions_delete_own" on public.search_sessions;
create policy "search_sessions_delete_own"
  on public.search_sessions for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- search_results
-- ----------------------------------------------------------------------------
drop policy if exists "search_results_select_own" on public.search_results;
create policy "search_results_select_own"
  on public.search_results for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "search_results_insert_own" on public.search_results;
create policy "search_results_insert_own"
  on public.search_results for insert to authenticated
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.search_sessions s
      where s.id = session_id and s.user_id = auth.uid()
    )
  );

drop policy if exists "search_results_update_own" on public.search_results;
create policy "search_results_update_own"
  on public.search_results for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "search_results_delete_own" on public.search_results;
create policy "search_results_delete_own"
  on public.search_results for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- sync_conflicts
-- ----------------------------------------------------------------------------
drop policy if exists "sync_conflicts_select_own" on public.sync_conflicts;
create policy "sync_conflicts_select_own"
  on public.sync_conflicts for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "sync_conflicts_insert_own" on public.sync_conflicts;
create policy "sync_conflicts_insert_own"
  on public.sync_conflicts for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "sync_conflicts_update_own" on public.sync_conflicts;
create policy "sync_conflicts_update_own"
  on public.sync_conflicts for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "sync_conflicts_delete_own" on public.sync_conflicts;
create policy "sync_conflicts_delete_own"
  on public.sync_conflicts for delete to authenticated
  using (user_id = auth.uid());

-- ----------------------------------------------------------------------------
-- devices
-- ----------------------------------------------------------------------------
drop policy if exists "devices_select_own" on public.devices;
create policy "devices_select_own"
  on public.devices for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "devices_insert_own" on public.devices;
create policy "devices_insert_own"
  on public.devices for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "devices_update_own" on public.devices;
create policy "devices_update_own"
  on public.devices for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "devices_delete_own" on public.devices;
create policy "devices_delete_own"
  on public.devices for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================================
-- 6. STORAGE: task-images bucket (private, 20 MB per file)
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'task-images',
  'task-images',
  false,
  20971520,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Path convention: {user_id}/{task_id}/{image_id}.{ext}
drop policy if exists "task_images_storage_select_own" on storage.objects;
create policy "task_images_storage_select_own"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'task-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "task_images_storage_insert_own" on storage.objects;
create policy "task_images_storage_insert_own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'task-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "task_images_storage_update_own" on storage.objects;
create policy "task_images_storage_update_own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'task-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'task-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "task_images_storage_delete_own" on storage.objects;
create policy "task_images_storage_delete_own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'task-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ============================================================================
-- 7. RELOAD POSTGREST SCHEMA CACHE
-- ============================================================================

notify pgrst, 'reload schema';
