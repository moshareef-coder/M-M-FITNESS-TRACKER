-- The trial reminder, 2026-10-07.
--
-- WRITTEN, NOT APPLIED. Run it BEFORE deploying the new revenuecat-webhook: the
-- webhook now writes the columns below, and against the old table every event
-- would fail with a 500 and RevenueCat would sit retrying.
--
-- The paywall now runs Apple's one month free trial and promises "I'll remind
-- you your trial is ending" two days before the end. That promise is only true
-- if the server knows three things it did not record until now: that the
-- current period is a trial rather than a paid month, that the person has not
-- already cancelled, and that we have not reminded them before. The first two
-- come from RevenueCat's webhook; the third is trial_reminders.
--
-- Safe to run twice.

-- What RevenueCat says about the current period. Nullable on purpose: the six
-- rows that exist today came from events before these columns did, and a null
-- period_type is never mistaken for a trial, so nobody old gets reminded.
alter table subscriptions add column if not exists period_type text;              -- TRIAL, INTRO, NORMAL, PROMOTIONAL
alter table subscriptions add column if not exists will_renew boolean;            -- false once they cancel in Settings
alter table subscriptions add column if not exists original_transaction_id text;  -- one per Apple ID per subscription
alter table subscriptions add column if not exists environment text;              -- SANDBOX or PRODUCTION
alter table subscriptions add column if not exists last_event_ms bigint;          -- newest event applied, for ordering

-- One reminder per trial, ever. Claimed BEFORE sending, so a retry, a slow run
-- overlapping the next one, or somebody invoking the function by hand cannot
-- send twice: the second insert hits this index and the sender skips.
-- trial_key is Apple's original_transaction_id, which is one per Apple ID per
-- subscription group, and Apple gives the intro offer once per group, so it
-- names exactly one trial.
create table if not exists trial_reminders (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  trial_key   text not null,
  expires_at  timestamptz,
  sent_at     timestamptz not null default now(),
  delivered   int not null default 0
);

create unique index if not exists trial_reminders_once
  on trial_reminders (lower(email), trial_key);

-- RLS on with no policies, the same as nudge_log: only the service role reads
-- or writes it. A person who could delete their row could get reminded again.
alter table trial_reminders enable row level security;

-- Hourly, at seven past so it does not land on the same minute as send-nudges.
-- Hourly rather than daily because "two days before" and "a sensible hour"
-- both depend on where the person is, and the function decides that per
-- person. The secret comes from vault, the same as every other job here.
select cron.unschedule('trial-reminder')
  where exists (select 1 from cron.job where jobname = 'trial-reminder');

select cron.schedule('trial-reminder', '7 * * * *', $j$
  select net.http_post(
    url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/trial-reminder',
    headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || cron_secret()),
    body := '{}'::jsonb);
$j$);

-- Verify: expect 5, true, true, true.
select (select count(*) from information_schema.columns
          where table_schema = 'public' and table_name = 'subscriptions'
            and column_name in ('period_type','will_renew','original_transaction_id','environment','last_event_ms')) as new_columns,
       (select count(*) from pg_tables where tablename = 'trial_reminders') = 1 as reminders_table,
       (select relrowsecurity from pg_class where relname = 'trial_reminders') as reminders_rls,
       (select count(*) from cron.job where jobname = 'trial-reminder' and command like '%cron_secret()%') = 1 as cron_job;
