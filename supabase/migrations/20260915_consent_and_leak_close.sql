-- Closing five live holes, 2026-09-15.
--
-- Unlike 20260911_rls_hardening.sql, every line here was written against the
-- live database, not against the migrations in this repo. The policy text, the
-- function bodies, the trigger types, the storage paths and the row counts
-- were all read out of production first, so nothing below is guessing at a
-- predicate it could not see. That is why this file rewrites policies and
-- functions outright where the 09-11 file had to layer RESTRICTIVE policies on
-- top of predicates it had never read.
--
-- This file REPLACES 20260911_rls_hardening.sql. Do not run that one. What was
-- kept, changed and dropped from it is noted at each section.
--
-- It is safe to run twice. Every create is preceded by a drop, and the two
-- data repairs are written so a second run changes nothing.
--
--
-- THE GATE, and the bug in the 09-11 version of it
--
-- Every trigger below asks "did this write come straight from the client?" and
-- only polices it if so, so that the SECURITY DEFINER RPCs (redeem_invite_code,
-- respond_to_pair_invite, respond_to_group_invite, leave_my_group,
-- remove_group_member, assign_workout) keep being able to do the privileged
-- thing they exist to do. All six are owned by postgres, confirmed live:
--   select proname, prosecdef, pg_get_userbyid(proowner) from pg_proc ...
-- so inside them current_user is 'postgres', and outside them PostgREST has
-- done `set local role authenticated` (or anon), so current_user is that role.
--
-- The 09-11 file used the same idea and then broke it: it declared every
-- trigger function SECURITY DEFINER *and* gated it on current_user. Inside a
-- SECURITY DEFINER function current_user is always the function's own owner,
-- so `current_user not in ('authenticated','anon')` was true on every single
-- call and every one of those triggers would have returned NEW without
-- checking anything. They would have installed cleanly, verified as present,
-- and enforced nothing. The gate only works on a SECURITY INVOKER function,
-- which is what all of these are.


-- ---------------------------------------------------------------------------
-- 0. The gate itself.
-- ---------------------------------------------------------------------------

-- SECURITY INVOKER on purpose. See the note above. 'authenticator' is included
-- because it is the role PostgREST connects as before it switches; if a
-- deployment ever stopped switching, a write would still be policed rather
-- than silently exempt.
create or replace function is_client_write()
returns boolean language sql stable set search_path = public as $$
  select current_user in ('authenticated', 'anon', 'authenticator')
$$;

comment on function is_client_write() is
  'True when the current statement came straight from the client with the anon key. False inside a SECURITY DEFINER RPC and for the service role, which is how those stay exempt from the locks below.';

-- Trigger functions run as the invoking role now, so that role has to be able
-- to call them and the helper. This is the default for a new function in this
-- project (every existing helper shows =X/postgres), stated explicitly so a
-- future default-privileges change cannot quietly turn every write into a
-- permission error.
grant execute on function is_client_write() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 1. Partnership escalation.
--
--    Live INSERT policy: `with check is_me(inviter_email)` and nothing about
--    status. One POST with the public anon key inserts
--      (inviter_email: me, invitee_email: victim, status: 'accepted')
--    and my_partner_email() then returns the victim, so can_see() opens their
--    profile, fit_entries, exercise_logs, ai_workouts, body_photos,
--    challenge_completions, season_results, live_sessions, user_goals and
--    milestone_badges.
--
--    The 09-11 file closed this with a trigger. A trigger is the weaker fix
--    here, because nothing in the app ever inserts a partnership from the
--    client: every `from("partnerships")` in index.html and coach/index.html is
--    a select or an update, and the only INSERT anywhere is inside
--    redeem_invite_code, which runs as postgres and bypasses RLS entirely. So
--    the policy can simply go. The trigger is kept as well, in case a future
--    policy puts the door back.
-- ---------------------------------------------------------------------------

drop policy if exists "self can create invite" on partnerships;

create or replace function lock_partnership_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if not is_client_write() then return new; end if;

  raise exception 'partnerships are created by redeem_invite_code, not from the client';
end $$;

drop trigger if exists lock_partnership_insert_trg on partnerships;
create trigger lock_partnership_insert_trg
  before insert on partnerships
  for each row execute function lock_partnership_insert();
grant execute on function lock_partnership_insert() to anon, authenticated;


