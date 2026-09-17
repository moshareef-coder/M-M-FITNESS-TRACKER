-- Waist measurements, 2026-09-16. NOT YET APPLIED.
--
-- Progress grew a "Waist Trend" tile next to Body Photos, and until this runs
-- there is nothing behind it: the app has never stored a tape measurement
-- anywhere. The tile is honest about that (it reads "Add a measurement" and a
-- save comes back PGRST204, which the app turns into "Measurements are not
-- switched on yet") but honest-and-empty is not the feature.
--
-- One nullable column on fit_entries rather than a new table, for the same
-- reason weight lives there: a measurement is a thing you took on a day, and
-- the day row already exists, already carries weight, and already has the
-- (email, entry_date) uniqueness the app's upsert relies on. A second table
-- keyed the same way would be a second copy of that row's identity.
--
-- Inches, as the name says. The app is imperial everywhere else (weight is
-- lbs, the picker steps in 0.5 lb), and a bare `waist` column would have been
-- read as centimetres by the next person for certain. Nullable with no
-- default: "did not measure" is null, the way a day without a weigh-in is.
alter table fit_entries add column if not exists waist_in numeric;

comment on column fit_entries.waist_in is 'waist circumference in inches, taken that day; null when not measured. Read by the Waist Trend tile on Progress over the same 30 day window as the weight headline';

-- No policy changes, and read this before deciding that is fine: RLS on
-- fit_entries is ROW level ("own or visible entries only" in
-- 20260911_rls_hardening.sql), so a partner who can already read your day row
-- can read this column on it too. That is the intended behaviour, a waist
-- reading is the same class of thing as the weigh-in beside it, which is
-- already shared. If that ever stops being true this needs its own table
-- with its own policy, not a column here, because a policy cannot hide one
-- column of a visible row.
