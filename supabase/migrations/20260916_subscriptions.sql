-- Premium, and the fact that it covers two people, 2026-09-16.
--
-- The agreed product is $5 a month for a pair, paid by one of them
-- (2026-09-01 strategy meeting). That single sentence is the whole reason this
-- file exists rather than a boolean on profiles: the thing being sold is not a
-- seat, it is a partnership, and an entitlement that belongs to whoever tapped
-- Subscribe would leave the other person locked out of something they are paid
-- up for. They would then buy it again, and we would have taken ten dollars for
-- a five dollar product.
--
-- So the row records who paid, and the question the app asks is never "did you
-- pay". It is "is anybody in your partnership paid up", which is what
-- is_premium() answers.
--
-- Written for RevenueCat as the source of truth. The app never writes here from
-- the client, because a client that can grant itself premium has not got a
-- paywall, it has got a suggestion. Rows arrive from RevenueCat's webhook with
-- the service role, and the client only ever reads.

create table if not exists subscriptions (
  email            text primary key,
  -- RevenueCat's identifier for the person, kept so a webhook can be traced
  -- back to a row without guessing from the email alone.
  rc_app_user_id   text,
  -- What they are entitled to. One entitlement today; named rather than boolean
  -- so a second tier later is a new value instead of a new column.
  entitlement      text not null default 'premium',
  -- Apple's word, not ours: active, in a grace period, billing retry, expired.
  status           text not null default 'active',
  -- When access actually ends. Null means it does not, which is what a lifetime
  -- or a comped account looks like.
  expires_at       timestamptz,
  store            text,          -- app_store, play_store, stripe
  updated_at       timestamptz not null default now(),
  created_at       timestamptz not null default now()
);

create index if not exists subscriptions_active
  on subscriptions (lower(email)) where status in ('active', 'grace');

alter table subscriptions enable row level security;

-- Read your own row, and nothing else. Reading your partner's is not needed:
-- is_premium() answers the only question worth asking and does it server side,
-- so the app never has to see what somebody else paid.
drop policy if exists "read your own subscription" on subscriptions;
create policy "read your own subscription" on subscriptions
  for select using (is_me(email));

-- Deliberately no insert, update or delete policy. Only the service role
-- writes, which means only RevenueCat's webhook does.

-- ---------------------------------------------------------------------------
-- The question the app actually asks.
-- ---------------------------------------------------------------------------

create or replace function is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
      from subscriptions s
     where s.status in ('active', 'grace')
       and (s.expires_at is null or s.expires_at > now())
       and (
         -- me
         lower(s.email) = my_email()
         -- or the person I am paired with, because the pair is what was sold
         or lower(s.email) = my_partner_email()
       )
  );
$$;

revoke all on function is_premium() from public;
grant execute on function is_premium() to authenticated;

-- A grace period is still premium, and that is a deliberate kindness rather
-- than an oversight. Apple retries a failed renewal for up to sixteen days, and
-- somebody whose card expired has not decided to leave: cutting them off on day
-- one of a retry loses a customer over a bank's timing.

select 'subscriptions ready' as result,
       (select count(*) from pg_tables where tablename = 'subscriptions') as table_created,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'is_premium') as fn_created;
