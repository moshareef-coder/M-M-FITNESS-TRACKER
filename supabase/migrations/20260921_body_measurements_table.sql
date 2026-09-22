-- Weight and the tape move off the day row, so the privacy switch is real.
-- 2026-09-21. RUN THIS ONE FIRST. See DEPLOY ORDER at the bottom.
--
-- WHAT IS BROKEN. Mo: "users can see anything that the partner has, except if
-- they check it off, so if they want to hide their weigh-ins they can hide
-- their weigh-ins, that's completely up to them." The app honours that. The
-- database does not. fit_entries has exactly one SELECT policy, "couple can
-- read fit_entries", whose whole predicate is can_see(email), and there is no
-- mention of share_weigh_ins anywhere in it. Verified live on 2026-09-21 as a
-- real authenticated partner (set local role authenticated, jwt claims set,
-- inside a rolled back transaction, NOT the service role, which bypasses RLS
-- and would have proved nothing): a partner whose other half has
-- share_weigh_ins = false still gets every one of their fit_entries rows,
-- weight column included. partnerSharesBody() in index.html is a curtain in
-- front of a window that is still open. Anybody reading the table directly,
-- or running a modified client, sees the number.
--
-- 20260920_share_weigh_ins.sql said this would happen and said what the fix
-- would have to be, in its own words: "the fix is not a policy here. It is
-- moving weight and the four tape columns out of fit_entries into their own
-- table with their own predicate, at which point RLS can enforce it for
-- real." This is that file.
--
-- WHY NOT JUST GATE fit_entries' SELECT POLICY. Because row security is ROW
-- level and that row is not only a weigh-in. The same row carries gym,
-- sessions, rest_day, workout_at, proof_path and note: the training-day
-- signal the calendar dots, the streak, the week ring and the "days together"
-- counter are all counted off. Adding "and share_weigh_ins" to that policy
-- would hide whether somebody TRAINED on every day they also stepped on a
-- scale, which is a worse bug than the one being fixed and it would be
-- invisible: the partner's calendar would simply have holes in it on the days
-- that mattered most. Six columns leave; nothing else about fit_entries
-- changes, its policies included.

-- ---------------------------------------------------------------------------
-- 1. The table. Keyed exactly the way fit_entries is, (email, entry_date),
--    because a reading is still a thing you took on a day and every writer in
--    index.html already upserts on that pair. No user_name: fit_entries
--    carries one for historical reasons and it is a second copy of something
--    profiles already answers. No id either, the key is the key.
create table if not exists body_measurements (
  email      text not null,
  entry_date date not null,
  weight     numeric,
  waist_in   numeric,
  hips_in    numeric,
  thigh_in   numeric,
  arm_in     numeric,
  chest_in   numeric,
  created_at timestamptz not null default now(),
  primary key (email, entry_date)
);

comment on table body_measurements is
  'One person''s body readings for one day: the weigh-in and the five tape measurements. Split out of fit_entries on 2026-09-21 so profiles.share_weigh_ins could be enforced in RLS, which is impossible while these sit in a column of a row a partner is allowed to read. fit_entries keeps the training day (gym, sessions, rest_day, workout_at, proof_path, note) and keeps its own policy, so hiding a weigh-in never hides whether somebody trained.';
comment on column body_measurements.weight is 'body weight in pounds, taken that day; null when not weighed. Was fit_entries.weight';
comment on column body_measurements.waist_in is 'waist circumference in inches; null when not measured. Was fit_entries.waist_in';
comment on column body_measurements.hips_in is 'hip circumference in inches; null when not measured. Was fit_entries.hips_in';
comment on column body_measurements.thigh_in is 'thigh circumference in inches, one side, whichever you always use; null when not measured. Was fit_entries.thigh_in';
comment on column body_measurements.arm_in is 'upper arm circumference in inches, one side; null when not measured. Was fit_entries.arm_in';
comment on column body_measurements.chest_in is 'chest circumference in inches; null when not measured. Was fit_entries.chest_in';

-- ---------------------------------------------------------------------------
-- 2. The backfill. Every fit_entries row carrying any one of the six, copied
--    across as it stands. Safe on the live database with real accounts in it:
--    it reads fit_entries and writes only the new table, it takes no locks
--    anybody is waiting on, and "on conflict do nothing" makes it re-runnable.
--    Today that is 259 rows with a weight and none at all with a tape reading
--    (the measurement columns shipped but no screen has written one yet),
--    which is small enough that this is one statement and not a batched loop.
--
--    created_at rides along rather than defaulting to now(), so the age of a
--    reading survives the move. A day row with no readings on it is not
--    copied: an empty row here would read as "measured nothing", which is
--    what the absence of a row already says.
insert into body_measurements (email, entry_date, weight, waist_in, hips_in, thigh_in, arm_in, chest_in, created_at)
select email, entry_date, weight, waist_in, hips_in, thigh_in, arm_in, chest_in, coalesce(created_at, now())
  from fit_entries
 where weight is not null
    or waist_in is not null
    or hips_in is not null
    or thigh_in is not null
    or arm_in is not null
    or chest_in is not null
on conflict (email, entry_date) do nothing;

