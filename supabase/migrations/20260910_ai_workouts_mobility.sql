-- ai_workouts.mobility: the warm-up and cool-down a generated day came with.
-- 2026-09-10.
--
-- The engine now returns workout.warmup and workout.cooldown beside
-- workout.exercises (mo-knowledge/engine/CONTRACT.md), timed moves rather than
-- sets. The app writes the row on generate and reads it back on every open
-- of the plan and every session, so the two blocks need somewhere to live or
-- they exist only as long as the reveal sheet does. One jsonb column rather
-- than two, because they are one answer given at one moment and are read
-- together or not at all, same reasoning as profiles.limits. Shape, exactly:
--
--   {
--     "warmup":   [ { name, seconds, perSide, cue, group, kind } ],
--     "cooldown": [ { name, seconds, perSide, cue, group, kind } ],
--     "skipped":  bool      -- a tap on the day's block, not the profile switch
--   }
--
-- Not folded into `exercises`, deliberately: everything that iterates that
-- array (the session, the plan preview, the swap sheet, the muscle credit,
-- exercise_logs) treats an entry as sets of a lift, and a thirty second
-- hamstring hold is none of those. A stretch must never become a logged set:
-- it would light the Body tab and tell recovery a muscle was worked when it
-- was only loosened.
--
-- Nullable and no default, because rows written before this column exist and
-- rows written by a client that predates it are the same case, "no blocks",
-- and the app treats null exactly like two empty arrays.
alter table ai_workouts add column if not exists mobility jsonb;

comment on column ai_workouts.mobility is 'the engine''s timed warm-up and cool-down for this day: { warmup: [...], cooldown: [...], skipped: bool }; never sets, never logged to exercise_logs';

-- Policies: ai_workouts is read by can_see and written by self already; a
-- new column on the same row needs nothing.

select 'ai_workouts.mobility ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'ai_workouts' and column_name = 'mobility') as has_column;

-- rollback
-- alter table ai_workouts drop column if exists mobility;
-- Safe to run: nothing joins on it and no view reads it. Dropping it loses
-- the blocks on already generated days; the next generate writes new ones.
