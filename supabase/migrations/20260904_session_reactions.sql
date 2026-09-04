-- Hearts and comments on each other's sessions, 2026-09-04.
--
-- A session is one person's gym day: (to_email, entry_date). Anyone in the pair
-- can heart it or leave a short comment. One heart per person per session; as
-- many comments as they like. Only the author can take theirs back.

create table if not exists session_reactions (
  id uuid primary key default gen_random_uuid(),
  from_email text not null,
  to_email text not null,
  entry_date date not null,
  kind text not null check (kind in ('heart', 'comment')),
  message text,
  created_at timestamptz not null default now()
);

create unique index if not exists session_reactions_one_heart
  on session_reactions (lower(from_email), lower(to_email), entry_date)
  where kind = 'heart';

create index if not exists session_reactions_session
  on session_reactions (lower(to_email), entry_date);

alter table session_reactions enable row level security;

drop policy if exists "pair can read session reactions" on session_reactions;
create policy "pair can read session reactions" on session_reactions
  for select using (is_me(from_email) or is_me(to_email) or can_see(to_email));

-- Hearting your own session is allowed (the count then reads "both of you").
drop policy if exists "self can react to pair sessions" on session_reactions;
create policy "self can react to pair sessions" on session_reactions
  for insert with check (
    is_me(from_email)
    and (is_me(to_email) or lower(to_email) = my_partner_email())
    and (kind <> 'comment' or length(coalesce(message, '')) between 1 and 140)
  );

drop policy if exists "author can remove reaction" on session_reactions;
create policy "author can remove reaction" on session_reactions
  for delete using (is_me(from_email));

select 'session_reactions ready' as result;
