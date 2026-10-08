-- What's stopping you, 2026-10-07. WRITTEN, NOT APPLIED.
--
-- The onboarding asks "What's stopping you?" (multi-select). The answer is
-- kept so the plan can read it later; how each barrier should change the plan
-- is being worked out separately, so nothing reads this column yet.
-- Values are the screen's ids: busy, consistency, alone, lost, bored, pain,
-- energy. Null means never asked; an empty list means asked, nothing ticked.
-- Until this is applied the client drops the field and retries
-- (PENDING_PROFILE_COLUMNS in index.html), so the order of deploys does not
-- matter.

alter table profiles add column if not exists barriers text[];