-- ---------------------------------------------------------------------------
--    The UPDATE side. lock_partnership_parties already existed and already
--    stopped the inviter self-accepting. It had two gaps.
--
--    a) Its gate is `my_email() = ''`, which exempts the service role and
--       nothing else. Switched to is_client_write() so the RPCs are
--       unambiguously exempt and the rule reads the same as every other lock
--       in this file. The RPCs below still satisfy the rules anyway.
--    b) It only guarded the transition *into* accepted from a non-accepted
--       state, checking who was doing it. It did not care where you came from,
--       so the invitee of a partnership the inviter had already ended could set
--       status back to 'accepted' on their own and get their sight of the other
--       person back. leavePartnership() in index.html writes exactly that
--       'ended' value, so this was reachable from the shipped app.
-- ---------------------------------------------------------------------------

create or replace function lock_partnership_parties()
returns trigger language plpgsql set search_path = public as $$
begin
  if not is_client_write() then return new; end if;

  if new.inviter_email is distinct from old.inviter_email
     or new.invitee_email is distinct from old.invitee_email then
    raise exception 'partnership parties cannot be changed';
  end if;

  if new.status is distinct from old.status then
    -- Accepting is the invitee's decision, never the inviter's.
    if new.status = 'accepted' and lower(old.invitee_email) <> my_email() then
      raise exception 'only the invitee can accept an invite';
    end if;
    -- And only ever out of 'pending'. A partnership somebody ended is over;
    -- getting back together means pairing again with a code.
    if new.status = 'accepted' and old.status <> 'pending' then
      raise exception 'an ended partnership cannot be reopened; pair again';
    end if;
    if new.status = 'pending' then
      raise exception 'a partnership cannot be put back to pending';
    end if;
  end if;

  return new;
end $$;

drop trigger if exists lock_partnership_parties_trg on partnerships;
create trigger lock_partnership_parties_trg
  before update on partnerships
  for each row execute function lock_partnership_parties();
grant execute on function lock_partnership_parties() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 2. The group version of the same escalation, which is worse.
--
--    can_see() grew a group branch that checks left_at and never accepted_at.
--    group_members INSERT is `with check i_own_group(group_id)`, and anyone can
--    own a group because groups INSERT is `with check is_me(owner_email)`. So:
--      1 create a group
--      2 add yourself
--      3 insert a row per victim with accepted_at already set
--    and can_see() is true for every one of them at once. The partnership path
--    is capped at one victim by the `limit 1` in my_partner_email(); this one
--    is capped by the seat limit, which you also choose. assign_workout then
--    passes its `accepted_at is not null` check and overwrites the victim's
--    plan for any date.
--
--    The 09-11 file does not cover this. Its group_members trigger only
--    re-states the INSERT policy (must own the group), which the attacker
--    satisfies.
--
--    The fix is the same principle as the partnership one: accepted_at is a
--    record of consent, so only the person it speaks for may ever write it.
-- ---------------------------------------------------------------------------

create or replace function lock_group_member_insert()
returns trigger language plpgsql set search_path = public as $$
begin
  if not is_client_write() then return new; end if;

  if not i_own_group(new.group_id) then
    raise exception 'only the group owner can add members; joining goes through an invite';
  end if;

  if is_me(new.email) then
    -- Your own seat in your own group. Creating the group is the consent, and
    -- coach/index.html createGroup() does not set accepted_at, which used to
    -- leave a coach sitting in their own roster as a permanent pending invite.
    new.accepted_at := coalesce(new.accepted_at, now());
  else
    -- Anyone else starts as an invitation. Forced rather than rejected so the
    -- coach dashboard's addClient(), which does not send the column at all,
    -- keeps working unchanged.
    new.accepted_at := null;
  end if;

  return new;
end $$;

drop trigger if exists lock_group_member_insert_trg on group_members;
create trigger lock_group_member_insert_trg
  before insert on group_members
  for each row execute function lock_group_member_insert();
grant execute on function lock_group_member_insert() to anon, authenticated;


-- The UPDATE half, and the hole the INSERT trigger alone would leave: the live
-- lock_group_member_fields returns NEW immediately for the group owner, so the
-- attacker would insert with accepted_at null and set it one request later.
-- Now the accepted_at check runs before the owner is let through.
create or replace function lock_group_member_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not is_client_write() then return new; end if;

  if new.group_id is distinct from old.group_id
     or new.email is distinct from old.email then
    raise exception 'members cannot change their group or email';
  end if;

  -- The consent column. Not even the owner of the group may write it for you.
  if new.accepted_at is distinct from old.accepted_at and not is_me(old.email) then
    raise exception 'only the person invited can accept an invitation';
  end if;

  if old.left_at is not null and new.left_at is null then
    raise exception 'rejoining a group needs a new invite';
  end if;

  if i_own_group(old.group_id) then return new; end if;   -- the owner runs the group

  if new.role is distinct from old.role then
    raise exception 'members cannot change their role';
  end if;

  return new;
end $$;

drop trigger if exists lock_group_member_fields_trg on group_members;
create trigger lock_group_member_fields_trg
  before update on group_members
  for each row execute function lock_group_member_fields();
