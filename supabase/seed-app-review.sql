-- The App Review account, set up so a reviewer can reach everything.
-- Idempotent: safe to run again.

-- 1. A partner for them. Its own account, not one already paired to a real
--    person, so seeding this cannot unpair anybody.
insert into profiles (email, user_name, invite_code, goal, challenge_target, theme)
values ('demo.partner.review@fake.local', 'Sam', 'REVSAM', 'Build muscle', 4, 'dark')
on conflict (email) do update set user_name = excluded.user_name;

-- 2. Paired, and accepted, which is what makes Block reachable at all.
insert into partnerships (inviter_email, invitee_email, status, responded_at, shared_weekly_goal)
select 'demo.partner.review@fake.local', 'appreview@creativelab1.com', 'accepted', now(), 4
where not exists (
  select 1 from partnerships
   where status = 'accepted'
     and ((lower(inviter_email) = 'demo.partner.review@fake.local' and lower(invitee_email) = 'appreview@creativelab1.com')
       or (lower(inviter_email) = 'appreview@creativelab1.com' and lower(invitee_email) = 'demo.partner.review@fake.local'))
);

-- 3. Six weeks of history for both, modelled on a real account rather than
--    invented, so the charts, the streak and the records all have something
--    true shaped to draw. Dates are rebased to end yesterday.
insert into fit_entries (user_name, email, entry_date, weight, gym, sessions, rest_day, note, workout_at)
select 'appreview', 'appreview@creativelab1.com',
       (current_date - 1) - (row_number() over (order by f.entry_date desc) - 1)::int,
       f.weight, f.gym, f.sessions, f.rest_day, null,
       case when f.gym then ((current_date - 1) - (row_number() over (order by f.entry_date desc) - 1)::int)::timestamptz + interval '18 hours' end
  from fit_entries f
 where lower(f.email) = 'demo.partner@fake.local'
 order by f.entry_date desc
 limit 42
on conflict do nothing;

insert into fit_entries (user_name, email, entry_date, weight, gym, sessions, rest_day, note, workout_at)
select 'Sam', 'demo.partner.review@fake.local',
       (current_date - 1) - (row_number() over (order by f.entry_date desc) - 1)::int,
       f.weight, f.gym, f.sessions, f.rest_day, null,
       case when f.gym then ((current_date - 1) - (row_number() over (order by f.entry_date desc) - 1)::int)::timestamptz + interval '7 hours' end
  from fit_entries f
 where lower(f.email) = 'demo.partner.jawa@fake.local'
 order by f.entry_date desc
 limit 42
on conflict do nothing;

-- 4. The lifts behind those days, so Progress and personal records are real.
insert into exercise_logs (user_name, email, entry_date, exercise_name, weight, reps, sets, duration_min)
select 'appreview', 'appreview@creativelab1.com',
       e.entry_date + (current_date - 1 - (select max(entry_date) from exercise_logs where lower(email) = 'demo.partner@fake.local')),
       e.exercise_name, e.weight, e.reps, e.sets, e.duration_min
  from exercise_logs e
 where lower(e.email) = 'demo.partner@fake.local'
   and e.entry_date > (select max(entry_date) - 42 from exercise_logs where lower(email) = 'demo.partner@fake.local')
on conflict do nothing;

insert into exercise_logs (user_name, email, entry_date, exercise_name, weight, reps, sets, duration_min)
select 'Sam', 'demo.partner.review@fake.local',
       e.entry_date + (current_date - 1 - (select max(entry_date) from exercise_logs where lower(email) = 'demo.partner.jawa@fake.local')),
       e.exercise_name, e.weight, e.reps, e.sets, e.duration_min
  from exercise_logs e
 where lower(e.email) = 'demo.partner.jawa@fake.local'
   and e.entry_date > (select max(entry_date) - 42 from exercise_logs where lower(email) = 'demo.partner.jawa@fake.local')
on conflict do nothing;

select 'app review account ready' as result,
       (select count(*) from partnerships
         where status='accepted' and (lower(inviter_email)='appreview@creativelab1.com' or lower(invitee_email)='appreview@creativelab1.com')) as paired,
       (select count(*) from fit_entries where lower(email)='appreview@creativelab1.com') as review_entries,
       (select count(*) from exercise_logs where lower(email)='appreview@creativelab1.com') as review_logs,
       (select count(*) from fit_entries where lower(email)='demo.partner.review@fake.local') as partner_entries,
       (select count(*) from exercise_logs where lower(email)='demo.partner.review@fake.local') as partner_logs;
