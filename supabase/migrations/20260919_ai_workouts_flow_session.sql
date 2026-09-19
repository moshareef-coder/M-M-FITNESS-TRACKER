-- ai_workouts.cardio: a third shape in the same column, for the day that IS a yoga class.
-- 2026-09-19.
--
-- No schema change. The column is already jsonb and already nullable, so this
-- is here to keep the comment honest rather than to alter anything, and it is
-- safe to run twice.
--
-- 20260911_ai_workouts_cardio.sql added this column for the cardio the GOAL
-- asks for. 20260918_ai_workouts_cardio_session.sql added `session`, the day
-- itself when the day is a run. Since 2026-09-19 the engine also builds the day
-- when the only thing somebody ticked was Yoga or Pilates
-- (mo-knowledge/engine/styles.mjs, flowSessionFor and styleDayFor). Before that
-- those two were refused out loud: the response said "mobility work is not
-- something this plan can build for you yet" and handed back five lifts to
-- somebody who had told us they do not lift. The moves were in
-- knowledge/exercise-library the whole time.
--
-- Three shapes now live here, told apart by their own keys:
--
--   {
--     "sessions": int, "minutes": int, "zone": "easy"|"moderate"|"hard"|"mixed",
--     "session": { "name": text, "mode": text, "minutes": int,
--                  "effort": 1..10, "cue": text, "structure": json|null },
--     "flow": { "training": "yoga"|"pilates", "label": text,
--               "style": { "key": text, "label": text }|null, "level": text,
--               "minutes": int, "seconds": int, "rounds": int,
--               "moves": [ { "name": text, "seconds": int, "perSide": bool,
--                            "round": int, "category": text|null, "cue": text|null } ],
--               "notes": text[] }
--   }
--
-- Any half can be absent. A lifting day under a goal that asks for cardio has
-- the weekly keys and neither session; a run has `session`; a yoga or Pilates
-- day has `flow`; a day with none of them is still null. `session` and `flow`
-- are never both present, because a day is one session.
--
-- THE COLUMN'S NAME IS NOW THE WEAKEST THING ABOUT IT and this comment is
-- where that is admitted rather than in a bug report later. A mat class is not
-- cardio. What this column really holds is "what this day asks for that is
-- never a set", and `session` would have been the right name for it in
-- September. It is not renamed here because a rename is a migration plus every
-- reader in a 23,000 line file, to buy a better word.
--
-- The alternative home considered and rejected was `mobility`, which is much
-- closer in meaning: it is already the column for timed blocks that must never
-- be logged as sets. It loses on a real trap rather than on taste. planMobility()
-- in index.html rebuilds that object key by key, so an unknown key on it does
-- not survive the next write, and "Skip stretching" on a yoga day would have
-- silently deleted the class.
--
-- One column rather than a new one, for the reason the last one gives:
-- supabase-js rejects the whole upsert on an unknown column and does not throw
-- while doing it, so a write against a column before this file has been run
-- would fail the save and cost somebody the plan they just generated. Nothing
-- reads `flow` before it is written, and nothing that reads the other two keys
-- changes.

comment on column ai_workouts.cardio is 'what this day asks for that is never a set, three shapes in one object: { sessions, minutes, zone } is the weekly cardio prescription the goal asks for; { session: { name, mode, minutes, effort, cue, structure } } is the day itself when the day is a run; { flow: { training, label, style, level, minutes, seconds, rounds, moves, notes } } is the day itself when it is a yoga or Pilates class. Any half may be absent and session and flow are never both present. Advisory, never logged as sets';

select 'ai_workouts.cardio comment updated' as result,
       col_description('ai_workouts'::regclass,
         (select ordinal_position from information_schema.columns
          where table_name = 'ai_workouts' and column_name = 'cardio')::int) as comment;

-- rollback
-- comment on column ai_workouts.cardio is 'cardio on this plan, two shapes in one object: { sessions, minutes, zone } is the weekly prescription the goal asks for; { session: { name, mode, minutes, effort, cue, structure } } is the day itself when the day is a run. Either half may be absent. Advisory, never logged as sets';