grant execute on function lock_group_member_fields() to anon, authenticated;


-- can_see() now asks whether both people actually joined. Read live before
-- changing it: every active row in group_members today has accepted_at set, so
-- this takes nothing away from anybody currently using the app.
create or replace function can_see(row_email text)
returns boolean language sql stable security definer set search_path = public as $$
  select lower(row_email) = my_email()
      or lower(row_email) = my_partner_email()
      or exists (
        select 1
        from group_members me
        join groups g on g.id = me.group_id
        join group_members them on them.group_id = g.id
                               and them.left_at is null
                               and them.accepted_at is not null
        where lower(me.email) = my_email()
          and me.left_at is null
          and me.accepted_at is not null
          and lower(them.email) = lower(row_email)
          and (
            g.kind = 'pair'
            or g.members_see_each_other
            or me.role in ('owner','coach')          -- coach sees clients
            or them.role in ('owner','coach')        -- clients see the coach
          )
      )
$$;


-- Repair for the one legitimate row shape that could now be stranded: a group
-- owner sitting in their own roster with accepted_at null, which is what
-- coach/index.html createGroup() writes. Zero rows match today; this is here so
-- that a group created between now and this migration running is not left with
-- a coach who cannot see their own clients.
update group_members m
   set accepted_at = m.joined_at
  from groups g
 where g.id = m.group_id
   and m.left_at is null
   and m.accepted_at is null
   and lower(g.owner_email) = lower(m.email);


-- ---------------------------------------------------------------------------
-- 3. groups. Carried over from 09-11 section 3, rewritten as SECURITY INVOKER
--    so the gate actually fires, and with members_see_each_other deliberately
--    left writable because coach/index.html toggleVisibility() writes it.
--
--    owner_email decides i_own_group(), kind decides whether members can see
--    each other, seat_limit is what a paid tier would sell, and all three are
--    sent by the client on insert with nothing checking them.
-- ---------------------------------------------------------------------------

create or replace function lock_group_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not is_client_write() then return new; end if;

  if tg_op = 'INSERT' then
    if not is_me(new.owner_email) then
      raise exception 'a group is created by its owner';
    end if;
    if coalesce(new.seat_limit, 1) > 20 then
      raise exception 'seat limit above the largest plan';
    end if;
    return new;
  end if;

  if not is_me(old.owner_email) then
    raise exception 'only the owner can change a group';
  end if;
  if new.owner_email is distinct from old.owner_email then
    raise exception 'a group cannot be handed to someone else from the client';
  end if;
  if new.seat_limit is distinct from old.seat_limit then
    raise exception 'seat limit is not set from the client';
  end if;
  if new.kind is distinct from old.kind then
    raise exception 'group kind is fixed at creation';
  end if;

  return new;
end $$;

drop trigger if exists lock_group_fields_trg on groups;
create trigger lock_group_fields_trg
  before insert or update on groups
  for each row execute function lock_group_fields();
grant execute on function lock_group_fields() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 4. profiles column lock. Carried over from 09-11 section 4 with two changes.
--
--    Dropped from that version: nothing. Changed:
--      - The email guard is now documented as belt and braces rather than a
--        fix. The live UPDATE policy is `using is_me(email) with check
--        is_me(email)`, and the WITH CHECK already stops a profile being
--        renamed onto a victim's address. It stays because it costs nothing and
--        the day somebody loosens that policy it is the only thing left.
--      - bonus_xp now has one exemption. adminGiveXp() in index.html is a
--        button that exists and works, and the profiles UPDATE policy already
--        limits it to the admin's own row, so blocking it outright would break
--        a shipped feature to close a hole that is a leaderboard-cheating one
--        rather than a privacy one. The address is the same ADMIN_EMAIL that
--        index.html line 6423 uses. Delete the exemption when the admin panel
--        goes and this becomes a flat "never from the client".
--
--    invite_code is issued once by a server default. Being able to churn your
--    own code is a pairing-hijack primitive, and it is now also the thing
--    section 6's rate limiting counts against, so it moves behind an RPC.
-- ---------------------------------------------------------------------------

create or replace function lock_profile_trust_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if not is_client_write() then return new; end if;

  if new.email is distinct from old.email then
    raise exception 'a profile cannot be moved to another email';
  end if;

  if coalesce(new.bonus_xp, 0) > coalesce(old.bonus_xp, 0)
     and my_email() <> 'mo.shareef@creativelab1.com' then
    raise exception 'bonus xp is not granted from the client';
  end if;

  if new.invite_code is distinct from old.invite_code then
    raise exception 'invite code is changed with rotate_invite_code(), not by writing the column';
  end if;

  return new;
