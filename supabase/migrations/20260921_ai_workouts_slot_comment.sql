-- ai_workouts.slot: the comment said two, the day now holds three. 2026-09-21.
--
-- 20260917_ai_workouts_slot.sql made slot "0 is the day's main workout, 1 the
-- second session", which was the whole of what a day could hold when it was
-- written: a lift and one thing on top of it. It also assumed, in the
-- migration's own words, that only lifting plans were rows here. That is not
-- how the week builder writes a day: a planned run and a planned class are
-- ai_workouts rows too (planActivityOnDay in index.html, with the session
-- under `cardio`), which is what lets the plan screen say how long Thursday's
-- run is before Thursday.
--
-- Since the frequency dial a day may hold one of each kind, a lift, a cardio
-- session and a class, so slot 2 is now written. The column is a smallint
-- with no check on its value and the unique key is (email, entry_date, slot),
-- so NOTHING structural changes and nothing here needs to be run before the
-- app ships. This file exists because a comment that says "1 the second
-- session" over a table holding slot 2 is a comment that lies, and the next
-- person to read the schema deserves better than that.
--
-- Slots are ordinals within the day and not kinds: which row is the run is
-- read off the row (exercises empty, cardio present), never off the slot.

comment on column ai_workouts.slot is
  'which plan within the day, an ordinal: 0 is the day''s main workout, 1 and 2 the sessions placed beside it (a day holds at most one lift, one cardio session and one class). Unique with (email, entry_date).';

select 'ai_workouts.slot comment widened' as result;

-- rollback
--   comment on column ai_workouts.slot is
--     'which plan within the day: 0 is the day''s main workout, 1 the second session. Unique with (email, entry_date).';
