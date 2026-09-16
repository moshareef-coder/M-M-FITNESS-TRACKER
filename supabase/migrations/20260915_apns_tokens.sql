-- APNs device tokens, 2026-09-15.
--
-- push_subscriptions holds the Web Push shape (endpoint, p256dh, auth), which
-- is what a browser hands you. The native iOS build cannot use any of it: Web
-- Push does not work inside a WKWebView, so the wrapped app was storing nothing
-- and receiving nothing while the UI went on offering notifications. APNs
-- speaks in opaque device tokens instead, so it needs its own table rather than
-- columns bolted onto a row shaped for a different transport.

create table if not exists apns_tokens (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  token       text not null unique,
  -- A token minted against the sandbox gateway is rejected by the production
  -- one and the other way round, so the sender has to know which it is.
  environment text not null default 'development',
  created_at  timestamptz not null default now(),
  last_ok_at  timestamptz,
  failures    int not null default 0
);

create index if not exists apns_tokens_email_idx on apns_tokens (lower(email));

alter table apns_tokens enable row level security;

-- Same ownership rule as push_subscriptions: your own devices only.
create policy "self reads own apns tokens" on apns_tokens
  for select using (is_me(email));
create policy "self adds an apns token" on apns_tokens
  for insert with check (is_me(email));
create policy "self updates own apns token" on apns_tokens
  for update using (is_me(email)) with check (is_me(email));
create policy "self removes own apns token" on apns_tokens
  for delete using (is_me(email));
