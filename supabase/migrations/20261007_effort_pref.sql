-- How hard they like it, 2026-10-07. WRITTEN, NOT APPLIED.
--
-- Onboarding's duration screen now asks "How hard do you like it?" (High,
-- Medium, Low). It cannot go in profiles.intensity, which the app already
-- uses for the days tier (easy, steady, allin). The engine side that reads
-- it is being built separately; today's engine ignores it. Until this is
-- applied the client drops the field and retries (PENDING_PROFILE_COLUMNS).

alter table profiles add column if not exists effort_pref text
  check (effort_pref in ('low', 'medium', 'high'));
