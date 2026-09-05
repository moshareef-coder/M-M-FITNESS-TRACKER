-- Effort without exposure, 2026-09-05.
--
-- Some days you do not want your partner seeing the exercise, the muscles hit
-- or the plan, but you still want them to know you showed up and how hard
-- you went. One column, defaulting to sharing (today's behaviour unchanged).
-- The read policy for it already exists: "couple can read profiles" is
-- can_see(email), so nothing else needs to change for a partner to see this
-- flag on you. Applied directly to the live DB on 2026-09-05, this file
-- documents it and keeps a fresh environment in sync.
alter table profiles add column if not exists share_workout_details boolean not null default true;
