-- Skip stretching. 2026-09-10.
--
-- The engine now returns a timed warm-up before every session and a timed
-- cool-down after it (workout.warmup, workout.cooldown; see
-- mo-knowledge/engine/mobility.mjs and CONTRACT.md). Mo's rule, same day:
-- "they can also use it to say skip stretching." This is where that answer
-- lives. The app sends it as payload.skip_stretching and the adapter strips
-- both blocks; a test asserts the plan underneath is byte for byte the plan
-- it would have been, so turning this on can never change a lift.
--
-- A boolean with a default, unlike profiles.limits, because "has not been
-- asked" and "did not turn it off" are the same answer here: everybody gets
-- the blocks until they say otherwise, and the question is one switch in
-- Setup rather than a sheet. research/11: 48% of people setting a 2026 goal
-- want mobility, flexibility or posture, so on by default is the honest
-- default, and the switch is for the other half.
--
-- Not a per-workout skip. Skipping today's cool-down is a tap on the screen
-- and is not recorded anywhere; this column is the person saying "never".
alter table profiles add column if not exists skip_stretching boolean not null default false;

comment on column profiles.skip_stretching is 'true strips the engine''s timed warm-up and cool-down from every generated workout (payload.skip_stretching); the lifts underneath do not change. Default false: on for everybody until they say otherwise';

-- The read policy this needs already exists: "couple can read profiles" is
-- can_see(email), and self writes its own row. No policy change.

select 'profiles.skip_stretching ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'profiles' and column_name = 'skip_stretching') as has_column;

-- rollback
-- alter table profiles drop column if exists skip_stretching;
-- Safe to run: nothing joins on it and no view reads it. Dropping it turns
-- the blocks back on for anybody who had turned them off, which is the state
-- every profile is in before this migration.
