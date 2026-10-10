-- Notification switches, one a day, and cheers that reach a locked phone,
-- 2026-10-09.
--
-- Three things, in one file because the functions that read them ship
-- together (send-nudges, notify-partner, notify-clip, notify-live-start):
--
-- 1. profiles.notify_off: the kinds this person has switched off in Setup,
--    Notifications. A list of what is OFF rather than what is on, so a new kind
--    added later starts on for everybody without rewriting anybody's row, and
--    a row that predates this column (null or '{}') means everything is on.
--    The kinds: evening, started, video, cheer, invite, streak, recap,
--    progress. Spelled once in send-nudges/plan.ts (ALL_KINDS) and once in
--    index.html (NOTIFY_KINDS).
--
--    Nothing here decides who can see what, so the ordinary "update your own
--    profile" policy is all it needs. (rls-column-level-trap does not apply:
--    no access-control function reads this column.)
--
-- 2. One scheduled notification per person per LOCAL day. nudge_log already
--    stops the same kind twice in a day; this stops two different scheduled
--    kinds on the same day, which is Mo's rule. send-nudges writes sent_on as
--    the person's own date from now on, because current_date is UTC and for
--    somebody in California that makes 18:00 and 20:00 two different days.
--    The coach digest and live_start are deliberately not in the list: the
--    first is a coach's work summary, the second is an event, not a schedule.
--
-- 3. A trigger on encouragements that calls notify-partner, so "Mell cheered
--    you on" arrives the moment she sends it. Same shape as notify_clip_sent.
--
-- Safe to run twice. Needs the vault secret cron_secret, which is live.

alter table profiles add column if not exists notify_off text[] not null default '{}';

create unique index if not exists nudge_log_one_scheduled_a_day
  on nudge_log (lower(email), sent_on)
  where kind in ('evening', 'streak', 'recap', 'progress');

create or replace function public.notify_cheer_sent()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  sender_name text;
  recent int;
begin
  -- The app's banner refuses an empty message, so there is nothing to tell.
  if coalesce(btrim(new.message), '') = '' then
    return new;
  end if;

  -- One banner for a burst. Tapping three preset cheers in a row is a normal
  -- thing to do, and three buzzes in somebody's pocket mid set is not. The
  -- banner in the app still shows the newest one, so nothing is lost.
  select count(*) into recent
    from encouragements e
   where lower(e.to_email) = lower(new.to_email)
     and e.id <> new.id
     and e.created_at > now() - interval '60 seconds';
  if recent > 0 then
    return new;
  end if;

  -- The name IS the notification, looked up here where the row is rather than
  -- passed in from a client that could lie about it.
  select p.user_name into sender_name
    from profiles p
   where lower(p.email) = lower(new.from_email)
   limit 1;

  -- Fire and forget. A push failure must never roll back the cheer itself.
  begin
    perform net.http_post(
      url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-partner',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || cron_secret()),
      body := jsonb_build_object(
        'kind', 'cheer',
        'to_email', lower(new.to_email),
        'from_name', coalesce(sender_name, ''),
        'message', left(new.message, 140)
      )
    );
  exception when others then
    raise warning 'cheer notify failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists encouragement_sent on encouragements;
create trigger encouragement_sent
  after insert on encouragements
  for each row execute function public.notify_cheer_sent();

select 'notify prefs and cheer ready' as result,
       (select count(*) from information_schema.columns
         where table_name = 'profiles' and column_name = 'notify_off') as notify_off_column,
       (select count(*) from pg_indexes where indexname = 'nudge_log_one_scheduled_a_day') as cap_index,
       (select count(*) from pg_trigger where tgname = 'encouragement_sent') as cheer_trigger;
