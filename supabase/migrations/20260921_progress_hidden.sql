-- profiles.progress_hidden: which Progress cards stay off a partner's screen.
-- 2026-09-21.
--
-- Mo: "I would like to show my partner best lifts, but I wouldn't like to
-- show him weekly volume... there should be like maybe a ticker or something
-- to be able to show" the individual cards, not just the whole category.
--
-- share_workout_details already exists and is coarse: off, and Best Lifts,
-- Weekly Volume and the muscle figure all go dark together. This is the
-- finer layer underneath it, an array of TRACK_ALL keys (the same keys
-- "Choose what to track" already uses, e.g. "volume", "lifts",
-- "cardio_min") that stay hidden from a partner even while the category
-- switch above is on. It only ever applies to cards share_workout_details
-- already permits; turning it off still hides everything it always hid.
--
-- Absence means shared, matching the app's own rule for every switch like
-- this: an account that never opens the new picker shows a partner exactly
-- what it always has, nothing changes for anybody until they touch it.
--
-- Deliberately not for weight and the tape (share_weigh_ins is that
-- question, and stays that question) and not for photos (never shared
-- either way, unconditionally, elsewhere in the code). This column is
-- scoped to the workout-activity cards only: Best Lifts, Weekly Volume,
-- Workouts a week, Cardio sessions, Cardio minutes, Distance, Mobility
-- sessions, Walks.

alter table public.profiles
  add column if not exists progress_hidden jsonb;

comment on column public.profiles.progress_hidden is
  'Array of TRACK_ALL keys hidden from this account''s partner on the Progress tab, layered under share_workout_details. Null or empty means share_workout_details''s own default: everything it permits is shown.';

select 'profiles.progress_hidden ready' as result,
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'progress_hidden') as has_column;

-- rollback
--   alter table public.profiles drop column if exists progress_hidden;
-- Safe at any time: the app treats the missing column as "nothing hidden",
-- and the retry path in upsertGoalFields/commitProfile drops the field from
-- the write the same way it already does for style_frequency and the rest
-- of PENDING_PROFILE_COLUMNS.
