-- ai_workouts.warnings: what the engine said out loud about the plan it built.
-- 2026-09-19.
--
-- The engine strips every movement that loads a joint somebody said hurts, and
-- when the library has nothing else that fills a slot it keeps one anyway and
-- says so:
--
--   "Goblet Squat, Step-Up and Leg Press are still in this week. The library
--    has nothing else that fills that slot, so go light, stop if it hurts, and
--    swap it out if it does not settle."
--
-- That sentence reached the app on the generate response and lived in a
-- JavaScript variable which died with the tab. Two things followed, both real.
-- Close the app and reopen it and today's plan still held three knee-loading
-- lifts with nothing said. And "Generate rest of week", which writes a row per
-- day without ever opening one, never set the variable at all, so a week built
-- in one tap warned nobody, not once. The row is what the plan is read back
-- from, so the warning belongs on the row.
--
-- Shape: an array of plain sentences, the engine's own words, already filtered
-- by the app to the two families that are a warning rather than an explanation
-- (the softened note above, and a goal's "run it past your own clinician
-- first"). Measured over 14,580 generated weeks on 2026-09-19: 99 note
-- families, 23 of them warnings and 76 explanations of what the split could not
-- fit. The explanations are not stored. Mo had them taken off the reveal in
-- September, nothing renders them, and keeping them would put a few kilobytes
-- on every one of the sixty rows the app reads at boot.
--
--   [ "Goblet Squat, Step-Up and Leg Press are still in this week. ...",
--     "This is general training guidance. If you are training around pain ..." ]
--
-- Since later on 2026-09-19 each entry is an object rather than a bare
-- sentence, { kind, text }, so the plan screen can order them (injury first)
-- and fold the rest: kinds are injury, days, secondary, frequency, equipment,
-- bodymap, missing, deload and progression, see planWarnings() in index.html.
-- A bare string in the array is still read, as an injury line, because that
-- was the only kind ever stored as one. The column is jsonb either way and
-- nothing here changes.
--
-- Not a fourth shape in `cardio`. That column already carries three
-- ({ sessions, minutes, zone }, { session } and { flow }) and
-- 20260919_ai_workouts_flow_session.sql already says its name is the weakest
-- thing about it. All three are the session this day IS; a warning about which
-- barbell lifts survived a bad knee is not cardio under any reading, and most
-- of the days that need it have no cardio on them at all.
--
-- Not recomputed on read either, which was the other candidate. The app could
-- ask joint-load.mjs which of this row's lifts load a hurt joint, but the
-- sentence claims more than that: that the library had nothing else for the
-- slot. Only the engine, which tried and failed to fill it, can say that. An
-- app that printed it would be asserting a fact it never established.
--
-- Nullable and no default. A row written before this column existed, and a row
-- written by a client that predates it, are the same case: no warnings. The app
-- reads a missing array as none.
--
-- One thing to know before reading a row: the sentence is about the WEEK the
-- engine built ("... are still in this week"), and this table stores one day of
-- that week per row, so the movements it names are often on a different day.
-- That is the point of it. warningsForPlan() in index.html prints it on any day
-- of that week and on no day with an empty `exercises`, which is what a yoga
-- class or a day somebody emptied by hand looks like.
alter table ai_workouts add column if not exists warnings jsonb;

comment on column ai_workouts.warnings is 'the engine''s plan level warnings for this day, as an array of sentences in its own words: a movement kept despite a joint the person said hurts ("... go light, stop if it hurts ..."), or a goal that wants a clinician. Advisory text only, never rendered as sets';

-- Policies: ai_workouts is read by can_see and written by self already, so a
-- new column on the same row needs nothing.

-- Until this is run, index.html's upsert retries once without the field
-- (PostgREST answers an unknown column with PGRST204 and rejects the whole
-- payload), so a live app against a database without the column still saves the
-- plan and still warns for the sitting. Nothing breaks either side of this.

select 'ai_workouts.warnings ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'ai_workouts' and column_name = 'warnings') as has_column;

-- rollback
-- alter table ai_workouts drop column if exists warnings;
-- Safe to run: nothing joins on it and no view reads it. Dropping it loses the
-- warnings on already generated days and puts the app back where it was, one
-- sitting at a time; the next generate writes new ones.