end $$;

drop trigger if exists lock_profile_trust_fields_trg on profiles;
create trigger lock_profile_trust_fields_trg
  before update on profiles
  for each row execute function lock_profile_trust_fields();
grant execute on function lock_profile_trust_fields() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 5. Progress photos.
--
--    privacy.html says twice that progress photos are visible only to you and
--    that this is enforced at the server. It is not. Live:
--      body_photos SELECT  -> using can_see(email)
--      storage.objects     -> "couple proof read": bucket workout-proof and
--                             can_see(foldername[1])
--    and the files are written to {email}/body/{date}-{ts}.jpg, so a partner
--    can both list the rows and sign a URL for every image.
--
--    The row policy is replaced outright rather than covered with a
--    RESTRICTIVE one as 09-11 did, because the live policy name and predicate
--    are now known and a single is_me() policy is easier to read a year from
--    now than two that AND together.
--
--    The storage side keeps the RESTRICTIVE shape, because there the permissive
--    policy is doing real work: proof photos and avatars live in the same
--    bucket and are meant to be shared. This carves out the body/ folder and
--    leaves the rest exactly as it was. Scoped to the client roles so
--    delete-account, which runs as service_role, is unaffected.
-- ---------------------------------------------------------------------------

drop policy if exists "couple reads body photos" on body_photos;
drop policy if exists "body photos are self only" on body_photos;
create policy "body photos are self only" on body_photos
  for select using (is_me(email));

drop policy if exists "body photos are never a partner's business" on storage.objects;
create policy "body photos are never a partner's business" on storage.objects
  as restrictive for select to authenticated, anon
  using (
    bucket_id <> 'workout-proof'
    or (storage.foldername(name))[2] is distinct from 'body'
    or is_me((storage.foldername(name))[1])
  );

drop policy if exists "body photo files are deleted by their owner" on storage.objects;
create policy "body photo files are deleted by their owner" on storage.objects
  as restrictive for delete to authenticated, anon
  using (
    bucket_id <> 'workout-proof'
    or (storage.foldername(name))[2] is distinct from 'body'
    or is_me((storage.foldername(name))[1])
  );


-- ---------------------------------------------------------------------------
-- 5b. milestone_badges DELETE. Carried over from 09-11 section 7 unchanged and
--     confirmed live: the table has an INSERT and a SELECT policy and no DELETE
--     policy, so resetMyData() silently fails to remove a badge and a badge
--     survives a reset that is meant to wipe the account clean.
--
--     09-11 sections 6 (encouragements) and 11 (ai_usage_log, nudge_log) are
--     deliberately NOT carried over. They were written blind and the live
--     schema says they are unnecessary: encouragements already has
--     `insert with check is_me(from_email) and to_email = my_partner_email()`
--     and a select limited to the two parties, which is tighter than the
--     restrictive policies 09-11 proposed; ai_usage_log and nudge_log both have
--     RLS on with zero policies, which is already service-role-only. Adding
--     policies there would have been the only way to make them worse.
--     Section 12 (bucket public flags) is also dropped: both buckets are
--     already private, checked live.
-- ---------------------------------------------------------------------------

drop policy if exists "self can remove own milestone badges" on milestone_badges;
create policy "self can remove own milestone badges" on milestone_badges
  for delete using (is_me(email));


-- ---------------------------------------------------------------------------
-- 6. Invite codes: consent, and a rate limit.
--
--    The live redeem_invite_code creates an 'accepted' partnership outright. It
--    is SECURITY DEFINER, so section 1 does not touch it. Two things are wrong
--    with it and they are the same thing twice:
--
--    a) A six character code over a 31 letter alphabet is 887,503,681 codes.
--       Nothing rate limits PostgREST, so a script running at a modest 10
--       requests a second makes 864,000 guesses a day. With N users in the
--       table the chance of any one guess landing is N/887M, so the expected
--       time to a hit falls linearly as the app grows: it is years at 7 users
--       and about a day at 1,000. A hit is not a near miss, it is immediate
--       read access to that person's profile, weight history, workout logs and
--       plans.
--
--    b) Even with no brute force, the code is a bearer token with no expiry and
--       no revocation. Anyone who ever saw it -- a screenshot, a forwarded
--       invite message, an ex-partner -- can pair with that person at any point
--       in the future, and the person it happens to is never asked and never
--       told. That is the part the rate limit cannot fix.
--
--    So the rate limit is not the fix, it is the second line. The fix is that
--    redeeming a code now creates a *request*, and only the person the request
--    is addressed to can turn it into a partnership. A guessed code then buys
--    the attacker a notification that a stranger wants to pair, which the
--    victim declines. The same rule the group side got in section 2: the person
--    being added is the only one who can accept.
--
--    What stays the same: if the two of you swap codes, the second redemption
--    finds the first one's pending request and pairs you immediately, with no
--    extra tap. That is the flow of two people sitting together, and it is
--    unchanged.
--
--    RATE LIMIT SHAPE, and why this one:
--      - per account, 5 failures in 15 minutes and 20 in 24 hours. This is the
--        primary gate. A real person mistypes once, maybe twice.
--      - global, 200 failures in an hour, but only applied to an account that
--        has itself failed in that hour. A flat global cap is a denial of
--        service: fire 200 bad codes and nobody in the app can pair until the
--        hour rolls. Excusing accounts with a clean record means the flood
--        stops the flooder and not the couple standing in a gym.
--      - three outstanding requests per account, so a leak of the rate limit
--        cannot be turned into spamming every user with pair requests.
--      - and rotate_invite_code(), because a code you cannot change is a
--        credential you cannot revoke.
--    Rejected: an expiring code. It breaks "text your friend your code and let
--    them get to it tonight" with no way to re-arm it from the client, and it
--    buys little once a hit only produces a request. Reconsider it if the app
--    ever gets a "show my code" screen that can arm a short window.
--    Rejected: a longer code. It is the thing people read out loud.
-- ---------------------------------------------------------------------------

