-- Per workout privacy, 2026-09-05.
--
-- profiles.share_workout_details is the standing answer. This is the one for
-- today: some sessions you want watched and some you do not, and that choice
-- belongs at the moment you press Begin, not buried in Settings.
--
-- Three switches exist in the app. Only two need columns:
--   "let them see me live"     -> no live_sessions row is published at all,
--                                 so there is nothing on the server to leak.
--   "let them see what I'm doing" -> details_shared
--   "let them send me things"     -> allow_cheers
alter table live_sessions add column if not exists details_shared boolean not null default true;
alter table live_sessions add column if not exists allow_cheers   boolean not null default true;

-- allow_cheers has to bite in the database, not just grey out a button: the
-- sender is the one holding the phone, so client-side is not enforcement.
-- Security definer because the sender must be able to test the recipient's
-- row under the recipient's own visibility, not their own.
create or replace function cheers_allowed(target text) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select allow_cheers from live_sessions where lower(email) = lower(target)), false);
$$;

-- Note this also closes a gap that predates the feature: a clip could be sent
-- to a partner who was not training at all. No live row now means no clip.
drop policy if exists "partner sends a clip" on live_clips;
create policy "partner sends a clip" on live_clips
  for insert with check (
    is_me(from_email)
    and lower(to_email) = my_partner_email()
    and cheers_allowed(to_email)
  );

-- The policy this replaces. Permissive policies are OR'd, so leaving it in
-- place would have made the check above decorative.
drop policy if exists "send a clip to your partner" on live_clips;
