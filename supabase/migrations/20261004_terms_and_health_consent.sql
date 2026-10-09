-- Recording what people agreed to, 2026-10-04.
--
-- The legal review (Argus, 2026-10-04) found two things nobody could prove later:
-- that somebody agreed to the terms (the only notice was small grey text under the
-- sign-in buttons, and nothing was stored), and that anybody saw a health warning
-- before training (it lived only in the terms). It also found that Washington's My
-- Health My Data Act wants opt-in consent before collecting health information, and
-- weight, tape, what hurts and progress photos all count.
--
-- index.html now asks for all three and writes them here. It writes only once these
-- columns exist ("terms_version" in MY_PROFILE), so the app is safe to ship before
-- this runs: until then the answers stay on the device and nobody is asked twice.
--
-- terms_version      which version of the Terms of Use and Privacy Policy they agreed to
--                    (TERMS_VERSION in index.html). A different value asks them again.
-- terms_accepted_at  when. Not "first seen": the moment of the tick or the Agree tap.
-- health_ack_at      when they ticked "I understand, and I train at my own risk".
-- health_consent_at  when they agreed to Unio storing their health information.
--
-- profiles already lets a person update only their own row (is_me(email)), so no new
-- policy is needed. A partner can read these columns like the rest of the row, and
-- they say only that, and when, somebody agreed: nothing about their health.

alter table profiles add column if not exists terms_version text;
alter table profiles add column if not exists terms_accepted_at timestamptz;
alter table profiles add column if not exists health_ack_at timestamptz;
alter table profiles add column if not exists health_consent_at timestamptz;

comment on column profiles.terms_version is
  'Version of the Terms of Use and Privacy Policy this person agreed to (TERMS_VERSION in index.html). Added 2026-10-04 with terms_accepted_at.';
comment on column profiles.health_consent_at is
  'When this person agreed to Unio storing their health information (Washington My Health My Data Act opt-in). Added 2026-10-04.';

select 'agreement columns ready' as result,
       (select count(*) from information_schema.columns
         where table_schema = 'public' and table_name = 'profiles'
           and column_name in ('terms_version','terms_accepted_at','health_ack_at','health_consent_at')) as columns_present;
