-- Security hardening before the App Store submission, 2026-09-11.
--
-- Everything here was derived from source only: the migrations in this repo,
-- the edge functions, and index.html. Nothing was run against the live
-- database, so the live policy text was never read. That shapes the fix:
-- where a hole could only be closed by rewriting a policy whose exact
-- predicate is unknown, this file uses a trigger or a RESTRICTIVE policy
-- instead, because both are correct without knowing what the permissive
-- policies say. Anything that genuinely needs the live schema first is at the
-- bottom, commented out, under CONFIRM FIRST.
--
-- The gate used by every trigger below is `current_user in ('authenticated',
-- 'anon')`. That is deliberately narrower than the `my_email() = ''` test the
-- 2026-09-03 lock migration used: it exempts the service role AND every
-- security definer RPC (redeem_invite_code, respond_to_group_invite,
-- assign_workout, remove_group_member), which run as their owner and so must
-- keep being able to do the privileged thing they exist to do. Only a write
-- arriving straight from the client with the anon key is policed here.

-- ---------------------------------------------------------------------------
-- 1. partnerships, INSERT. The same escalation 20260903_lock_membership_fields
--    closed on UPDATE is still open on INSERT.
--
--    That migration added a BEFORE UPDATE trigger so an inviter could not
--    rewrite invitee_email or self-accept. Nothing stops the attacker doing it
--    in one shot instead:
--      insert into partnerships
--        (inviter_email, invitee_email, status)
--        values (me, victim, 'accepted');
--    The trigger never fires, because it is BEFORE UPDATE. my_partner_email()
--    then returns the victim, and can_see(victim) is true for profiles,
--    fit_entries, exercise_logs, body_photos, ai_workouts,
--    challenge_completions and season_results. Cost of the attack: knowing an
--    email address, one curl.
--
--    A partnership created by the client may only ever be a pending invite
--    from the person holding the phone. Accepting is the invitee's decision
--    and goes through the RPC, which is exempt.

create or replace function lock_partnership_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  if not is_me(new.inviter_email) then
    raise exception 'you can only invite as yourself';
  end if;

  if lower(coalesce(new.invitee_email, '')) = my_email() then
    raise exception 'you cannot pair with yourself';
  end if;

  if coalesce(new.status, 'pending') <> 'pending' then
    raise exception 'a new partnership starts pending; only the invitee accepts it';
  end if;

  return new;
end $$;

drop trigger if exists lock_partnership_insert_trg on partnerships;
create trigger lock_partnership_insert_trg
  before insert on partnerships
  for each row execute function lock_partnership_insert();

-- ---------------------------------------------------------------------------
-- 2. group_members, INSERT. Same shape, same table the 09-03 migration
--    already had to lock on UPDATE.
--
--    That migration says in its own comment that the seat limit trigger is
--    BEFORE INSERT only, which means an insert path exists and is policed for
--    seats and nothing else. If the INSERT policy is is_me(email), which is
--    what the create-group flow in index.html (line ~4510) needs to work, then
--    any signed in user can run:
--      insert into group_members (group_id, email, role, accepted_at)
--        values ('<any group id>', me, 'coach', now());
--    and can_see() then grants them sight of every member of a coach's roster.
--    Group ids are uuids so they have to be obtained first, but a roster read
--    or a shared invite link leaks one, and the client itself does an
--    unfiltered `select * from group_members`.
--
--    A client may legitimately insert a group_members row in exactly two
--    cases: the owner setting up their own group, and the owner inviting
--    somebody (a pending row). Joining is done by RPC, which is exempt.

create or replace function lock_group_member_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;
  if i_own_group(new.group_id) then return new; end if;

  raise exception 'only the group owner can add members; joining goes through an invite';
end $$;

drop trigger if exists lock_group_member_insert_trg on group_members;
create trigger lock_group_member_insert_trg
  before insert on group_members
  for each row execute function lock_group_member_insert();

-- ---------------------------------------------------------------------------
-- 3. groups. owner_email decides i_own_group(), which decides who may run the
--    roster; kind decides whether members can see each other; seat_limit is
--    what a paid tier would sell. All three are sent by the client on insert
--    (index.html chooseSetup, coach/index.html createGroup) and nothing checks
--    them, so a user can create a group owned by somebody else, or give
--    themselves a 10000 seat coaching roster, or flip an existing group's
--    settings if the UPDATE policy is anything looser than owner-only.
--
--    20 is the largest seat count the app offers ("I coach people", up to 20).

