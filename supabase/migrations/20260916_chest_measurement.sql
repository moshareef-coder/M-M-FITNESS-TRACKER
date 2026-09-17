-- Chest measurement, 2026-09-16. NOT YET APPLIED.
--
-- Build Muscle on Progress leads with Weight, Chest, Arms and Thighs. Three of
-- those already exist: weight has been on fit_entries since the beginning, and
-- arm_in and thigh_in arrived with 20260916_body_measurements.sql. Chest is the
-- one part of that screen with nothing behind it, because Tone Up never asked
-- for it: a waist goes down and a chest goes up, and until this screen existed
-- there was no goal that cared which.
--
-- Same shape and the same reasoning as the other four: one nullable column on
-- fit_entries rather than a table, because a measurement is a thing you took on
-- a day and the day row already exists with the (email, entry_date) uniqueness
-- the app's upsert relies on. Inches. Nullable with no default, so "did not
-- measure" stays null the way a day without a weigh-in is.
alter table fit_entries add column if not exists chest_in numeric;

comment on column fit_entries.chest_in is 'chest circumference in inches, taken that day; null when not measured. Read by the Build Muscle screen on Progress and logged from the same check-in sheet as the other four';

-- No policy changes. RLS on fit_entries is row level, so a partner who can
-- already read the day row can read this column on it, which is the intended
-- behaviour: a chest measurement is the same class of thing as the weigh-in
-- beside it, and that is already shared.
