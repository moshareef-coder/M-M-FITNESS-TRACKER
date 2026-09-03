-- Goals with a target and a deadline, 2026-09-03.
--
-- Today a goal is one text column, profiles.goal, holding "Lose weight". The
-- pace the user picks in onboarding (12, 8 or 16 weeks) is collected and then
-- dropped on the floor, so the deadline they chose never reaches the database.
-- There is nowhere to record "20 pounds", "by June 3rd", or what they weighed
-- when they started, which means we cannot tell anyone how they are doing
-- against the thing they actually asked for.
--
-- This table is deliberately a container, not a guess. Jawa's research decides
-- which targets are worth supporting, so `metric` and `target_value` stay null
-- until we know. What we can record honestly today is the goal, the detail
-- chip, the pace and the resulting date.

create table if not exists user_goals (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,

  goal_key      text not null check (goal_key in ('lose','muscle','stronger','recomp','consistent')),
  detail        text,          -- the second-layer chip, verbatim: "10 to 20 pounds"

  -- The measurable target. Null until the user tells us one, which today is
  -- never, and after Jawa's work will be most of the time.
  metric        text check (metric in
                  ('weight_lb','body_fat_pct','lift_1rm_lb','mile_time_sec','reps','sessions_per_week')),
  metric_ref    text,          -- which lift or distance the metric refers to
  start_value   numeric,       -- snapshot when the goal was set, so progress is measurable
  target_value  numeric,

  -- The horizon.
  pace          text check (pace in ('steady','quick','easy')),
  target_date   date,
  days_per_week int check (days_per_week between 1 and 7),

  status        text not null default 'active'
                  check (status in ('active','achieved','missed','replaced')),
  created_at    timestamptz not null default now(),
  achieved_at   timestamptz
);

create index if not exists user_goals_email_idx on user_goals (lower(email), status);

-- One goal at a time. Setting a new one marks the old one 'replaced'.
create unique index if not exists user_goals_one_active
  on user_goals (lower(email)) where status = 'active';

alter table user_goals enable row level security;

-- Partner and coach can see the goal, which is the entire point of the app.
create policy "couple reads goals" on user_goals
  for select using (can_see(email));

-- No BEFORE UPDATE trigger needed here, unlike partnerships and group_members.
-- The only column that decides visibility is `email`, and a WITH CHECK of
-- is_me(email) already makes it impossible to hand your row to someone else.
create policy "self writes goals" on user_goals
  for insert with check (is_me(email));
create policy "self updates goals" on user_goals
  for update using (is_me(email)) with check (is_me(email));
create policy "self deletes goals" on user_goals
  for delete using (is_me(email));

-- Prints a visible confirmation instead of "Success. No rows returned", so a
-- stale clipboard cannot look like a successful run.
select 'user_goals ready' as result,
       (select count(*) from information_schema.columns where table_name = 'user_goals') as columns,
       (select count(*) from pg_policies where tablename = 'user_goals') as policies;
