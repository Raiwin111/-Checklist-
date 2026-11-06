-- ============================================================================
-- Personal Task & Research System
-- Migration: 20261106000200_backfill_profiles
-- Purpose:   Repair accounts that have no `profiles` row.
--
-- Symptom this fixes:
--   insert or update on table "tasks" violates foreign key constraint
--   "tasks_user_id_fkey"
--
-- Why it happens:
--   public.tasks.user_id references public.profiles(id). The signup trigger
--   (on_auth_user_created) creates the profile, but accounts created *before*
--   that trigger was installed never got one.
--
-- This migration is safe to run more than once.
-- Run it in Supabase Dashboard -> SQL Editor -> Run.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Make sure the signup trigger function exists and is correct.
-- ----------------------------------------------------------------------------
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
    (new.id, 'study',    'เรียน',    'Study',    '#3b82f6', 'book-open',     true, 1),
    (new.id, 'project',  'โปรเจกต์', 'Project',  '#10b981', 'folder-kanban', true, 2),
    (new.id, 'research', 'งานวิจัย', 'Research', '#8b5cf6', 'microscope',    true, 3)
  on conflict (user_id, key) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ----------------------------------------------------------------------------
-- 2. Backfill a profile for every existing auth user that is missing one.
-- ----------------------------------------------------------------------------
insert into public.profiles (id, display_name)
select
  u.id,
  coalesce(
    u.raw_user_meta_data ->> 'display_name',
    split_part(coalesce(u.email, 'user'), '@', 1)
  )
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 3. Backfill the three default categories for users that are missing them.
-- ----------------------------------------------------------------------------
insert into public.categories
  (user_id, key, name_th, name_en, color, icon, is_system, sort_order)
select
  u.id,
  v.key,
  v.name_th,
  v.name_en,
  v.color,
  v.icon,
  true,
  v.sort_order
from auth.users u
cross join (
  values
    ('study',    'เรียน',    'Study',    '#3b82f6', 'book-open',     1),
    ('project',  'โปรเจกต์', 'Project',  '#10b981', 'folder-kanban', 2),
    ('research', 'งานวิจัย', 'Research', '#8b5cf6', 'microscope',    3)
) as v (key, name_th, name_en, color, icon, sort_order)
on conflict (user_id, key) do nothing;

-- ----------------------------------------------------------------------------
-- 4. Verification: this should return 0 rows.
--    Any row listed here still has no profile.
-- ----------------------------------------------------------------------------
select u.id, u.email
from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null;

notify pgrst, 'reload schema';
