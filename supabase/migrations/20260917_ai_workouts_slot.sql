-- Two lifting sessions in one day.
--
-- Mo: "they can have like two sessions in one day, one's for yoga, one's for
-- this." Most of that pairing already works and needs nothing from the
-- database: an activity (the yoga class, the run) is an exercise_logs row with
-- duration_min on it and never touches this table, so the morning class and the
-- evening lift are already two independent records that cannot mark each other
-- done. The weekly ring counts distinct entry_dates, so two sessions on a
-- Tuesday has always been one Tuesday.
--
-- The half that does not work is two LIFTING PLANS. ai_workouts is unique on
-- (email, entry_date) and every writer in index.html upserts on exactly that
-- conflict target, so generating an afternoon plan overwrites the morning one
-- even after it was finished and archived. The sets survive in exercise_logs
-- and the gym day survives in fit_entries, so nothing a person did is lost; the
-- record of WHAT they were asked to do is. "Legs this morning, arms tonight" is
-- an ordinary Saturday, and the app cannot remember the morning half of it.
--
-- `slot` is the ordinal of a plan within its day. Everything written so far is
-- slot 0, which is what the default gives every existing row, so the app that
-- is live today keeps behaving exactly as it does now: it upserts slot 0 and
-- overwrites slot 0.
--
-- DEPLOY ORDER MATTERS AND IS NOT SAFE IN BOTH DIRECTIONS. Dropping the old
-- unique constraint breaks every `on_conflict=email,entry_date` upsert in the
-- shipped app with Postgres 42P10, "no unique or exclusion constraint matching
-- the ON CONFLICT specification", which is every workout save in the product.
-- So this migration must not be run until an app version is deployed that
-- conflicts on (email, entry_date, slot). That version is not written yet, and
-- writing a migration that bricks the live app the moment somebody runs it
-- would be worse than saying plainly that it is not ready. This file is the
-- statement of the fix, not the fix being applied.
--
-- Run it only alongside the app change, in this order: deploy an app that sends
-- slot and conflicts on the three columns WITH a 42P10 fallback to the old two,
-- confirm it, then run this, then remove the fallback.

alter table ai_workouts add column if not exists slot smallint not null default 0;

comment on column ai_workouts.slot is
  'which plan within the day: 0 is the day''s main workout, 1 the second session. Unique with (email, entry_date).';

-- The existing constraint. Named by whatever created it, so this finds it
-- rather than guessing, and says what it found instead of failing silently.
do $$
declare
  conname_found text;
begin
  select c.conname into conname_found
  from pg_constraint c
  join pg_class t on t.oid = c.conrelid
  where t.relname = 'ai_workouts'
    and c.contype = 'u'
    and (select array_agg(a.attname order by a.attname)
         from unnest(c.conkey) k
         join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k)
        = array['email', 'entry_date']::text[];

  if conname_found is null then
    raise notice 'no (email, entry_date) unique constraint on ai_workouts, nothing to swap';
  else
    execute format('alter table ai_workouts drop constraint %I', conname_found);
    raise notice 'dropped %', conname_found;
  end if;
end $$;

alter table ai_workouts
  add constraint ai_workouts_email_date_slot_key unique (email, entry_date, slot);

select 'ai_workouts.slot ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'ai_workouts' and column_name = 'slot') as has_column;

-- Rollback, which is only safe once no row carries a slot above 0:
-- delete from ai_workouts where slot > 0;
-- alter table ai_workouts drop constraint ai_workouts_email_date_slot_key;
-- alter table ai_workouts add constraint ai_workouts_email_entry_date_key unique (email, entry_date);
-- alter table ai_workouts drop column slot;
