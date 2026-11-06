-- ============================================================================
-- Personal Task & Research System
-- Migration: 20261106000100_task_status_progress
-- Purpose:   Enforce the approved Status <-> Progress rules in the database.
--
-- Rules (Architecture v1, section 4):
--   Status -> Completed     => progress 100
--   Status -> Not Started   => progress 0
--   Status -> In Progress   => 0 becomes 1; 100 becomes Completed
--   Status -> On Hold       => progress unchanged
--   Progress -> 100         => status Completed
--   Progress -> 0           => status Not Started
--   Progress -> 1..99       => status In Progress, unless currently On Hold
--
-- The client already normalizes these values; this trigger is the safety net
-- for direct API writes, imports and future offline sync.
-- ============================================================================

create or replace function public.normalize_task_status_progress()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'completed' then
      new.progress := 100;
    elsif new.status = 'not_started' then
      new.progress := 0;
    elsif new.status = 'in_progress' then
      if new.progress = 0 then
        new.progress := 1;
      elsif new.progress = 100 then
        new.status := 'completed';
      end if;
    end if;

    return new;
  end if;

  if new.status is distinct from old.status then
    case new.status
      when 'completed' then
        new.progress := 100;
      when 'not_started' then
        new.progress := 0;
      when 'in_progress' then
        if new.progress = 0 then
          new.progress := 1;
        elsif new.progress = 100 then
          new.status := 'completed';
        end if;
      else
        -- on_hold keeps the current progress
        null;
    end case;
  elsif new.progress is distinct from old.progress then
    if new.progress = 100 then
      new.status := 'completed';
      new.progress := 100;
    elsif new.progress = 0 then
      new.status := 'not_started';
      new.progress := 0;
    elsif new.status <> 'on_hold' then
      new.status := 'in_progress';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists tasks_normalize_status_progress on public.tasks;
create trigger tasks_normalize_status_progress
before insert or update on public.tasks
for each row execute function public.normalize_task_status_progress();

notify pgrst, 'reload schema';
