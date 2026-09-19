-- What an activity session actually contained, 2026-09-19. NOT YET APPLIED.
--
-- Mo, opening a finished yoga class from the recap: "it would show me the
-- exercise that I did for yoga, or things that I haven't completed." It
-- cannot, and the reason is this table. saveCardioSession writes the name,
-- the date, the minutes and the miles, and then throws the session away:
-- CARDIO_SES is set to null and csnSave clears its localStorage key on the
-- same line. The class that was built for that person, on that day, at the
-- level they were on, stops existing the moment it is saved. So the detail
-- screen can be honest about a past session or it can invent one, and it is
-- currently honest.
--
-- Replaying it later is not an option, and it is worth writing down why,
-- because buildGuidedPlan looks replayable: it is deterministic and seeded on
-- the date. But it is seeded on the date and keyed on TODAY's level (which
-- climbs as sessions accumulate) and on the minutes ASKED for (where the row
-- stores the minutes that elapsed). Replaying a June session today returns
-- the class a fitter person would be given now, for a length nobody chose.
-- That is a screen full of exercises somebody never did, which is worse than
-- an empty one.
--
-- One jsonb column rather than a table of moves. The session is a document
-- that is written once, read whole, and never queried across rows: nothing
-- asks "how many times has anybody done pigeon pose", and the day this app
-- does ask, that is a view over this column rather than a schema somebody
-- has to keep in step with a library that changes weekly.
--
-- Shape, which is the plan the screen already builds, plus how far the clock
-- got before Save was pressed:
--   { "kind": "yoga",
--     "asked_min": 20,
--     "reached": 7,
--     "moves": [ { "name": "Cat Cow", "sec": 45 }, ... ] }
-- `reached` is the index the live screen was on, which is the only completion
-- signal that exists: the session screen picks the current move from elapsed
-- milliseconds and never ticks anything off. So "you got to move 7 of 12" is
-- true and "you completed 7 moves" is not, and the UI says the first one.
-- Null for every row written before this, and for a session somebody started
-- from the bare clock rather than from a built class, which is a real thing
-- people do and not a missing value.

alter table exercise_logs add column if not exists session jsonb;

comment on column exercise_logs.session is
  'what a generated activity session contained, written once at save: {kind, asked_min, reached, moves[]}. Null for a plain timed session and for everything logged before 2026-09-19. Read by the activity detail in the recap.';

-- No policy change. RLS on exercise_logs is row level, so whoever can already
-- read the row reads this column on it, which is the same visibility the
-- minutes and the distance on that row already have.

select 'exercise_logs.session ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'exercise_logs' and column_name = 'session') as has_column;

-- Rollback:
-- alter table exercise_logs drop column session;
