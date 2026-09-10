-- Exercise swaps: what somebody actually replaced. 2026-09-09.
--
-- research/07's whole argument is prefer measured over stated. This is the
-- clearest measured signal the app produces and currently throws on the floor:
-- the plan said "Barbell Bench Press", the person did Dumbbell Bench Press
-- instead, and nobody wrote that down. Stated preference decays (the focus
-- picker, the goal bubble); revealed preference rises with every session, and a
-- swap is revealed preference with no survey attached to it.
--
-- One row per replacement, not per session, and it records HOW they got there:
--   'suggested' -- they took one of the alternatives the engine offered, which
--                  says the ranking in mo-knowledge/engine/alternatives.mjs was
--                  right, and is a vote for the movement itself
--   'searched'  -- they went and found something else, which is a much stronger
--                  signal, because it says none of our four was the answer
--
-- Nobody reads this table yet. W3 (engine/preferences.mjs) is the reader: an
-- exercise swapped away from three weeks running should stop being prescribed,
-- and the thing they keep reaching for should start being. Recording it now
-- means W3 opens with history instead of an empty table.
--
-- Self only. A swap is often a pain or an equipment story and neither is your
-- partner's business; the timeline already shows them what you DID.

create table if not exists exercise_swaps (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  entry_date date not null,
  planned_exercise text not null,
  chosen_exercise text not null,
  source text not null check (source in ('suggested', 'searched')),
  created_at timestamptz not null default now()
);

-- W3 reads this per person, newest first, and never scans the whole table.
create index if not exists exercise_swaps_email_created_idx
  on exercise_swaps (email, created_at desc);

alter table exercise_swaps enable row level security;

drop policy if exists "own exercise swaps read" on exercise_swaps;
create policy "own exercise swaps read" on exercise_swaps for select using (is_me(email));
drop policy if exists "own exercise swaps write" on exercise_swaps;
create policy "own exercise swaps write" on exercise_swaps for insert with check (is_me(email));
drop policy if exists "own exercise swaps update" on exercise_swaps;
create policy "own exercise swaps update" on exercise_swaps for update using (is_me(email)) with check (is_me(email));
drop policy if exists "own exercise swaps delete" on exercise_swaps;
create policy "own exercise swaps delete" on exercise_swaps for delete using (is_me(email));

select 'exercise_swaps ready' as result;

-- rollback
--   drop policy if exists "own exercise swaps read" on exercise_swaps;
--   drop policy if exists "own exercise swaps write" on exercise_swaps;
--   drop policy if exists "own exercise swaps update" on exercise_swaps;
--   drop policy if exists "own exercise swaps delete" on exercise_swaps;
--   drop index if exists exercise_swaps_email_created_idx;
--   drop table if exists exercise_swaps;
-- Safe to run: nothing else references this table, and no other table
-- references it. Dropping it loses the revealed-preference history and nothing
-- a plan is generated from today.
