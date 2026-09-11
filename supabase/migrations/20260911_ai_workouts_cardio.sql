-- ai_workouts.cardio: the cardio the goal asks for, alongside the lifting.
-- 2026-09-11.
--
-- resolveGoal has returned a cardio prescription since the engine's first run
-- and plan.cardio has carried it ever since, and it never left the engine. So
-- somebody whose goal is to lose weight was being prescribed two easy thirty
-- minute sessions a week by a system that told nobody. Mo, 2026-09-11: "if my
-- goal is to lose weight, will it tell me hey you need to run on a treadmill?"
--
-- Shape, exactly:
--
--   { "sessions": int, "minutes": int, "zone": "easy" | "moderate" | "hard" }
--
-- Weekly, not per day: it is how much cardio the week wants, written on each
-- generated plan because that is the screen where somebody reads what they are
-- meant to do. Kept out of `exercises` for the same reason the stretching is:
-- everything that iterates that array treats an entry as sets of a lift.
--
-- Nullable and no default. Null means the goal asks for none, or the row was
-- written before this column existed, and both render as nothing.
alter table ai_workouts add column if not exists cardio jsonb;

comment on column ai_workouts.cardio is 'weekly cardio the goal asks for: { sessions, minutes, zone }; advisory, never logged as sets';

select 'ai_workouts.cardio ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'ai_workouts' and column_name = 'cardio') as has_column;

-- rollback
-- alter table ai_workouts drop column if exists cardio;