create or replace function lock_group_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

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

-- ---------------------------------------------------------------------------
-- 4. profiles column lock. Three columns on a row you are allowed to update.
--
--    bonus_xp: the admin panel in index.html grants XP with a plain
--      `update profiles set bonus_xp = ...`, gated only by hiding a card when
--      the signed in email is not the admin's. The database has no such gate,
--      so anybody can grant themselves any amount and top the shared ranking.
--      Lowering is still allowed, because resetMyData() sets it to 0 and that
--      is an honest thing for a user to do to their own account.
--    email: if the UPDATE policy has a USING of is_me(email) and no WITH
--      CHECK, renaming your own row to a victim's email hands you their
--      profile. Cheap to close whether or not that is the case.
--    invite_code: pairing is "tell someone your code". Being able to choose or
--      churn your code is a pairing-hijack primitive; it is issued once.

create or replace function lock_profile_trust_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if current_user not in ('authenticated', 'anon') then return new; end if;

  if new.email is distinct from old.email then
    raise exception 'a profile cannot be moved to another email';
  end if;

  if coalesce(new.bonus_xp, 0) > coalesce(old.bonus_xp, 0) then
    raise exception 'bonus xp is not granted from the client';
  end if;

  if new.invite_code is distinct from old.invite_code then
    raise exception 'invite code is issued once and cannot be changed';
  end if;

  return new;
end $$;

drop trigger if exists lock_profile_trust_fields_trg on profiles;
create trigger lock_profile_trust_fields_trg
  before update on profiles
  for each row execute function lock_profile_trust_fields();

-- ---------------------------------------------------------------------------
-- 5. body_photos. The most sensitive rows in the app, and the 09-03 migration
--    names them in the list of tables can_see() opens up:
--    "can_see(victim) true for profiles, fit_entries, exercise_logs,
--     body_photos, ai_workouts, challenge_completions and season_results".
--    So a partner or coach can read them. The app never shows them: every
--    read in index.html filters `p.email === MY_EMAIL`, the progress tab is
--    self-only, and nothing was ever built to share one. The sharing is
--    accidental and it is of photographs of somebody's body.
--
--    Restrictive rather than a rewrite, because the permissive policy's exact
--    name and text are not in this repo. Restrictive policies AND with the
--    permissive ones, so this caps visibility at self no matter what the
--    existing policy says, and it is scoped to the client roles so the
--    service role (delete-account) is unaffected.
alter table body_photos enable row level security;

drop policy if exists "body photos are self only" on body_photos;
create policy "body photos are self only" on body_photos
  as restrictive for select to authenticated, anon
  using (is_me(email));

-- The same photos as files. Body shots are written to
-- `{email}/body/{date}-{ts}.jpg` inside workout-proof (index.html ~15362),
-- and the read policy on that bucket is can_see() on the first folder
-- segment, per the note at the top of 20260903_avatars.sql. A partner can
-- therefore list `{victim}/body/` and sign a URL for every progress photo in
-- it. This leaves proof photos and avatars shared exactly as before and
-- carves out the body folder only.
drop policy if exists "body photos are never a partner's business" on storage.objects;
create policy "body photos are never a partner's business" on storage.objects
  as restrictive for select to authenticated, anon
  using (
    bucket_id <> 'workout-proof'
    or (storage.foldername(name))[2] is distinct from 'body'
    or is_me((storage.foldername(name))[1])
  );

-- Deleting one must stay possible for its owner and nobody else.
drop policy if exists "body photo files are deleted by their owner" on storage.objects;
create policy "body photo files are deleted by their owner" on storage.objects
  as restrictive for delete to authenticated, anon
  using (
    bucket_id <> 'workout-proof'
    or (storage.foldername(name))[2] is distinct from 'body'
    or is_me((storage.foldername(name))[1])
  );

-- ---------------------------------------------------------------------------
-- 6. encouragements has no migration in this repo at all, so its policies have
--    never been reviewed. The client only ever inserts with itself as sender
--    and only ever reads its own inbox, so capping it at that costs the app
--    nothing and closes the hole if the policy turns out to be loose. Without
--    this, a loose policy means any signed in user can read every message
--    anybody has sent, or push messages into a stranger's inbox.
drop policy if exists "encouragements stay between the two people" on encouragements;
create policy "encouragements stay between the two people" on encouragements
  as restrictive for select to authenticated, anon
  using (is_me(from_email) or is_me(to_email));

