-- assign_workout() still conflicts on the pre-slot constraint, 2026-09-21.
--
-- 20260917_ai_workouts_slot.sql replaced ai_workouts's unique constraint with
-- one on (email, entry_date, slot), and the client's own upsertPlanRow was
-- updated to conflict on the three columns with a fallback for a database
-- that has not run the migration yet. This RPC was not updated. It is
-- SECURITY DEFINER and calls `insert ... on conflict (email, entry_date) do
-- update`, which is exactly the failure the migration's own comment warned
-- about: Postgres error 42P10, "no unique or exclusion constraint matching
-- the ON CONFLICT specification", the moment a coach assigns a workout.
--
-- Read live rather than assumed: the constraint really is
-- ai_workouts_email_date_slot_key on (email, entry_date, slot) today, so this
-- function is broken right now, not merely stale.
--
-- Assigning a workout always writes the day's main workout, so slot 0, the
-- same default every other caller uses for a single session on a day.
create or replace function assign_workout(
  p_group_id uuid, p_email text, p_date date, p_focus text, p_exercises jsonb
)
returns uuid
language plpgsql
security definer
set search_path to 'public'
as $$
declare wid uuid; target_name text;
begin
  if not exists (select 1 from groups g
                 where g.id = p_group_id
                   and lower(g.owner_email) = lower(coalesce(auth.jwt()->>'email',''))) then
    raise exception 'only the coach can assign workouts';
  end if;
  if not exists (select 1 from group_members m
                 where m.group_id = p_group_id and lower(m.email) = lower(p_email)
                   and m.left_at is null and m.accepted_at is not null) then
    raise exception 'that person is not an active member of your group';
  end if;
  if p_exercises is null or jsonb_array_length(p_exercises) = 0 then
    raise exception 'a workout needs at least one exercise';
  end if;

  select user_name into target_name from profiles where lower(email) = lower(p_email);

  insert into ai_workouts (user_name, email, entry_date, slot, focus, exercises, archived)
  values (coalesce(target_name, split_part(p_email,'@',1)), lower(p_email), p_date, 0, p_focus, p_exercises, false)
  on conflict (email, entry_date, slot) do update
    set focus = excluded.focus, exercises = excluded.exercises, archived = false
  returning id into wid;
  return wid;
end $$;

-- Verify after running: pg_get_functiondef should show the three-column
-- conflict target, and a coach assigning a second workout onto a day that
-- already has one should update it rather than raise 42P10.