create table if not exists invite_code_attempts (
  id          uuid primary key default gen_random_uuid(),
  actor_email text        not null,
  code_tried  text        not null,
  ok          boolean     not null default false,
  at          timestamptz not null default now()
);

alter table invite_code_attempts enable row level security;
-- No policies on purpose. RLS on with no policy is readable and writable by the
-- service role and by SECURITY DEFINER functions only, which is exactly right:
-- this table is the rate limiter's own memory and a client that could read or
-- delete from it could reset its own lockout.
revoke all on invite_code_attempts from anon, authenticated;

create index if not exists invite_code_attempts_actor
  on invite_code_attempts (lower(actor_email), at desc);
create index if not exists invite_code_attempts_recent
  on invite_code_attempts (at desc) where not ok;

comment on table invite_code_attempts is
  'One row per redeem_invite_code() call. Feeds the lockout in that function. Trim with: delete from invite_code_attempts where at < now() - interval ''30 days''.';


create or replace function redeem_invite_code(code text)
returns json language plpgsql security definer set search_path = public as $$
declare
  me        text := my_email();
  tidy      text := upper(regexp_replace(coalesce(code, ''), '[^A-Za-z0-9]', '', 'g'));
  target    record;
  mine      int;
  today     int;
  worldwide int;
  guilty    int;
  pending   int;
  hit       int;
begin
  if me = '' then
    return json_build_object('ok', false, 'error', 'Not signed in');
  end if;
  if length(tidy) <> 6 then
    return json_build_object('ok', false, 'error', 'Codes are 6 characters');
  end if;

  -- Rate limits, before the code is even looked up, so that a locked out
  -- account cannot use the response time to tell a real code from a fake one.
  select count(*) into mine  from invite_code_attempts
   where lower(actor_email) = me and not ok and at > now() - interval '15 minutes';
  if mine >= 5 then
    return json_build_object('ok', false, 'error', 'Too many tries. Give it fifteen minutes.');
  end if;

  select count(*) into today from invite_code_attempts
   where lower(actor_email) = me and not ok and at > now() - interval '24 hours';
  if today >= 20 then
    return json_build_object('ok', false, 'error', 'Too many tries today. Try again tomorrow.');
  end if;

  select count(*) into guilty from invite_code_attempts
   where lower(actor_email) = me and not ok and at > now() - interval '1 hour';
  if guilty > 0 then
    select count(*) into worldwide from invite_code_attempts
     where not ok and at > now() - interval '1 hour';
    if worldwide >= 200 then
      return json_build_object('ok', false, 'error', 'Pairing is busy right now. Try again shortly.');
    end if;
  end if;

  select email, user_name into target from profiles where invite_code = tidy;

  insert into invite_code_attempts (actor_email, code_tried, ok)
  values (me, tidy, target.email is not null);

  if target.email is null then
    return json_build_object('ok', false, 'error', 'That code does not match anyone');
  end if;
  if lower(target.email) = me then
    return json_build_object('ok', false, 'error', 'That is your own code');
  end if;

  if exists (
    select 1 from partnerships
    where status = 'accepted'
      and (lower(inviter_email) = me or lower(invitee_email) = me
        or lower(inviter_email) = lower(target.email) or lower(invitee_email) = lower(target.email))
  ) then
    return json_build_object('ok', false, 'error', 'One of you already has a partner');
  end if;

  -- They redeemed my code first. Both of us have now acted, so this is a
  -- pairing and not a request.
  update partnerships
     set status = 'accepted', responded_at = now()
   where status = 'pending'
     and lower(inviter_email) = lower(target.email)
     and lower(invitee_email) = me;
  get diagnostics hit = row_count;
  if hit > 0 then
    return json_build_object('ok', true, 'partner_name', target.user_name,
                             'partner_email', lower(target.email));
  end if;

  if exists (
    select 1 from partnerships
    where status = 'pending'
      and lower(inviter_email) = me and lower(invitee_email) = lower(target.email)
  ) then
    return json_build_object(
      'ok', false, 'pending', true, 'partner_name', target.user_name,
      'error', format('You already asked %s. Waiting on them.', target.user_name));
  end if;

  select count(*) into pending from partnerships
   where status = 'pending' and lower(inviter_email) = me;
  if pending >= 3 then
    return json_build_object('ok', false,
      'error', 'You have three pair requests out already. Wait for one of them.');
  end if;

  insert into partnerships (inviter_email, invitee_email, status)
  values (me, lower(target.email), 'pending');

  -- ok is false on purpose. The shipped client treats ok:true as "we are
  -- paired" and re-enters the app, which would be a lie until they accept.
  -- False makes today's build show this sentence and stay put, which is
  -- accurate. A patched client should branch on pending instead.
  return json_build_object(
    'ok', false, 'pending', true, 'partner_name', target.user_name,
    'error', format('Request sent to %s. They need to accept it in the app.', target.user_name));
