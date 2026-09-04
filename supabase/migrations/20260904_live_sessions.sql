-- Live workout presence, 2026-09-04.
--
-- A workout has only ever existed on the phone doing it: SESSION lives in
-- localStorage and nothing reaches the server until an exercise is finished.
-- This is the smallest row that lets the other person see where you are right
-- now: which exercise, how far through it, and whether you are working or
-- resting. It is state, not history, so there is exactly one row per person
-- and it is deleted when the session ends.

create table if not exists live_sessions (
  email          text primary key,
  user_name      text not null,
  started_at     timestamptz not null default now(),
  last_beat_at   timestamptz not null default now(),
  workout_id     uuid,
  focus          text,
  exercise_name  text,
  exercise_index int  not null default 0,
  exercise_count int  not null default 0,
  set_done       int  not null default 0,
  set_total      int  not null default 0,
  -- working | resting | paused
  state          text not null default 'working',
  elapsed_sec    int  not null default 0
);

alter table live_sessions enable row level security;

-- Same visibility rule as everything else: you, and whoever is allowed to see
-- you (accepted partner, or a coach whose group you are in).
drop policy if exists "pair can watch a live session" on live_sessions;
create policy "pair can watch a live session" on live_sessions
  for select using (is_me(email) or can_see(email));

-- Only you can say where you are. Nobody can post a session as someone else.
drop policy if exists "self starts own live session" on live_sessions;
create policy "self starts own live session" on live_sessions
  for insert with check (is_me(email));

drop policy if exists "self updates own live session" on live_sessions;
create policy "self updates own live session" on live_sessions
  for update using (is_me(email)) with check (is_me(email));

drop policy if exists "self ends own live session" on live_sessions;
create policy "self ends own live session" on live_sessions
  for delete using (is_me(email));

-- Realtime, so a watcher sees a set land instead of polling for it. Postgres
-- Changes applies the policies above per subscriber, so this publishes the
-- table without widening who can read it.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_sessions'
  ) then
    alter publication supabase_realtime add table live_sessions;
  end if;
end $$;

-- A phone that dies mid-workout would otherwise leave someone "live" forever.
-- The client already ignores a row that has gone quiet; this is the sweep that
-- stops the rows themselves accumulating.
create or replace function purge_stale_live_sessions() returns void
language sql security definer set search_path = public as $$
  delete from live_sessions where last_beat_at < now() - interval '4 hours';
$$;

select cron.unschedule('purge-live-sessions')
  where exists (select 1 from cron.job where jobname = 'purge-live-sessions');
select cron.schedule('purge-live-sessions', '*/30 * * * *', 'select purge_stale_live_sessions()');

select 'live_sessions ready' as result,
       (select count(*) from pg_policies where tablename = 'live_sessions') as policies,
       (select count(*) from pg_publication_tables
          where pubname = 'supabase_realtime' and tablename = 'live_sessions') as published;
