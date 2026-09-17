-- One time invite links, 2026-09-17.
--
-- The problem with the six character code in profiles is not only that it is
-- guessable at scale. It is that it is permanent, it is the same for everybody
-- you ever show it to, and redeeming it pairs two people without the owner
-- being asked. A link fixes all three at once: it is unguessable, it works
-- exactly once, and the owner created it deliberately for one person.
--
-- That last part is why a claimed link pairs immediately rather than raising a
-- request the way 20260915_consent_and_leak_close.sql makes a typed code do.
-- The consent is the act of creating and sending the link. Asking the sender to
-- then approve the person they just invited is a confirmation dialog for
-- something they already did, and people stop reading those.
--
-- The recourse is on the other side instead: the owner is told who claimed it,
-- can revoke the link before anybody claims it, and unpairing already exists.
--
-- Written to apply whether or not 20260915_consent_and_leak_close.sql has run
-- yet. Everything here goes through a SECURITY DEFINER function, so the client
-- INSERT policy that file removes from partnerships is not involved either way.
--
-- Safe to run twice.

create table if not exists invite_links (
  token       text primary key,
  owner_email text        not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '7 days',
  revoked_at  timestamptz,
  claimed_at  timestamptz,
  claimed_by  text
);

create index if not exists invite_links_owner_idx on invite_links (lower(owner_email));

alter table invite_links enable row level security;

-- No policy, deliberately. Nothing reads this table straight from the client:
-- every path goes through one of the three functions below, which are the only
-- things that know how to decide what a caller may see. RLS with no policy
-- denies anon and authenticated outright, which is the intent stated as code
-- rather than as a comment.


-- ---------------------------------------------------------------------------
-- Making one.
-- ---------------------------------------------------------------------------

-- 128 bits from pgcrypto, url safe, 22 characters. The six character code is
-- 887 million possibilities and that is a real number at a hundred thousand
-- users; this is 3.4e38 and will never be a number. pgcrypto lives in the
-- extensions schema on Supabase, so it is named in full: an unqualified
-- gen_random_bytes resolves only by luck of the search path.
create or replace function new_invite_token()
returns text language sql volatile set search_path = public as $$
  select translate(encode(extensions.gen_random_bytes(16), 'base64'), '+/=', '-_');
$$;

create or replace function create_invite_link()
returns json language plpgsql security definer set search_path = public as $$
declare
  me  text := my_email();
  tok text;
begin
  if me = '' then
    return json_build_object('ok', false, 'error', 'Not signed in');
  end if;

  -- Already partnered means there is nobody to invite. Answered here rather
  -- than at claim time so the app never hands somebody a link that was always
  -- going to fail, which is the kind of thing that gets sent to a friend and
  -- then has to be explained.
  if exists (
    select 1 from partnerships
     where status = 'accepted'
       and (lower(inviter_email) = me or lower(invitee_email) = me)
  ) then
    return json_build_object('ok', false, 'error', 'You already have a partner');
  end if;

  -- One live link at a time. A person who taps share twice has not made two
  -- invitations, they have made one and changed their mind about how to send
  -- it, and leaving the first standing means a link they think is dead is not.
  update invite_links
     set revoked_at = now()
   where lower(owner_email) = me
     and claimed_at is null
     and revoked_at is null;

  tok := new_invite_token();
  insert into invite_links (token, owner_email) values (tok, me);

  return json_build_object('ok', true, 'token', tok,
                           'expires_at', now() + interval '7 days');
end $$;


-- ---------------------------------------------------------------------------
-- Looking at one before signing in.
-- ---------------------------------------------------------------------------