end $$;


-- The other half of the handshake. The invitee, and nobody else.
create or replace function respond_to_pair_invite(p_id uuid, p_accept boolean)
returns json language plpgsql security definer set search_path = public as $$
declare
  me  text := my_email();
  inv record;
begin
  if me = '' then
    return json_build_object('ok', false, 'error', 'Not signed in');
  end if;

  select * into inv from partnerships
   where id = p_id and status = 'pending' and lower(invitee_email) = me;
  if not found then
    return json_build_object('ok', false, 'error', 'That request is no longer open');
  end if;

  if not p_accept then
    update partnerships set status = 'declined', responded_at = now() where id = p_id;
    return json_build_object('ok', true, 'accepted', false);
  end if;

  if exists (
    select 1 from partnerships
    where status = 'accepted'
      and (lower(inviter_email) = me or lower(invitee_email) = me
        or lower(inviter_email) = lower(inv.inviter_email)
        or lower(invitee_email) = lower(inv.inviter_email))
  ) then
    return json_build_object('ok', false, 'error', 'One of you already has a partner');
  end if;

  update partnerships set status = 'accepted', responded_at = now() where id = p_id;

  -- Everything else they were asked stops being an open question.
  update partnerships set status = 'declined', responded_at = now()
   where status = 'pending' and id <> p_id and lower(invitee_email) = me;

  return json_build_object('ok', true, 'accepted', true,
                           'partner_email', lower(inv.inviter_email));
end $$;


-- A code you cannot change is a credential you cannot revoke.
create or replace function rotate_invite_code()
returns json language plpgsql security definer set search_path = public as $$
declare
  me   text := my_email();
  fresh text;
begin
  if me = '' then
    return json_build_object('ok', false, 'error', 'Not signed in');
  end if;
  fresh := gen_invite_code();
  update profiles set invite_code = fresh where lower(email) = me;
  if not found then
    return json_build_object('ok', false, 'error', 'No profile yet');
  end if;
  return json_build_object('ok', true, 'invite_code', fresh);
end $$;

grant execute on function respond_to_pair_invite(uuid, boolean) to anon, authenticated;
grant execute on function rotate_invite_code() to anon, authenticated;


-- ---------------------------------------------------------------------------
-- 7. CRON_SECRET.
--
--    It is a literal in the body of notify_live_session_start(), and live it is
--    also a literal in three cron.job command strings (expire-proof-photos,
--    send-nudges, expire-live-clips). It is the only gate on expire-proofs and
--    expire-clips, which are deployed with verify_jwt = false and are therefore
--    reachable by anyone on the internet; both delete data.
--
--    Honest scope: PostgREST only exposes the public and graphql_public
--    schemas, so a client with the anon key cannot read pg_proc.prosrc or
--    cron.job and cannot lift the secret that way. The exposure is anyone with
--    a database connection string, anyone with a dump or a PITR backup, and now
--    anyone who has read this repo or watched an agent read the schema. That is
--    enough reason to treat it as burned.
--
--    Vault is installed on this project and currently holds zero secrets. The
--    block below moves all four uses onto it, and does nothing at all until the
--    secret exists, so running this file before you create the secret is safe:
--    it prints a notice and leaves today's arrangement working.
--
--    BEFORE RUNNING THIS FILE:
--      1. Generate a new secret:            openssl rand -base64 32
--      2. In the SQL editor, once:
--           select vault.create_secret('<the new secret>', 'cron_secret',
--                                      'Bearer token for the cron-only edge functions');
--      3. Set CRON_SECRET to the same value in the edge function environment
--         (Project settings, Edge functions, Secrets). Do this before step 2
--         or the jobs fail for the minutes in between.
-- ---------------------------------------------------------------------------

