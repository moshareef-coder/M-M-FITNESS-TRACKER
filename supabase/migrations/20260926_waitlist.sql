-- The launch waitlist behind trainwithunio.com.
--
-- Unio is not on the App Store yet, and Android is not built at all, so the
-- marketing site's main call to action is "tell me when it lands". Emails used
-- to hand off to a mailto: link, which captured nothing unless the visitor
-- actually sent the draft. This stores them.
--
-- The site talks to this table directly with the publishable key, so the
-- whole security model is here: anyone may ADD a row, nobody outside the
-- service role may READ, change or delete one. The list is only ever read from
-- the dashboard or with the service key.

create table if not exists public.waitlist (
  id          bigint generated always as identity primary key,
  email       text not null
              check (char_length(email) between 5 and 254
                     and email ~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'),
  platform    text not null default 'ios' check (platform in ('ios', 'android')),
  -- which page or button it came from, so the list can say what works
  source      text check (source is null or char_length(source) <= 40),
  created_at  timestamptz not null default now()
);

-- One row per person per platform. Somebody on both lists is two rows, which
-- is the point: the Android launch mails the android rows only. The index is on
-- lower(email) so Mo@x.com and mo@x.com are one person.
create unique index if not exists waitlist_email_platform_key
  on public.waitlist (lower(email), platform);

alter table public.waitlist enable row level security;

-- Insert only. There is deliberately no select, update or delete policy, so
-- with RLS on, the publishable key can add itself to the list and do nothing
-- else. The site sends Prefer: return=minimal so it never needs to read back.
drop policy if exists "anyone can join the waitlist" on public.waitlist;
create policy "anyone can join the waitlist"
  on public.waitlist for insert
  to anon, authenticated
  with check (true);

-- Column level on top of the policy: a caller can supply the email, the
-- platform and the source, and cannot forge id or created_at.
revoke all on public.waitlist from anon, authenticated;
grant insert (email, platform, source) on public.waitlist to anon, authenticated;