-- ---------------------------------------------------------------------------
-- 3. The policies, which are the entire point of the file.
--
--    SELECT is the one that differs from fit_entries, and it differs in
--    exactly one clause: the OWNER'S OWN share_weigh_ins has to be true.
--    Read against body_measurements.email and never against the viewer, so a
--    partner cannot opt themselves into seeing something the owner never
--    agreed to show, which is the same shape 20260921_share_body_photos.sql
--    uses for photos and for the same reason. can_see() is still there too:
--    the switch widens nothing, it only narrows what the partnership already
--    allowed.
--
--    `is true` and not `is not false`, matching partnerSharesBody() in
--    index.html, which reads `=== true` on purpose: a profile written before
--    20260920_share_weigh_ins.sql ran has no value there, and "nobody has
--    ever answered this question" has to mean not shared. Null reads as off
--    on both sides of the wire.
--
--    ONE SWITCH FOR ALL SIX COLUMNS, deliberately. share_weigh_ins is
--    documented as covering "this account's weigh-ins and tape measurements",
--    and the client already treats them as one question: bodyShared in
--    renderProgressTab bars cardWeight AND turns the recomp screen, which is
--    the tape screen, back into the habit screen; renderProgressWithheld says
--    out loud "their weight, their goal weight and their tape are not here".
--    profiles.progress_hidden is NOT consulted here and must not be: its own
--    migration says in as many words that it is "deliberately not for weight
--    and the tape (share_weigh_ins is that question, and stays that
--    question)", and PROGRESS_SHARE_KEYS in index.html carries no key for
--    either. A server rule that checked it would be enforcing a promise the
--    app has never made.
alter table body_measurements enable row level security;

drop policy if exists "body readings are self only, unless weigh-ins are shared" on body_measurements;
create policy "body readings are self only, unless weigh-ins are shared" on body_measurements
  for select using (
    is_me(email)
    or (
      can_see(email)
      and exists (
        select 1 from profiles p
        where lower(p.email) = lower(body_measurements.email)
          and p.share_weigh_ins is true
      )
    )
  );

-- Writing is self only, on all three verbs, which is stricter than
-- fit_entries has ever needed to be about INSERT and costs nothing: nothing
-- in the app has ever written a reading onto somebody else's day.
drop policy if exists "self writes own body readings" on body_measurements;
create policy "self writes own body readings" on body_measurements
  for insert with check (is_me(email));

drop policy if exists "self updates own body readings" on body_measurements;
create policy "self updates own body readings" on body_measurements
  for update using (is_me(email)) with check (is_me(email));

drop policy if exists "self deletes own body readings" on body_measurements;
create policy "self deletes own body readings" on body_measurements
  for delete using (is_me(email));

select 'body_measurements ready' as result,
       (select count(*) from body_measurements) as rows_backfilled,
       (select count(*) from pg_policies where tablename = 'body_measurements') as policies;

-- ---------------------------------------------------------------------------
-- DEPLOY ORDER. Four steps, in this order, and the third one is not optional.
--
--   1. Run THIS file. Nothing breaks: the six columns are still on
--      fit_entries, the app that is live today still reads and writes them
--      there, and this table is simply a copy nobody is looking at yet.
--   2. Deploy the app version that reads and writes body_measurements. From
--      that moment the client ignores the fit_entries copies entirely, so the
--      two stop being kept in step and the fit_entries copies begin going
--      stale. That is expected and it is why step 4 exists.
--   3. Confirm it: log a weigh-in, correct one on an old day, remove one, log
--      a tape reading, and check a partner's Progress tab in both states of
--      their switch. Until this is confirmed the hole is still open, because
--      the weight is still sitting on fit_entries where the old policy can
--      reach it.
--   4. Run 20260922_fit_entries_drop_body_columns.sql, which drops the six
--      columns and is the statement that actually closes the leak.
--
-- THE GAP BETWEEN 1 AND 2. An old client is still writing weigh-ins to
-- fit_entries during that window and this table will not have them. Keep the
-- window to minutes and it is nothing; if it runs longer, run the catch up
-- below ONCE, immediately after step 2 and before anybody has used the new
-- app in anger. Not after that: once the new app is live a null here is a
-- reading somebody deliberately deleted, and coalescing the old column back
-- over it would resurrect a number they asked to be rid of.
--
-- insert into body_measurements (email, entry_date, weight, waist_in, hips_in, thigh_in, arm_in, chest_in, created_at)
-- select email, entry_date, weight, waist_in, hips_in, thigh_in, arm_in, chest_in, coalesce(created_at, now())
--   from fit_entries
--  where weight is not null or waist_in is not null or hips_in is not null
--     or thigh_in is not null or arm_in is not null or chest_in is not null
-- on conflict (email, entry_date) do update set
--   weight   = coalesce(body_measurements.weight,   excluded.weight),
--   waist_in = coalesce(body_measurements.waist_in, excluded.waist_in),
--   hips_in  = coalesce(body_measurements.hips_in,  excluded.hips_in),
--   thigh_in = coalesce(body_measurements.thigh_in, excluded.thigh_in),
--   arm_in   = coalesce(body_measurements.arm_in,   excluded.arm_in),
--   chest_in = coalesce(body_measurements.chest_in, excluded.chest_in);
--
-- rollback, safe while the six columns are still on fit_entries:
--   drop table if exists body_measurements;
