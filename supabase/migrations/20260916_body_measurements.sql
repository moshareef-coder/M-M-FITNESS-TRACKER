-- Body measurements, 2026-09-16. NOT YET APPLIED.
--
-- Tone Up on Progress is a measurements screen: Waist, Hips, Thighs and Arms
-- as chips over one chart, and one "Log measurements" sheet that writes all
-- four. waist_in already exists (20260916_waist_measurements.sql, also not
-- yet applied) and is NOT re-added here; this file is the other three. Run
-- the waist file first, or both in one sitting, the app treats the four as
-- one feature and turns any PGRST204 from a missing column into
-- "Measurements are not switched on yet".
--
-- Same shape as waist and for the same reasons: nullable columns on
-- fit_entries rather than a table, because a measurement is a thing you took
-- on a day and the day row already exists with the (email, entry_date)
-- uniqueness the app's upsert relies on. Inches, one value each. Thighs and
-- arms are taken on one side (whichever you always use), not averaged and not
-- stored per side: two columns per limb doubles the tape work for a trend
-- that reads the same either way, and a person who measures both can log the
-- bigger one every time and still get an honest line. Nullable with no
-- default, so "did not measure" is null, the way a day without a weigh-in is.
alter table fit_entries add column if not exists hips_in numeric;
alter table fit_entries add column if not exists thigh_in numeric;
alter table fit_entries add column if not exists arm_in numeric;

comment on column fit_entries.hips_in is 'hip circumference in inches, taken that day; null when not measured. Read by the Tone Up measurements screen on Progress';
comment on column fit_entries.thigh_in is 'thigh circumference in inches, one side, taken that day; null when not measured. Read by the Tone Up measurements screen on Progress';
comment on column fit_entries.arm_in is 'upper arm circumference in inches, one side, taken that day; null when not measured. Read by the Tone Up measurements screen on Progress';

-- No policy changes, and read this before deciding that is fine: RLS on
-- fit_entries is ROW level ("own or visible entries only" in
-- 20260911_rls_hardening.sql), so a partner who can already read your day row
-- can read these columns on it too. That is the intended behaviour, a tape
-- reading is the same class of thing as the weigh-in beside it, which is
-- already shared. If that ever stops being true this needs its own table
-- with its own policy, not columns here, because a policy cannot hide one
-- column of a visible row.
