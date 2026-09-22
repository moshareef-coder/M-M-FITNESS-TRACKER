-- Body photos, made shareable, opt-in only, default off.
-- 2026-09-21.
--
-- Mo: "let's have the progress pictures in here, but always make them
-- deselected... it shouldn't have its own separate one, it should be inside
-- of what [partner] sees on progress, like weight or whatever." "photos"
-- joined PROGRESS_SHARE_KEYS in index.html and is stored in the same
-- profiles.progress_hidden array 20260921_progress_hidden.sql added, with
-- its meaning flipped: for every other key in that picker, presence in the
-- array means HIDDEN (default shared); for photos, presence means the one
-- time it was switched ON (default hidden). See progressKeyShared() in
-- index.html, which is the one place that distinction is decided.
--
-- This migration is the server half of that. 20260911_rls_hardening.sql
-- deliberately locked body_photos and its storage folder to self-only,
-- after finding the sharing had been accidental ("of photographs of
-- somebody's body"). That lockdown stays the DEFAULT here; this only adds
-- a narrow, explicit exception for the one case that is now a real,
-- consenting, opt-in feature: a paired partner, and only once the person in
-- the photo has turned photo sharing on for themselves. Nobody is opted in
-- by this migration running; every existing account already reads as "off"
-- under the new column, so this changes nothing until somebody touches the
-- new switch.
--
-- Depends on 20260921_progress_hidden.sql having already run (needs
-- profiles.progress_hidden to exist). Run that one first if it has not.

-- 1. The table itself: same restrictive policy, same name, widened by one
--    OR branch. can_see() re-verifies the partnership server-side rather
--    than trusting the client's PARTNER_EMAIL; the exists() re-checks the
--    PHOTO OWNER'S OWN progress_hidden, never the viewer's, so a partner
--    cannot opt themselves into seeing photos the owner never agreed to
--    show.
drop policy if exists "body photos are self only" on body_photos;
create policy "body photos are self only, unless shared" on body_photos
  as restrictive for select to authenticated, anon
  using (
    is_me(email)
    or (
      can_see(email)
      and exists (
        select 1 from profiles p
        where lower(p.email) = lower(body_photos.email)
          and coalesce(p.progress_hidden ? 'photos', false)
      )
    )
  );

-- 2. The files behind those rows. A visible row with a 403 on its signed
--    URL is a broken image, not privacy, so the storage policy needs the
--    same exception on the same terms: the folder's own email decides,
--    checked against ITS OWN progress_hidden, not the requester's.
drop policy if exists "body photos are never a partner's business" on storage.objects;
create policy "body photos are self only, unless shared" on storage.objects
  as restrictive for select to authenticated, anon
  using (
    bucket_id <> 'workout-proof'
    or (storage.foldername(name))[2] is distinct from 'body'
    or is_me((storage.foldername(name))[1])
    or (
      can_see((storage.foldername(name))[1])
      and exists (
        select 1 from profiles p
        where lower(p.email) = lower((storage.foldername(name))[1])
          and coalesce(p.progress_hidden ? 'photos', false)
      )
    )
  );

-- Deleting stays owner-only, unconditionally. Sharing a photo is not the
-- same decision as letting somebody else delete it, and nothing about this
-- feature asked for the second one.
-- (20260911's "body photo files are deleted by their owner" policy is
-- untouched, on purpose, and is not repeated here.)

select 'body_photos sharing policies ready' as result;

-- rollback: restore the 20260911 self-only policies verbatim.
--   drop policy if exists "body photos are self only, unless shared" on body_photos;
--   create policy "body photos are self only" on body_photos
--     as restrictive for select to authenticated, anon
--     using (is_me(email));
--   drop policy if exists "body photos are self only, unless shared" on storage.objects;
--   create policy "body photos are never a partner's business" on storage.objects
--     as restrictive for select to authenticated, anon
--     using (
--       bucket_id <> 'workout-proof'
--       or (storage.foldername(name))[2] is distinct from 'body'
--       or is_me((storage.foldername(name))[1])
--     );
