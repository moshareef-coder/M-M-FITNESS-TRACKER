-- A line about yourself, 2026-09-15. APPLIED 2026-09-15.
--
-- The Profile page has been a name field and a photo since it shipped, while
-- the table underneath it already carried sex, age, height, activity level and
-- an accent_color that nothing in the app has ever read. Mo asked for a
-- profile worth customising, so the page starts exposing what is already
-- there, and this is the one genuinely missing field: the sentence a person
-- writes about themselves.
--
-- 140 characters, enforced here rather than only in the input, because the one
-- place a length limit must hold is the place the row is written. It is short
-- on purpose: this sits under a name on a partner's screen, not on a web page,
-- and a paragraph there would push the thing they came to look at off it.
--
-- No policy change. profiles rows are already readable by a paired partner
-- under "couple can read profiles" and writable only by their owner; a
-- sentence is no more exposing than the photo already sitting next to it.
alter table profiles add column if not exists bio text;

alter table profiles drop constraint if exists profiles_bio_len;
alter table profiles add constraint profiles_bio_len check (bio is null or char_length(bio) <= 140);

comment on column profiles.bio is 'one short line a person writes about themselves, <=140 chars, shown under their name to their partner';