drop policy if exists "an encouragement is sent as yourself" on encouragements;
create policy "an encouragement is sent as yourself" on encouragements
  as restrictive for insert to authenticated, anon
  with check (is_me(from_email));

-- ---------------------------------------------------------------------------
-- 7. milestone_badges has no DELETE policy (20260908), so with RLS on, nobody
--    but the service role can remove one. resetMyData() in the client tries to
--    and silently fails, and a badge therefore survives a reset that is meant
--    to wipe the account clean. Self-delete of your own badge is not a
--    security risk: the client already decides eligibility.
drop policy if exists "self can remove own milestone badges" on milestone_badges;
create policy "self can remove own milestone badges" on milestone_badges
  for delete using (is_me(email));

-- ---------------------------------------------------------------------------
-- 8. Verification. Run this file, then sec-rls/verify.sql for the full matrix.
select 'rls hardening applied' as result,
       (select count(*) from pg_trigger
          where tgname in ('lock_partnership_insert_trg', 'lock_group_member_insert_trg',
                           'lock_group_fields_trg', 'lock_profile_trust_fields_trg')) as triggers_installed,
       (select count(*) from pg_policies
          where policyname in ('body photos are self only',
                               'body photos are never a partner''s business',
                               'body photo files are deleted by their owner',
                               'encouragements stay between the two people',
                               'an encouragement is sent as yourself',
                               'self can remove own milestone badges')) as policies_installed;


-- ===========================================================================
-- CONFIRM FIRST. Everything below is left commented out on purpose.
--
-- These tables and functions are used by the client and defined nowhere in
-- this repo, so their current policies were never seen and a blind policy
-- could either miss the hole or break the app. Read the live schema
-- (verify.sql prints the matrix, and `select * from pg_policies where
-- schemaname = 'public'` prints the predicates), then uncomment what applies.
-- ===========================================================================

-- 9. Defence in depth on the can_see() tables. These mirror what the 09-03
--    migration says the existing policies already do, so they should be
--    no-ops. They are commented out because if can_see() turns out to be only
--    part of the real predicate for any of them, a restrictive copy silently
--    empties a partner's timeline, and that is a bad thing to discover after
--    submission. Apply one table at a time and open the app between each.
--
-- create policy "own or visible profiles only" on profiles
--   as restrictive for select to authenticated, anon
--   using (is_me(email) or can_see(email));
-- create policy "own or visible entries only" on fit_entries
--   as restrictive for select to authenticated, anon
--   using (is_me(email) or can_see(email));
-- create policy "own or visible logs only" on exercise_logs
--   as restrictive for select to authenticated, anon
--   using (is_me(email) or can_see(email));
-- create policy "own or visible plans only" on ai_workouts
--   as restrictive for select to authenticated, anon
--   using (is_me(email) or can_see(email));

-- 10. Writes on the same tables. If any of these has an INSERT policy looser
--     than is_me(email), the admin panel's adminAddEntry and adminAddExercise
--     prove the client can write history onto another person's account.
--     Confirm the policies first, then apply.
--
-- create policy "entries are written as yourself" on fit_entries
--   as restrictive for insert to authenticated, anon with check (is_me(email));
-- create policy "logs are written as yourself" on exercise_logs
--   as restrictive for insert to authenticated, anon with check (is_me(email));
-- create policy "plans are written as yourself" on ai_workouts
--   as restrictive for insert to authenticated, anon with check (is_me(email));

-- 11. Tables the client touches that have no definition here and were not
--     covered above: challenge_completions, season_results, arcs,
--     weekly_stakes, ai_usage_log. Confirm each has RLS enabled and at least
--     one policy (verify.sql reports exactly this). ai_usage_log is described
--     in 20260903_push_and_nudges.sql as RLS-on-with-no-policies, which is
--     correct for a service-role-only table; confirm that is still true,
--     because a user who can delete their own rows there resets their AI quota.

-- 12. Buckets. Confirm both are private, which decides whether an object is
--     reachable by guessing its path with no token at all. workout-proof has
--     no migration in this repo, so its `public` flag has never been reviewed
--     here; live-clips is created private by 20260904_live_clips.sql.
--
-- update storage.buckets set public = false where id = 'workout-proof';
-- select id, public, file_size_limit, allowed_mime_types from storage.buckets;
