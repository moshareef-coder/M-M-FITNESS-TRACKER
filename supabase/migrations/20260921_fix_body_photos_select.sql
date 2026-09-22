-- Restore reading your own body photos, 2026-09-21.
--
-- 20260921_share_body_photos.sql dropped the old permissive SELECT policy
-- ("body photos are self only") and replaced it with a RESTRICTIVE one that
-- carries the same USING clause. That is the bug: a restrictive policy is
-- ANDed onto the OR of the permissive policies on the table, and this table
-- was left with zero permissive SELECT policies. Postgres's default for zero
-- permissive policies is deny, so the restrictive clause never runs at all,
-- and every SELECT returns nothing, including to the photo's own owner.
--
-- Verified live rather than reasoned: as the real authenticated role with
-- mo.shareef's own claims, `select count(*) from body_photos where email =
-- 'mo.shareef@creativelab1.com'` returns 0, while the files themselves are
-- still sitting in storage. loadBodyPhotos() in index.html therefore always
-- gets back an empty array, so the opt-in sharing feature this same migration
-- was written to add cannot work either: the row it would share is invisible
-- to begin with.
--
-- The fix is not to touch the restrictive policy, which is correctly written
-- and does the job it was added for (photos of hers are shared with me only
-- when she opted in AND I am someone she can see). It needs a permissive gate
-- back under it to actually admit rows in the first place. Restated here as
-- the same clause so the two together mean exactly what the restrictive
-- policy alone was trying to say: is_me is always allowed, can_see is gated
-- by that check being restrictive.
create policy "read body photos you may see" on body_photos
  for select to authenticated
  using (is_me(email) or can_see(email));

-- Verify after running: as your own account, your own body photos must come
-- back non-empty. As your partner, theirs come back only when they opted in.
-- select count(*) from body_photos where email = '<your email>';
