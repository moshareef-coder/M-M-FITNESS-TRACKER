-- Cardio distance, 2026-09-16. NOT YET APPLIED.
--
-- Build Endurance on Progress is a distance screen: Run, Walk and Cycle as
-- chips over one line of weekly miles, a target band beside it, and an average
-- pace. exercise_logs already carries duration_min, which is how a timed block
-- is logged today, so minutes and Workout Consistency work right now. Nothing
-- in this app has ever stored how FAR anybody went, so distance, pace and the
-- whole hero of that screen have nothing behind them until this runs.
--
-- One nullable column on exercise_logs rather than a new table, for the same
-- reason duration_min lives there: a run is an exercise somebody did on a day,
-- and that row already exists with the name, the date and the minutes on it. A
-- cardio-only table would be a second copy of the same identity and would have
-- to be joined back for every screen that already reads exercise_logs.
--
-- Miles, as the name says. The app is imperial everywhere else (pounds, inches)
-- and a bare `distance` would be read as kilometres by the next person for
-- certain. Nullable with no default, so a lifting set is null here the same way
-- a run is null in `weight`, and "did not measure" stays distinguishable from
-- zero miles.
alter table exercise_logs add column if not exists distance_mi numeric;

comment on column exercise_logs.distance_mi is 'distance covered in miles for a cardio log; null for anything that is not a distance activity. Read by the Build Endurance screen on Progress, which pairs it with duration_min to get pace';

-- No policy changes. RLS on exercise_logs is row level, so whoever can already
-- read the log row can read this column on it, which is the intended
-- behaviour: a distance is the same class of thing as the minutes beside it.
-- share_workout_details still gates the Progress cards that surface it.
