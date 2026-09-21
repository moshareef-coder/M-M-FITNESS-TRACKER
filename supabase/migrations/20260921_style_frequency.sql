-- profiles.style_frequency: how often, beside what. 2026-09-21.
--
-- train_styles says WHAT a person is willing to do. Nothing said how often,
-- so the week builder gave every second style one day a week and the lifting
-- count came from days_per_week alone. Mo, 2026-09-21: "For the frequency
-- dial, we can do: every day / most days / sometimes / rarely... If they even
-- want to weightlift, run, and do yoga every single day, they can. Those are
-- 3 separate sessions."
--
-- One json column rather than a column per style, keyed by the same ids
-- train_styles holds, holding one of four words:
--   {"lifting": "most", "running": "some", "yoga": "rare"}
-- daily is every day, most is most days (five), some is sometimes (three),
-- rare is rarely (one). The engine (mo-knowledge/engine/styles.mjs,
-- normalizeFrequency) turns the words into days, and it is the engine's job
-- and not a check constraint's: a word this file does not know is dropped
-- there the way a typo in train_styles is, and pinning the vocabulary here
-- would mean a migration every time the dial grows a stop.
--
-- Null means never asked, and every account from before the dial is null.
-- The app reads null as the week it already had: the lifting count from
-- days_per_week, one day a week for each of the other ticked styles. So this
-- is additive and nothing changes for anybody until they turn a dial.
--
-- The resistance word is days_per_week said as a word, and the app keeps the
-- two in step in both directions (saveTrainingDays, saveTrainStyles). It is
-- not enforced here because the two live on different tables (user_goals
-- holds the count) and a trigger across them for a coarse copy of a number
-- would be more machinery than the copy is worth.
--
-- Additive and nullable. index.html carries the column name in
-- PENDING_PROFILE_COLUMNS, so on a database where this has not been run the
-- save retries without it and says so, rather than losing the row.

alter table public.profiles
  add column if not exists style_frequency jsonb;

comment on column public.profiles.style_frequency is
  'How often each ticked training style, keyed by style id, one of daily, most, some, rare. Null means never asked and reads as one day a week for every style but the lift.';

select 'profiles.style_frequency ready' as result,
       (select count(*) from information_schema.columns
        where table_schema = 'public' and table_name = 'profiles' and column_name = 'style_frequency') as has_column;

-- rollback
--   alter table public.profiles drop column if exists style_frequency;
-- Safe at any time: the app treats the missing column as "never asked" and
-- the retry in upsertGoalFields drops the field from the write.
