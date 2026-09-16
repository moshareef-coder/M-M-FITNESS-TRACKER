-- Reporting content and blocking people, 2026-09-16.
--
-- App Store Review Guideline 1.2 requires three things of any app carrying
-- user generated content: a way to report objectionable material, a way to
-- block an abusive user, and the developer acting on reports. This app carries
-- video between two people and had none of them, which is a refusal on
-- submission and not a matter of judgement.
--
-- It is also the right thing on its own terms. The app is built around one
-- person you have chosen, and everything in it assumes that choice is a good
-- one. When it stops being a good one, the whole product is a channel somebody
-- cannot close. "Unpair" was the nearest thing and it is not the same: it ends
-- an arrangement, and the person can ask again tomorrow.
--
-- Two separate mechanisms on purpose:
--   report  says "look at this thing", and is about content.
--   block   says "this person is done", and is about a person.
-- Reporting somebody does not silently cut them off, because an accidental
-- report should not end a relationship, and blocking does not file a report,
-- because most people who walk away do not want to make a case.

-- ---------------------------------------------------------------------------
-- 1. Reports.
-- ---------------------------------------------------------------------------

create table if not exists content_reports (
  id             uuid primary key default gen_random_uuid(),
  reporter_email text not null,
  subject_email  text not null,
  -- What was reported: 'clip', 'proof', 'message', 'profile'. Free text rather
  -- than an enum so a new surface can be reported the day it ships, instead of
  -- the report being the thing that fails.
  kind           text not null,
  -- The row it points at, where there is one. Null for 'profile'.
  ref_id         uuid,
  -- The storage object, kept separately from ref_id because the row can be
  -- deleted and the file is the evidence.
  evidence_path  text,
  reason         text not null,
  note           text,
  created_at     timestamptz not null default now(),
  -- Filled in by whoever acts on it. Untouchable from the app.
  handled_at     timestamptz,
  action_taken   text
);

create index if not exists content_reports_open
  on content_reports (created_at desc) where handled_at is null;

alter table content_reports enable row level security;

-- You can file one as yourself and read your own back, so the app can say "you
-- reported this" rather than offering the button again. Nothing in the app may
-- change or delete a report: a report somebody can retract under pressure is
-- not a safety mechanism, and the twenty four hour obligation is ours.
drop policy if exists "file a report as yourself" on content_reports;
create policy "file a report as yourself" on content_reports
  for insert with check (is_me(reporter_email));

drop policy if exists "read your own reports" on content_reports;
create policy "read your own reports" on content_reports
  for select using (is_me(reporter_email));

-- ---------------------------------------------------------------------------
-- 2. Reported clips survive.
-- ---------------------------------------------------------------------------

-- A clip deletes itself when it is watched and the sweeper takes the rest after
-- two hours. That is the feature, and it is also the reason a report would have
-- arrived pointing at nothing: by the time anybody looked, the file was gone
-- and there was no way to act on it. A reported clip stops expiring.
alter table live_clips add column if not exists reported_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. Blocks.
-- ---------------------------------------------------------------------------

create table if not exists blocks (
  blocker_email text not null,
  blocked_email text not null,
  created_at    timestamptz not null default now(),
  primary key (blocker_email, blocked_email)
);

alter table blocks enable row level security;

-- Only ever your own list, in every direction. Being able to read who has
-- blocked you would turn a quiet exit into a confrontation.
drop policy if exists "your own blocks" on blocks;
create policy "your own blocks" on blocks
  for all using (is_me(blocker_email)) with check (is_me(blocker_email));

-- ---------------------------------------------------------------------------
-- 4. Blocking, as one operation.
-- ---------------------------------------------------------------------------

-- Everything a block has to mean, in one transaction, because a block that
-- half applies is worse than none: it reports success while leaving the
-- channel open.
--
-- 'declined' rather than 'ended' on the partnership is the deliberate part.
-- The consent work in 20260915 made 'declined' final and unaskable, which is
-- exactly a block: they cannot send a new request, and the client already has
-- the screen that explains a standing refusal. 'ended' would let them ask again
-- tomorrow, which is what unpairing means and not what this means.
create or replace function block_person(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  me    text;
  other text;
begin
  me := my_email();
  if me = '' then raise exception 'not signed in'; end if;
  other := lower(trim(coalesce(p_email, '')));
  if other = '' then raise exception 'who?'; end if;
  if other = me then raise exception 'you cannot block yourself'; end if;

  insert into blocks (blocker_email, blocked_email) values (me, other)
    on conflict do nothing;

  -- Any live arrangement between the two of them, in either direction, ends
  -- and cannot be restarted by the blocked person.
  update partnerships
     set status = 'declined', responded_at = now()
   where status in ('accepted', 'pending')
     and ((lower(inviter_email) = me and lower(invitee_email) = other)
       or (lower(inviter_email) = other and lower(invitee_email) = me));

  -- Anything of theirs already sitting in front of me goes now rather than
  -- waiting for a sweeper. A block should be felt immediately by the person who
  -- asked for it; being shown one more clip from somebody you just blocked is
  -- the app arguing with them.
  --
  -- The storage objects are left to expire-clips, which already sweeps by age:
  -- this function cannot reach the storage API, and a row without a file is
  -- harmless where a file without a row is not.
  delete from live_clips
   where (lower(from_email) = other and lower(to_email) = me)
      or (lower(from_email) = me and lower(to_email) = other);

  delete from encouragements
   where (lower(from_email) = other and lower(to_email) = me)
      or (lower(from_email) = me and lower(to_email) = other);

  -- Their view of me stops too. A live_sessions row is what makes somebody
  -- watchable, so leaving mine standing would keep me visible to a person I
  -- just blocked until the workout happened to end.
  delete from live_sessions where lower(email) = me;

  return jsonb_build_object('ok', true, 'blocked', other);
end $$;

revoke all on function block_person(text) from public;
grant execute on function block_person(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. A block outranks a pairing request.
-- ---------------------------------------------------------------------------

-- The partnership row is already 'declined', which stops the blocked person
-- asking again through redeem_invite_code. This closes the other direction:
-- somebody who blocked a person should not be able to walk back into it by
-- typing their code, without unblocking first and meaning it.
create or replace function i_blocked(p_email text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from blocks
     where blocker_email = my_email()
       and blocked_email = lower(trim(coalesce(p_email, '')))
  );
$$;

revoke all on function i_blocked(text) from public;
grant execute on function i_blocked(text) to authenticated;

-- Clips cannot be sent to somebody who has blocked you, and cannot be sent to
-- somebody you have blocked. The existing policy already requires an accepted
-- partnership, which a block destroys, so this is belt and braces against a
-- row that outlives the block by a moment.
drop policy if exists "send a clip to your partner" on live_clips;
create policy "send a clip to your partner" on live_clips
  for insert with check (
    is_me(from_email)
    and lower(to_email) = my_partner_email()
    and not exists (
      select 1 from blocks
       where (blocker_email = lower(to_email) and blocked_email = my_email())
          or (blocker_email = my_email() and blocked_email = lower(to_email))
    )
  );

select 'report and block ready' as result,
       (select count(*) from pg_tables where tablename = 'content_reports') as reports_table,
       (select count(*) from pg_tables where tablename = 'blocks') as blocks_table,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'block_person') as block_fn;
