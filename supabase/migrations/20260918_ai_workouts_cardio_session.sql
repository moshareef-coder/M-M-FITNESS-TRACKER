-- ai_workouts.cardio: a second shape in the same column, for the day that IS a run.
-- 2026-09-18.
--
-- No schema change. The column is already jsonb and already nullable, so this
-- is here to keep the comment honest rather than to alter anything, and it is
-- safe to run twice.
--
-- 20260911_ai_workouts_cardio.sql added this column for the cardio the GOAL
-- asks for: weekly, advisory, true of every day of the week alike. Since
-- 2026-09-18 the engine also builds the day itself when somebody ticked no
-- resistance style (mo-knowledge/engine/styles.mjs, cardioSessionFor), and that
-- day comes back as `workout.cardio` with the minutes, the effort and the cue
-- on it and `exercises` empty, because a run has no sets. None of that was
-- being written: the engine built a 25 minute Easy Run with a pace cue and the
-- row came back from the database with the name and nothing else.
--
-- Both shapes now live here, told apart by their own keys:
--
--   {
--     "sessions": int, "minutes": int, "zone": "easy"|"moderate"|"hard"|"mixed",
--     "session": { "name": text, "mode": text, "minutes": int,
--                  "effort": 1..10, "cue": text, "structure": json|null }
--   }
--
-- Either half can be absent. A lifting day under a goal that asks for cardio
-- has the weekly keys and no `session`; a run under a goal that asks for none
-- has `session` and nothing else; a day with neither is still null.
--
-- One column rather than a new one on purpose. supabase-js rejects the whole
-- upsert on an unknown column and does not throw while doing it, so shipping a
-- write against a column before this file has been run would fail the save and
-- cost somebody the plan they just generated. Nothing about the weekly half
-- moves, and the one reader of it (cardioNoteHTML) gates on `sessions`, so a
-- run-only row correctly prints no weekly advice.

comment on column ai_workouts.cardio is 'cardio on this plan, two shapes in one object: { sessions, minutes, zone } is the weekly prescription the goal asks for; { session: { name, mode, minutes, effort, cue, structure } } is the day itself when the day is a run. Either half may be absent. Advisory, never logged as sets';

select 'ai_workouts.cardio comment updated' as result,
       col_description('ai_workouts'::regclass,
         (select ordinal_position from information_schema.columns
          where table_name = 'ai_workouts' and column_name = 'cardio')::int) as comment;

-- rollback
-- comment on column ai_workouts.cardio is 'weekly cardio the goal asks for: { sessions, minutes, zone }; advisory, never logged as sets';