create or replace function cron_secret()
returns text language sql stable security definer set search_path = vault, public as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret'
$$;

revoke all on function cron_secret() from public, anon, authenticated;

do $outer$
declare
  fn_url text := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/';
  armed  boolean := false;
begin
  begin
    select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') into armed;
  exception when others then
    raise notice 'Vault is not readable here (%). Section 7 skipped.', sqlerrm;
    return;
  end;

  if not armed then
    raise notice 'No vault secret named cron_secret. Section 7 skipped; the secret is still a literal. Create it and run this file again.';
    return;
  end if;

  execute $fn$
    create or replace function notify_live_session_start()
    returns trigger language plpgsql security definer set search_path = public as $body$
    declare
      partner text;
      claimed boolean;
    begin
      select case
        when lower(p.inviter_email) = lower(new.email) then lower(p.invitee_email)
        else lower(p.inviter_email)
      end
      into partner
      from partnerships p
      where p.status = 'accepted'
        and (lower(p.inviter_email) = lower(new.email) or lower(p.invitee_email) = lower(new.email))
      order by p.responded_at desc nulls last
      limit 1;

      if partner is null then
        return new;   -- training alone, nobody to tell
      end if;

      insert into nudge_log (email, kind) values (partner, 'live_start')
        on conflict do nothing;
      claimed := found;
      if not claimed then
        return new;   -- already told them once today
      end if;

      -- Fire and forget. A webhook failure must never roll back the session
      -- the athlete is trying to start, so this is wrapped and swallowed.
      begin
        perform net.http_post(
          url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-live-start',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || cron_secret()),
          body := jsonb_build_object(
            'to_email', partner,
            'from_name', new.user_name,
            'focus', new.focus,
            'exercise_name', new.exercise_name,
            'details_shared', new.details_shared,
            'allow_cheers', new.allow_cheers
          )
        );
      exception when others then
        raise warning 'live_start notify failed: %', sqlerrm;
      end;

      return new;
    end $body$;
  $fn$;

  -- The three jobs that carry the secret in their command text. Schedules are
  -- the live ones, unchanged; only the Authorization header moves.
  perform cron.schedule('expire-proof-photos', '17 4 * * *', format($j$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || cron_secret()),
      body := '{}'::jsonb);
  $j$, fn_url || 'expire-proofs'));

  perform cron.schedule('send-nudges', '0 * * * *', format($j$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || cron_secret()),
      body := '{}'::jsonb);
  $j$, fn_url || 'send-nudges'));

  perform cron.schedule('expire-live-clips', '*/15 * * * *', format($j$
    select net.http_post(
      url := %L,
      headers := jsonb_build_object('Content-Type','application/json','Authorization','Bearer ' || cron_secret()),
      body := '{}'::jsonb);
  $j$, fn_url || 'expire-clips'));

  raise notice 'Section 7 applied. Rotate the old secret out of the edge function environment if you have not already.';
end $outer$;


-- ===========================================================================
-- VERIFICATION. Everything from here down is SELECT only. Run it after the
-- file and read the last column of each block.
-- ===========================================================================

-- 1. Partnership escalation. Expect: no client INSERT policy on partnerships,
--    and the insert lock present.
select 'hole 1: partnership insert' as check,
       (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'partnerships' and cmd = 'INSERT') as client_insert_policies,
       (select count(*) from pg_trigger
         where tgname = 'lock_partnership_insert_trg') as insert_lock,
       (select count(*) from pg_trigger
         where tgname = 'lock_partnership_parties_trg') as update_lock,
       case when (select count(*) from pg_policies
                   where schemaname = 'public' and tablename = 'partnerships' and cmd = 'INSERT') = 0
             and (select count(*) from pg_trigger where tgname = 'lock_partnership_insert_trg') = 1
            then 'CLOSED' else 'OPEN' end as verdict;

-- The live proof, run it as yourself with the anon key from a terminal:
--   curl -s -X POST "$URL/rest/v1/partnerships" \
--     -H "apikey: $ANON" -H "Authorization: Bearer $MY_JWT" \
--     -H "Content-Type: application/json" \
--     -d '{"inviter_email":"me@x.com","invitee_email":"victim@x.com","status":"accepted"}'
-- Expect 401/403 from RLS. Before this file it returned 201.

