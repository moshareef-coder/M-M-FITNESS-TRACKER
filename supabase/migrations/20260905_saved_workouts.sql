-- Saved workouts, 2026-09-05.
--
-- A workout you built or completed is worth keeping: people repeat what works.
-- These are templates, not history, so they carry no date. Scheduling one
-- writes an ai_workouts row for the day you chose, which is the same shape the
-- app already reads for "today's workout", so nothing downstream changes.
--
-- Self only, deliberately. Your partner sees what you DID through the timeline
-- and live session; your saved templates are your own drafts.

create table if not exists saved_workouts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null,
  focus text,
  exercises jsonb not null,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists saved_workouts_email_idx on saved_workouts (email, created_at desc);

alter table saved_workouts enable row level security;

drop policy if exists "own saved workouts read" on saved_workouts;
create policy "own saved workouts read" on saved_workouts for select using (is_me(email));
drop policy if exists "own saved workouts write" on saved_workouts;
create policy "own saved workouts write" on saved_workouts for insert with check (is_me(email));
drop policy if exists "own saved workouts update" on saved_workouts;
create policy "own saved workouts update" on saved_workouts for update using (is_me(email)) with check (is_me(email));
drop policy if exists "own saved workouts delete" on saved_workouts;
create policy "own saved workouts delete" on saved_workouts for delete using (is_me(email));
