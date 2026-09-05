-- Clip replays, 2026-09-05.
--
-- A clip used to end the moment it finished playing. That is harsher than it
-- needs to be: you glance away, and the thing your partner filmed for you is
-- gone unwatched. Now it loops for as long as you stay on it, and closing it
-- spends one watch. You get two: the one you are in, and one more afterwards.
--
-- Counting watches, not plays, is the point. Looping forever inside one
-- sitting is free; walking away is what costs.
alter table live_clips add column if not exists views smallint not null default 0;

-- The inbox now asks "has this been watched twice", so viewed_at is free to
-- mean what it says: when the recipient first saw it. The sender can read
-- their own sent rows, so that is a real "they saw it" signal for later.
comment on column live_clips.views is 'watch sessions spent by the recipient, 2 and the app destroys the row and the file';

-- Note: RLS guards rows, not columns, so the recipient could in principle
-- write views back to 0. That is not worth a trigger here. By the time they
-- could, the video has already been on their device, and the person who would
-- be fooled is themselves.
select 'live_clips.views ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'live_clips' and column_name = 'views') as has_column;
