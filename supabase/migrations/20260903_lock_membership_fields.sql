-- Security fix, 2026-09-03.
--
-- Two privilege escalations found by auditing the RLS policies added with the
-- group and coach model. Both come from the same mistake: a row-level policy
-- decides WHICH rows you may touch, it cannot say WHICH COLUMNS you may change.
-- Both tables let you update your own row, and both carry the columns that
-- decide who you are allowed to see.

-- ---------------------------------------------------------------------------
-- 1. partnerships. Any signed in user could read any other user's whole history.
--
--    The UPDATE policy is `is_me(inviter_email) or is_me(invitee_email)`, and
--    nothing stopped the inviter rewriting invitee_email afterwards. So:
--      insert a partnership naming yourself as inviter,
--      update it to invitee_email = victim, status = 'accepted',
--    and my_partner_email() now returns the victim, which makes can_see(victim)
--    true for profiles, fit_entries, exercise_logs, body_photos, ai_workouts,
--    challenge_completions and season_results. Cost of the attack: knowing an
--    email address.

create or replace function lock_partnership_parties()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if my_email() = '' then return new; end if;   -- service role and cron

  if new.inviter_email is distinct from old.inviter_email
     or new.invitee_email is distinct from old.invitee_email then
    raise exception 'partnership parties cannot be changed';
  end if;

  -- accepting is the invitee's decision, never the inviter's
  if new.status = 'accepted' and old.status is distinct from 'accepted'
     and lower(old.invitee_email) <> my_email() then
    raise exception 'only the invitee can accept an invite';
  end if;

  return new;
end $$;

drop trigger if exists lock_partnership_parties_trg on partnerships;
create trigger lock_partnership_parties_trg
  before update on partnerships
  for each row execute function lock_partnership_parties();

-- ---------------------------------------------------------------------------
-- 2. group_members. Three separate escalations through one policy.
--
--    The UPDATE policy is `is_me(email) or i_own_group(group_id)`, so a client
--    could rewrite their own row:
--      role = 'coach'      -> can_see() grants sight of every other member,
--                             which is the paid members_see_each_other add-on
--      group_id = <any>    -> joins a group they were never invited to. The
--                             seat limit trigger is BEFORE INSERT only, so it
--                             does not fire on an update
--      left_at = null      -> undoes their own removal, since remove_group_member
--                             works by setting left_at
--
--    A member legitimately needs to do exactly two things to their own row:
--    accept an invite, and leave.

create or replace function lock_group_member_fields()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if my_email() = '' then return new; end if;             -- service role and cron
  if i_own_group(old.group_id) then return new; end if;   -- the owner runs the group

  if new.group_id is distinct from old.group_id
     or new.email is distinct from old.email
     or new.role is distinct from old.role then
    raise exception 'members cannot change their group, email or role';
  end if;

  if old.left_at is not null and new.left_at is null then
    raise exception 'rejoining a group needs a new invite';
  end if;

  return new;
end $$;

drop trigger if exists lock_group_member_fields_trg on group_members;
create trigger lock_group_member_fields_trg
  before update on group_members
  for each row execute function lock_group_member_fields();

-- ---------------------------------------------------------------------------
-- 3. allowed_emails. Minor, but free to fix.
--    SELECT was `auth.role() = 'authenticated'`, so any signed in user could
--    read the entire allowlist, which is a list of every email we have let in.
--    Nothing in the app reads this table, checked index.html and coach/.

drop policy if exists "authenticated can check allowlist" on allowed_emails;
create policy "check only my own allowlist entry" on allowed_emails
  for select using (is_me(email));
