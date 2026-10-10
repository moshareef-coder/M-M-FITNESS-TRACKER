-- "Mell just finished Full body A", on the partner's lock screen, 2026-10-10.
--
-- WRITTEN, NOT APPLIED. Deploy notify-partner FIRST (the version that knows the
-- 'finish' kind), then run this. Run the other way round and the function
-- answers "unknown kind finish" and sends nothing, which is harmless but means
-- the first evening of finishes goes unannounced.
--
-- The app is fine before either: the partner-finished card already shows on
-- opening the app from fit_entries alone, and a push tapped on an older build
-- that does not know the /finished route just brings the app to the front.
--
-- WHICH WRITE. A finished workout is the one moment fit_entries.workout_at is
-- stamped: doMarkGymDayDone in index.html is the only writer of gym, and it
-- restamps workout_at with now() on every finish, including a second workout
-- the same day (the row is one per person per day). Every other write to the
-- row (the proof photo, its caption, a rest day, a name change) copies
-- workout_at through unchanged. So the trigger fires when gym is true and
-- workout_at CHANGED, which is once per finished workout, and never for a
-- photo or a caption added afterwards.
--
-- NO DUPLICATES for one workout:
--   - the trigger only fires on a new workout_at, as above;
--   - an offline finish replayed later (safeWrite's queue) carries the old
--     stamp, and a stamp more than 30 minutes old is not news, so it is
--     skipped;
--   - notify-partner waits up to ~100 seconds for the caption, and if
--     workout_at has moved on meanwhile (a second finish) it drops this one and
--     lets the newer one speak.
--
-- NOT FOR A SESSION DONE TOGETHER. If the two of them have a train together
-- session that is active, or finished in the last hour, the partner was there:
-- the shared finish screen already told both of them. Checked only when
-- together_sessions exists (20261004_train_together.sql is itself written and
-- not applied), through EXECUTE so this file runs either way.
--
-- WHO IS TOLD. The finisher's accepted partner, read here from partnerships,
-- not passed in by a client. The recipient's own switch (profiles.notify_off,
-- kind 'finish') and their quiet hours are read by the function (decide.ts).
-- The finisher's share_workout_details switch decides whether the banner names
-- the workout or just says "a workout", exactly like the in-app card.
--
-- Needs the vault secret cron_secret and pg_net, both live (the cheer and
-- together invite triggers use them). Safe to run twice.

create or replace function public.notify_workout_finished()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  me text := lower(new.email);
  partner text;
  together boolean := false;
begin
  if not coalesce(new.gym, false) or new.workout_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and new.workout_at is not distinct from old.workout_at then
    return new;
  end if;
  -- An old stamp is a replay or an edit, not a workout that just ended.
  if new.workout_at < now() - interval '30 minutes' then
    return new;
  end if;

  select case when lower(p.inviter_email) = me then lower(p.invitee_email)
              else lower(p.inviter_email) end
    into partner
    from partnerships p
   where p.status = 'accepted'
     and (lower(p.inviter_email) = me or lower(p.invitee_email) = me)
   order by p.created_at desc
   limit 1;
  if partner is null then
    return new;
  end if;

  if to_regclass('public.together_sessions') is not null then
    execute $q$
      select exists (
        select 1 from together_sessions s
         where ((lower(s.host_email) = $1 and lower(s.guest_email) = $2)
             or (lower(s.host_email) = $2 and lower(s.guest_email) = $1))
           and (s.status = 'active'
             or (s.status = 'done' and coalesce(s.ended_at, s.updated_at) > now() - interval '1 hour'))
      )
    $q$ into together using me, partner;
  end if;
  if together then
    return new;
  end if;

  -- Fire and forget. The workout is banked by the row itself; a failed push
  -- must never roll that back.
  begin
    perform net.http_post(
      url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-partner',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || cron_secret()),
      body := jsonb_build_object(
        'kind', 'finish',
        'to_email', partner,
        'from_email', me,
        'entry_date', new.entry_date,
        'workout_at', new.workout_at,
        -- The day's note as it stood at the finish. A caption typed on the
        -- finish screen after this is a change from it; an unchanged note is
        -- an older one and is not read out as this workout's caption.
        'note_before', coalesce(new.note, '')
      )
    );
  exception when others then
    raise warning 'finish notify failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists workout_finished on fit_entries;
create trigger workout_finished
  after insert or update of workout_at, gym on fit_entries
  for each row execute function public.notify_workout_finished();

select 'finish notify ready' as result,
       (select count(*) from pg_trigger where tgname = 'workout_finished') as trigger_installed;