-- Callable by anon on purpose: the landing page runs in a browser belonging to
-- somebody who has no account yet, and a page that cannot say who invited them
-- is a page that reads like a phishing attempt.
--
-- It returns a display name and the owner's typed code, and nothing else. Not
-- the email, not the id, not whether that person has ever logged a workout.
--
-- The code is here because of the one case a link cannot cover. A link tapped
-- on a phone without the app goes to the App Store, and nothing about which
-- link it was survives the install. Six characters somebody can read off the
-- page and type into the app afterwards is the thing that does survive, and it
-- was already meant to be shared, so showing it to somebody holding a valid
-- token gives away nothing that was being kept.
create or replace function peek_invite_link(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  link   invite_links;
  who    text;
  code   text;
begin
  select * into link from invite_links where token = p_token;

  -- One answer for every kind of no. Expired, revoked, claimed and never
  -- existed are four different facts about somebody else's account, and a page
  -- that distinguishes them is an oracle for anyone who found a link in a
  -- screenshot.
  if not found
     or link.revoked_at is not null
     or link.claimed_at is not null
     or link.expires_at < now() then
    return json_build_object('ok', false, 'error', 'This invite is no longer active');
  end if;

  select user_name, invite_code into who, code
    from profiles where lower(email) = lower(link.owner_email);
  return json_build_object('ok', true, 'name', coalesce(who, 'Someone'), 'code', code);
end $$;


-- ---------------------------------------------------------------------------
-- Claiming one.
-- ---------------------------------------------------------------------------

create or replace function claim_invite_link(p_token text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me    text := my_email();
  link  invite_links;
  owner text;
  who   text;
begin
  if me = '' then
    return json_build_object('ok', false, 'error', 'Not signed in');
  end if;

  -- Locked for the duration, so two people opening the same forwarded link at
  -- the same moment cannot both pass the claimed_at check before either writes.
  select * into link from invite_links where token = p_token for update;

  if not found
     or link.revoked_at is not null
     or link.claimed_at is not null
     or link.expires_at < now() then
    return json_build_object('ok', false, 'error', 'This invite is no longer active');
  end if;

  owner := lower(link.owner_email);

  if owner = me then
    return json_build_object('ok', false, 'error', 'That is your own invite');
  end if;

  if exists (
    select 1 from partnerships
     where status = 'accepted'
       and (lower(inviter_email) in (me, owner) or lower(invitee_email) in (me, owner))
  ) then
    return json_build_object('ok', false, 'error', 'One of you already has a partner');
  end if;

  -- A block outranks an invite in both directions. Somebody who blocked you
  -- and later sent a link to a group chat has not unblocked you, and somebody
  -- you blocked does not get to pair with you by sending you a link.
  if exists (
    select 1 from blocks
     where (lower(blocker_email) = me    and lower(blocked_email) = owner)
        or (lower(blocker_email) = owner and lower(blocked_email) = me)
  ) then
    return json_build_object('ok', false, 'error', 'This invite is no longer active');
  end if;

  -- Accepted outright. The owner consented by creating and sending this exact
  -- token, which is the whole difference between this and a typed code.
  insert into partnerships (inviter_email, invitee_email, status, responded_at)
  values (owner, me, 'accepted', now());

  update invite_links
     set claimed_at = now(), claimed_by = me
   where token = p_token;

  select user_name into who from profiles where lower(email) = owner;
  return json_build_object('ok', true, 'partner_name', coalesce(who, 'Your partner'),
                           'partner_email', owner);
end $$;


-- ---------------------------------------------------------------------------
-- Revoking one.
-- ---------------------------------------------------------------------------

create or replace function revoke_invite_link()
returns json language plpgsql security definer set search_path = public as $$
declare me text := my_email(); n int;
begin
  if me = '' then return json_build_object('ok', false, 'error', 'Not signed in'); end if;
  update invite_links
     set revoked_at = now()
   where lower(owner_email) = me and claimed_at is null and revoked_at is null;
  get diagnostics n = row_count;
  return json_build_object('ok', true, 'revoked', n);
end $$;


-- peek is reachable by anon because the landing page has no session. The other
-- three read my_email() from the JWT and answer 'Not signed in' without it, so
-- granting anon costs nothing and keeps the grant list uniform with the rest of
-- this schema.
grant execute on function peek_invite_link(text)  to anon, authenticated;
grant execute on function create_invite_link()    to anon, authenticated;
grant execute on function claim_invite_link(text) to anon, authenticated;
grant execute on function revoke_invite_link()    to anon, authenticated;
revoke execute on function new_invite_token() from anon, authenticated;


-- ---------------------------------------------------------------------------
-- Verify. Expect ok=true on all four.
-- ---------------------------------------------------------------------------
select
  (select count(*) from pg_tables where tablename = 'invite_links') = 1                as table_exists,
  (select relrowsecurity from pg_class where relname = 'invite_links')                 as rls_on,
  (select count(*) from pg_policies where tablename = 'invite_links') = 0              as no_policies_by_design,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_invite_link','peek_invite_link','claim_invite_link','revoke_invite_link')
      and p.prosecdef
      and array_to_string(p.proconfig, ',') like '%search_path%') = 4                  as four_definer_fns_pinned;
