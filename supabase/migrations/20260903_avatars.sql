-- Profile photos, 2026-09-03.
--
-- No storage policy work needed. The workout-proof bucket already keys on the
-- first folder segment being your email: is_me() to write, can_see() to read.
-- So an avatar at "you@example.com/avatar/123.jpg" is already writable by you
-- and readable by your partner and your coach, with nothing new to grant.
--
-- All this needs is somewhere to remember which file is the current one.

alter table profiles add column if not exists avatar_path text;

select 'avatar column ready' as result,
       count(*) as found
from information_schema.columns
where table_name = 'profiles' and column_name = 'avatar_path';
