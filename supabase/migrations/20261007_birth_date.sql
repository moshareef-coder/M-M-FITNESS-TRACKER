-- Birth date, 2026-10-07. WRITTEN, NOT APPLIED.
--
-- Onboarding now asks "When were you born?" (three wheels) instead of an
-- age. profiles.age is still written, worked out from the date, so nothing
-- that reads age changes. The date is kept as well because an age typed once
-- is wrong a year later; with birth_date stored the app can work the age out
-- on the day. Until this is applied the client drops birth_date from the
-- write and retries (PENDING_PROFILE_COLUMNS in index.html), so applying it
-- is safe in either order.

alter table profiles add column if not exists birth_date date;
