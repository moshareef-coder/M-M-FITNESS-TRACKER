-- Push subscriptions and nudges, 2026-09-03.
--
-- sw.js has handled `push` and `notificationclick` since the PWA went in, but
-- nothing ever subscribed and nothing ever sent. This adds the two missing
-- halves: somewhere to keep a subscription, and a record of what we sent so a
-- retry or an overlapping cron run cannot nag someone twice.

create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz,
  failures    int not null default 0
);

create index if not exists push_subscriptions_email_idx on push_subscriptions (lower(email));

alter table push_subscriptions enable row level security;

-- Your own devices only. Nobody else needs to see where your phone lives, and
-- `email` is the only column deciding ownership, so a with-check of is_me is
-- enough on its own here.
create policy "self reads own subscriptions" on push_subscriptions
  for select using (is_me(email));
create policy "self adds a subscription" on push_subscriptions
  for insert with check (is_me(email));
create policy "self updates own subscription" on push_subscriptions
  for update using (is_me(email)) with check (is_me(email));
create policy "self removes own subscription" on push_subscriptions
  for delete using (is_me(email));

-- What we have already sent. One nudge of a given kind per person per day.
create table if not exists nudge_log (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  kind       text not null,
  sent_on    date not null default current_date,
  created_at timestamptz not null default now()
);

create unique index if not exists nudge_log_once_a_day
  on nudge_log (lower(email), kind, sent_on);

-- Deliberately RLS on with no policies, the same pattern as ai_usage_log: only
-- the service role touches this. A user who could read or delete their own
-- nudge history could make us send the same nudge repeatedly.
alter table nudge_log enable row level security;

-- Nudges have to arrive in the evening where the person actually is, and we
-- have never recorded that. Captured from the browser on sign-in.
alter table profiles add column if not exists timezone text;


-- Hourly, because "evening" means a different moment for each person and the
-- function decides who is actually at 18:00 right now.
--
-- The shared secret is lifted from the existing job rather than pasted in, so
-- it stays inside the database. Vault is unavailable on this project, which is
-- why expire-proof-photos carries its secret inline in the first place.
do $$
declare secret text;
begin
  select (regexp_match(command, 'Bearer ([A-Za-z0-9_\-]+)'))[1]
    into secret from cron.job where jobname = 'expire-proof-photos';

  if secret is null then
    raise exception 'could not read the cron secret from expire-proof-photos';
  end if;

  perform cron.unschedule('send-nudges') where exists (select 1 from cron.job where jobname = 'send-nudges');

  perform cron.schedule('send-nudges', '0 * * * *', format($job$
    select net.http_post(
      url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/send-nudges',
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer %s'),
      body := '{}'::jsonb);
  $job$, secret));
end $$;

select jobname, schedule, active from cron.job order by jobname;

select 'push and nudges ready' as result,
       (select count(*) from information_schema.columns where table_name = 'push_subscriptions') as sub_columns,
       (select count(*) from pg_policies where tablename = 'push_subscriptions') as sub_policies,
       (select count(*) from information_schema.columns where table_name = 'nudge_log') as log_columns,
       (select count(*) from information_schema.columns
          where table_name = 'profiles' and column_name = 'timezone') as tz_column;