-- 2. Group escalation. Expect accepted_at inside can_see(), both group_members
--    locks present, and no active member whose consent was written by somebody
--    else (which the triggers now make impossible going forward).
select 'hole 2: group escalation' as check,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'can_see'
           and p.prosrc like '%them.accepted_at is not null%'
           and p.prosrc like '%me.accepted_at is not null%') as can_see_checks_consent,
       (select count(*) from pg_trigger where tgname = 'lock_group_member_insert_trg') as insert_lock,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'lock_group_member_fields'
           and p.prosrc like '%only the person invited can accept%') as update_lock,
       (select count(*) from group_members where left_at is null and accepted_at is null) as members_awaiting_reply;

-- Then, signed in as a test account, run the four request attack by hand:
-- create a group, insert yourself, insert a victim with accepted_at already
-- set. The victim row lands with accepted_at NULL however you send it, and a
-- follow-up update of that column is refused. Confirm with:
--   select email, accepted_at from group_members where group_id = '<the group>';
--
-- A sweep of rows that already existed. The trigger is the guarantee from now
-- on; this is a heuristic look backwards, flagging anyone marked as having
-- joined in the same instant the row was created and who does not own the
-- group. Expect 0. A hit is worth opening by hand, not proof of an attack.
select 'hole 2: old rows worth a look' as check, count(*) as suspicious_memberships
  from group_members m
  join groups g on g.id = m.group_id
 where m.accepted_at is not null
   and m.left_at is null
   and lower(m.email) <> lower(g.owner_email)
   and m.accepted_at = m.joined_at;

-- 3. Invite codes. Expect the attempt log locked down and consent in the RPC.
select 'hole 3: invite codes' as check,
       (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'invite_code_attempts') as policies_should_be_zero,
       (select c.relrowsecurity from pg_class c join pg_namespace n on n.oid = c.relnamespace
         where n.nspname = 'public' and c.relname = 'invite_code_attempts') as rls_on,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'redeem_invite_code'
           and p.prosrc like '%invite_code_attempts%'
           and p.prosrc like '%''pending''%') as redeem_rate_limited_and_pending,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname in ('respond_to_pair_invite','rotate_invite_code')) as new_rpcs_should_be_2;

-- What the limiter has seen. Empty on a fresh install; watch it after testing.
select 'hole 3: recent attempts' as check, actor_email, count(*) filter (where not ok) as failures,
       count(*) as attempts, max(at) as last_try
  from invite_code_attempts
 where at > now() - interval '24 hours'
 group by actor_email order by failures desc;

-- 4. Progress photos. Expect the row policy to be is_me and two restrictive
--    storage policies naming the body folder.
select 'hole 4: progress photos' as check,
       (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'body_photos' and cmd = 'SELECT'
           and qual like '%can_see%') as row_policies_still_sharing,
       (select count(*) from pg_policies
         where schemaname = 'public' and tablename = 'body_photos' and cmd = 'SELECT'
           and qual like '%is_me%') as row_policies_self_only,
       (select count(*) from pg_policies
         where schemaname = 'storage' and tablename = 'objects' and permissive = 'RESTRICTIVE'
           and qual like '%body%') as storage_carve_outs_should_be_2;

-- The real proof is the one that found it: sign in as the partner account and
-- run both of these with that account's JWT. Both must come back empty.
--   GET  $URL/rest/v1/body_photos?select=path
--   POST $URL/storage/v1/object/list/workout-proof  {"prefix":"<victim>/body"}

-- 5. The cron secret. Both counts must be zero.
select 'hole 5: cron secret' as check,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.prosrc like '%9UJOkAypgA6J1%') as functions_with_the_literal,
       (select count(*) from cron.job where command like '%9UJOkAypgA6J1%') as cron_jobs_with_the_literal,
       (select count(*) from vault.decrypted_secrets where name = 'cron_secret') as vault_secret_present;

-- And the scorecard, one row.
select 'all five' as check,
       (select count(*) from pg_policies where schemaname='public' and tablename='partnerships' and cmd='INSERT') = 0 as hole_1,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='can_see' and p.prosrc like '%them.accepted_at is not null%') = 1 as hole_2,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.proname='redeem_invite_code' and p.prosrc like '%invite_code_attempts%') = 1 as hole_3,
       (select count(*) from pg_policies where schemaname='public' and tablename='body_photos'
         and cmd='SELECT' and qual like '%can_see%') = 0 as hole_4,
       (select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
         where n.nspname='public' and p.prosrc like '%9UJOkAypgA6J1%') = 0 as hole_5;
