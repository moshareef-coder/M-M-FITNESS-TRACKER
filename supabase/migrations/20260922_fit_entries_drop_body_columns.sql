-- The six columns leave fit_entries. NOT SAFE TO RUN YET. 2026-09-21.
--
-- This is the second half of 20260921_body_measurements_table.sql and the
-- statement that actually closes the privacy hole. Everything up to here
-- prepares; this is the moment a partner with share_weigh_ins = false stops
-- being able to read the number, because the number is no longer in a row
-- their policy lets them see.
--
-- WHY IT IS A SEPARATE FILE AND WHY IT WAITS. Dropping these columns breaks
-- every version of the app that still reads them. The client that is live at
-- the time this is written selects fit_entries with select("*") and expects
-- weight on the row it gets back; run this against that client and every
-- weigh-in in the app vanishes from the charts, the hero and the calendar in
-- the same second, on real accounts, with no error anybody would see. There
-- is no ordering of statements inside one file that avoids that. So the
-- ordering has to be across time instead, and it has to be written down where
-- the person running it will read it, which is here.
--
-- RUN THIS ONLY AFTER ALL THREE ARE TRUE:
--   1. 20260921_body_measurements_table.sql has run and reported its row
--      count.
--   2. The app version that reads and writes body_measurements is DEPLOYED
--      and live, on the web and in whatever iOS build is in front of people.
--      An old Capacitor bundle on somebody's phone is a live client too, and
--      it will not update itself because a migration ran.
--   3. Somebody has actually used it: logged a weigh-in, corrected one on an
--      old day, removed one, saved a tape reading, and opened a partner's
--      Progress tab with the weigh-in switch both on and off. "The deploy
--      went out" is not the same sentence as "the weigh-in came back".
--
-- The check below is not a substitute for any of that. It only proves the
-- readings were copied, which says nothing about which code is running.

do $$
declare
  left_behind bigint;
begin
  select count(*) into left_behind
  from fit_entries f
  where (f.weight is not null or f.waist_in is not null or f.hips_in is not null
         or f.thigh_in is not null or f.arm_in is not null or f.chest_in is not null)
    and not exists (
      select 1 from body_measurements b
      where lower(b.email) = lower(f.email) and b.entry_date = f.entry_date
    );

  if left_behind > 0 then
    raise exception 'refusing to drop: % fit_entries rows carry a reading body_measurements has no row for. Run the catch up at the bottom of 20260921_body_measurements_table.sql first', left_behind;
  end if;
end $$;

alter table fit_entries drop column if exists weight;
alter table fit_entries drop column if exists waist_in;
alter table fit_entries drop column if exists hips_in;
alter table fit_entries drop column if exists thigh_in;
alter table fit_entries drop column if exists arm_in;
alter table fit_entries drop column if exists chest_in;

select 'fit_entries body columns dropped' as result,
       (select count(*) from information_schema.columns
         where table_name = 'fit_entries'
           and column_name in ('weight', 'waist_in', 'hips_in', 'thigh_in', 'arm_in', 'chest_in')) as still_there;

-- Rollback is a restore, not a command. Adding the columns back is one line
-- each and gives you six empty columns; the readings that were in them are in
-- body_measurements, and copying them back is the insert in
-- 20260921_body_measurements_table.sql run in the other direction. If this
-- needs undoing in a hurry the honest move is to leave fit_entries alone and
-- put the previous app version back, since the data is not the thing that
-- broke.
