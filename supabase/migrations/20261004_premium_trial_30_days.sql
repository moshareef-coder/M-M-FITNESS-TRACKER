-- Thirty days of premium, free, for every account, 2026-10-04.
--
-- WRITTEN, NOT APPLIED. Run it when the long onboarding (ONBOARDING_V2) ships and not
-- before: the app on people's phones says nothing about the length, but the new
-- onboarding promises thirty days, and the two must change on the same day.
--
-- The only change from 20260917_premium_trial.sql is the interval, 7 days to 30 days.
-- Same rules otherwise: no card, no store purchase, anchored to profiles.created_at,
-- and only your OWN account's age counts, so pairing with a brand new account can
-- never refresh a trial. Paid subscriptions, yours or your partner's, answer exactly
-- as before.
--
-- WHAT HAPPENS TO EXISTING ACCOUNTS. The trial is computed, not stored, so this takes
-- effect for everybody the moment it runs:
--   - accounts under 7 days old: their trial simply runs to day 30 instead of day 7.
--   - accounts 8 to 30 days old, whose free week has already ended and who have not
--     subscribed: premium comes BACK on, until their account is 30 days old. The
--     generator, the week planner, body impact and the progress analysis unlock again
--     without anybody asking. Nothing is charged, nothing is written, and nobody is told
--     unless we tell them, so a short note to those accounts is worth sending.
--   - accounts older than 30 days: no change.
--   - anybody with a paid subscription: no change.
-- There is no billing anywhere in this: on day 30 the features lock again and the
-- person chooses whether to subscribe. Nothing renews or charges by itself.
create or replace function is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1
        from subscriptions s
       where s.status in ('active', 'grace')
         and (s.expires_at is null or s.expires_at > now())
         and (lower(s.email) = my_email() or lower(s.email) = my_partner_email())
    )
    or
    exists (
      select 1
        from profiles p
       where lower(p.email) = my_email()
         and p.created_at > now() - interval '30 days'
    );
$$;

-- Verify: expect true.
select position('30 days' in pg_get_functiondef('public.is_premium'::regproc)) > 0 as trial_is_30_days;
