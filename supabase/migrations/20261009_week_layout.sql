-- The week they laid out by hand, 2026-10-09. WRITTEN, NOT APPLIED.
--
-- Onboarding's "How many of those for each?" screen now shows all seven days
-- and lets them drag every session to the day they want it (yoga on a rest
-- day included). Where each one landed is saved here: a weekday (0 is Monday,
-- 6 is Sunday) to the list of style ids on it, e.g.
--   {"0": ["lifting", "running"], "1": [], ..., "6": ["yoga"]}
--
-- generateTheWeek hands it to the engine's composeWeek, which builds that
-- exact week while it still matches train_styles, style_frequency and
-- days_per_week (styles.mjs readLayout) and places the week itself when it
-- does not. Until this is applied the client drops the field and retries
-- (PENDING_PROFILE_COLUMNS), so nothing breaks; the layout is just not kept.

alter table profiles add column if not exists week_layout jsonb
  check (week_layout is null or jsonb_typeof(week_layout) = 'object');
