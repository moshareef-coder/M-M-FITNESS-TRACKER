-- Which joints hurt, kept where only their owner can read it, 2026-10-04.
--
-- profiles.limits holds the joints somebody said hurt, the kit they do not have, and a
-- free text note. profiles has one SELECT policy, can_see(email), so a partner's app
-- reads the whole row, and loadAll asks for select("*") on both people. Nothing on the
-- partner's screen shows it, but the pain list and the note were on their phone. The
-- legal review (2026-10-04) called it the one real case of a partner holding what the
-- app implies they cannot, and it is health information shared without consent, which
-- is what Washington's My Health My Data Act is about. Row level security guards rows,
-- not columns, so the fix is the body_measurements one: a table of its own.
--
-- TWO STEPS, because the iOS build already on people's phones reads and writes
-- profiles.limits and keeps doing so until the next build replaces it.
--
-- STEP 1 (this block): safe to run as soon as the new web app is live. Creates the
--   table, copies every existing answer across, and mirrors any write the old app still
--   makes to profiles.limits into it, so nothing is lost while both versions exist.
--   The new app reads and writes profile_limits only (index.html, loadAll and
--   saveLimits), and falls back to profiles.limits only while this table is missing.
--
-- STEP 2 (the block at the bottom, commented out): run AFTER the iOS build carrying the
--   2026-10-04 changes is the one people have. It removes the mirror and empties
--   profiles.limits, which is the moment the partner can no longer read it.
--
-- Not covered here: the delete-account edge function must also delete the person's
-- profile_limits row. It is the owner's to change and deploy.

create table if not exists profile_limits (
  email      text primary key,
  limits     jsonb,
  updated_at timestamptz not null default now()
);

comment on table profile_limits is
  'One person''s limits: joints that hurt, kit they do not have, and their note. Split out of profiles on 2026-10-04 because a partner may read every column of profiles and this is health information. Readable and writable by its owner only.';

alter table profile_limits enable row level security;

drop policy if exists "limits are self only" on profile_limits;
create policy "limits are self only" on profile_limits
  for select using (is_me(email));

drop policy if exists "self writes own limits" on profile_limits;
create policy "self writes own limits" on profile_limits
  for insert with check (is_me(email));

drop policy if exists "self updates own limits" on profile_limits;
create policy "self updates own limits" on profile_limits
  for update using (is_me(email)) with check (is_me(email));

drop policy if exists "self deletes own limits" on profile_limits;
create policy "self deletes own limits" on profile_limits
  for delete using (is_me(email));

-- Everything already answered, copied across once.
insert into profile_limits (email, limits, updated_at)
select email, limits, now() from profiles where limits is not null
on conflict (email) do nothing;

-- While the old iOS build is still writing profiles.limits, its writes land here too.
-- SECURITY DEFINER so the copy is not blocked by the table's own policies; it only ever
-- copies the row being written, by the person allowed to write it.
create or replace function mirror_profile_limits() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  -- tg_op first: on an INSERT there is no OLD row to compare against.
  if tg_op = 'INSERT' then
    insert into profile_limits (email, limits, updated_at) values (new.email, new.limits, now())
    on conflict (email) do update set limits = excluded.limits, updated_at = now();
  elsif new.limits is distinct from old.limits then
    insert into profile_limits (email, limits, updated_at) values (new.email, new.limits, now())
    on conflict (email) do update set limits = excluded.limits, updated_at = now();
  end if;
  return new;
end $$;

drop trigger if exists mirror_profile_limits on profiles;
create trigger mirror_profile_limits after insert or update of limits on profiles
  for each row execute function mirror_profile_limits();   -- clearing limits on the old app clears them here too

select 'profile_limits ready' as result,
       (select count(*) from profile_limits) as rows_copied,
       (select count(*) from pg_policies where tablename = 'profile_limits') as policies;

-- ============================================================================
-- STEP 2: after the new iOS build is out. Uncomment and run on its own.
-- ============================================================================
-- drop trigger if exists mirror_profile_limits on profiles;
-- drop function if exists mirror_profile_limits();
-- update profiles set limits = null where limits is not null;
-- select 'profiles.limits emptied' as result,
--        (select count(*) from profiles where limits is not null) as still_set;
