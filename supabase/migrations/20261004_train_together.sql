-- Train together: two partners doing the same workout at the same time,
-- anywhere, each at their own pace, watching each other's sets land live.
--
-- Mo, 2026-10-04: an invitation ("want to work out together?"), a lobby where
-- one person is in charge of the workout and can add or remove exercises,
-- the same exact workout for both, everything visible to each other while it
-- runs, and 1.5x XP for finishing it together. Later the same day: started from
-- the partner's profile, and with a second way to do it, each doing their own
-- workout side by side, which becomes the joint workout when they pick the same.
--
-- Two tables. together_sessions is the session itself: who, what state, the
-- workout they agreed on, and when each of them finished. together_sets is one
-- row per set either of them logs, so the other phone can show it the moment
-- it lands. Both are on the realtime publication; RLS applies per subscriber,
-- so nobody outside the pair ever receives a row.
--
-- Each phone still runs its own ordinary session and writes its own
-- exercise_logs, so history, records and progress need nothing new. These two
-- tables only carry what the OTHER phone needs to see.

create table if not exists together_sessions (
  id            uuid primary key default gen_random_uuid(),
  host_email    text not null,
  guest_email   text not null,
  -- Whoever is in charge of the workout. Starts as the host; can be handed over.
  leader_email  text not null,
  status        text not null default 'invited'
                check (status in ('invited', 'lobby', 'active', 'done', 'declined', 'cancelled')),
  -- same: one workout for both, the joint workout. own: each does their own,
  -- side by side, watching each other. The person in charge chooses.
  mode          text not null default 'same' check (mode in ('same', 'own')),
  -- The shared list for mode 'same': { exercises: [...], focus, joinRunning }.
  -- Only the person in charge changes it.
  workout       jsonb not null default '{"exercises": []}'::jsonb,
  -- Each person's own list for mode 'own': { exercises: [...], focus }.
  -- Only its owner changes it.
  host_workout  jsonb not null default '{"exercises": []}'::jsonb,
  guest_workout jsonb not null default '{"exercises": []}'::jsonb,
  -- host | guest | new: whose plan the workout came from.
  source        text,
  cancelled_by  text,
  host_done_at  timestamptz,
  guest_done_at timestamptz,
  created_at    timestamptz not null default now(),
  started_at    timestamptz,
  ended_at      timestamptz,
  updated_at    timestamptz not null default now()
);

create index if not exists together_sessions_host_idx  on together_sessions (lower(host_email), created_at desc);
create index if not exists together_sessions_guest_idx on together_sessions (lower(guest_email), created_at desc);

alter table together_sessions enable row level security;

drop policy if exists "together sessions are seen by the two of them" on together_sessions;
create policy "together sessions are seen by the two of them" on together_sessions
  for select using (is_me(host_email) or is_me(guest_email));

-- You can only invite your own partner, and only as yourself.
drop policy if exists "together sessions are started by the host" on together_sessions;
create policy "together sessions are started by the host" on together_sessions
  for insert with check (
    is_me(host_email)
    and lower(guest_email) = my_partner_email()
    and lower(leader_email) = lower(host_email)
  );

drop policy if exists "together sessions are moved on by either of them" on together_sessions;
create policy "together sessions are moved on by either of them" on together_sessions
  for update using (is_me(host_email) or is_me(guest_email))
  with check (is_me(host_email) or is_me(guest_email));

-- RLS guards rows, not columns. Either member may update the row, so without
-- this a guest could rewrite who the host is, or the person not in charge
-- could rewrite the workout. Pinned here instead.
create or replace function together_sessions_guard()
returns trigger language plpgsql as $$
begin
  if new.host_email is distinct from old.host_email
     or new.guest_email is distinct from old.guest_email
     or new.created_at is distinct from old.created_at then
    raise exception 'who is in a together session cannot change';
  end if;
  if lower(new.leader_email) not in (lower(old.host_email), lower(old.guest_email)) then
    raise exception 'the leader has to be one of the two of them';
  end if;
  -- Only the person in charge changes the shared workout, how you train, or
  -- hands over the lead. The inviter starts in charge.
  if (new.workout is distinct from old.workout or new.leader_email is distinct from old.leader_email
      or new.mode is distinct from old.mode)
     and lower(old.leader_email) <> my_email() then
    raise exception 'only the person in charge can change the workout';
  end if;
  -- Your own list is yours: in 'own' mode nobody edits the other person's.
  if new.host_workout is distinct from old.host_workout and not is_me(old.host_email) then
    raise exception 'only you can change your own workout';
  end if;
  if new.guest_workout is distinct from old.guest_workout and not is_me(old.guest_email) then
    raise exception 'only you can change your own workout';
  end if;
  -- Each of them stamps only their own finish.
  if new.host_done_at is distinct from old.host_done_at and not is_me(old.host_email) then
    raise exception 'you can only finish your own half';
  end if;
  if new.guest_done_at is distinct from old.guest_done_at and not is_me(old.guest_email) then
    raise exception 'you can only finish your own half';
  end if;
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists together_sessions_guard on together_sessions;
create trigger together_sessions_guard before update on together_sessions
  for each row execute function together_sessions_guard();

create table if not exists together_sets (
  session_id    uuid not null references together_sessions(id) on delete cascade,
  email         text not null,
  exercise_name text not null,
  set_idx       int  not null,
  weight        numeric,
  reps          int,
  done          boolean not null default true,
  updated_at    timestamptz not null default now(),
  primary key (session_id, email, exercise_name, set_idx)
);

alter table together_sets enable row level security;

create or replace function in_together_session(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from together_sessions s
    where s.id = sid and (lower(s.host_email) = my_email() or lower(s.guest_email) = my_email())
  )
$$;

drop policy if exists "together sets are seen by the two of them" on together_sets;
create policy "together sets are seen by the two of them" on together_sets
  for select using (in_together_session(session_id));

drop policy if exists "together sets are logged as yourself" on together_sets;
create policy "together sets are logged as yourself" on together_sets
  for insert with check (is_me(email) and in_together_session(session_id));

drop policy if exists "together sets are changed as yourself" on together_sets;
create policy "together sets are changed as yourself" on together_sets
  for update using (is_me(email)) with check (is_me(email) and in_together_session(session_id));

alter publication supabase_realtime add table together_sessions;
alter publication supabase_realtime add table together_sets;
