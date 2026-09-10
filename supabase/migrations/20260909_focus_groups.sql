-- Body focus, 2026-09-09.
--
-- The body picker already lets you tap a muscle, turn the figure round and
-- zoom into it. Until now that selection lived in one variable in the viewer
-- and died when the sheet closed, so the thing somebody deliberately reached
-- for reached nothing. Two columns give it somewhere to go, and the workout
-- engine reads them: mo-knowledge/engine/focus.mjs flattens whatever is stored
-- here to the app's fourteen muscle groups and hands them to the plan, where
-- a prioritised group earns 1.4x its weekly sets.
--
-- Nullable and with no default, because "has not picked" and "picked nothing"
-- are different answers and only the first one is true of everybody today.
-- text[] rather than a join table: it is at most four short keys, it is read
-- on every generate and written when a sheet closes, and nothing ever queries
-- across users by it.
alter table profiles add column if not exists focus_groups text[];
alter table profiles add column if not exists focus_chosen_at timestamptz;

comment on column profiles.focus_groups is 'muscle groups picked on the body map, at most four; the engine gives each one extra weekly sets';
comment on column profiles.focus_chosen_at is 'when that pick was made, so a choice older than 60 days can be reported as stale rather than trusted forever';

-- The read policy these need already exists: "couple can read profiles" is
-- can_see(email), and self writes its own row. So no policy changes, and a
-- partner seeing which muscles you are chasing is the same exposure as the
-- body impact tab they can already open.

select 'profiles.focus_groups ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'profiles' and column_name in ('focus_groups', 'focus_chosen_at')) as has_columns;

-- rollback
-- alter table profiles drop column if exists focus_groups;
-- alter table profiles drop column if exists focus_chosen_at;
