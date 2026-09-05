-- Nudge a partner the moment training starts, 2026-09-06.
--
-- send-nudges answers "who needs a nudge right now", checked once an hour.
-- That fits a state (you have not trained and it is evening), not a moment,
-- and an hour of lag defeats the point of "come watch them train". So this
-- is event driven: a trigger on live_sessions fires the instant a session
-- row is actually INSERTed. beatLive() upserts every 30 seconds on
-- conflict:"email" while a session runs, so only the first beat of a new
-- session ever inserts; every one after that updates the same row and this
-- trigger never sees it. Ending a session deletes the row, so a genuine new
-- session always means a genuine new INSERT.
--
-- The permission this respects needs no check of its own: a live_sessions
-- row can only exist while its owner's "let them see me training" switch is
-- on (the app writes nothing at all otherwise), so the trigger firing IS the
-- permission. What still varies is how much the notification says:
-- exercise detail only if details_shared, an invitation to cheer only if
-- allow_cheers, both already columns on this row.
--
-- One per partner per day, through the same nudge_log the hourly job uses,
-- so a pair training twice in one day gets pinged for the first time only.
-- That is the app's own restraint rule ("a notification people learn to
-- ignore is worse than no notification"), not a new one invented here.

do $$
declare secret text;
begin
  select (regexp_match(command, 'Bearer ([A-Za-z0-9_\-]+)'))[1]
    into secret from cron.job where jobname = 'expire-proof-photos';

  if secret is null then
    raise exception 'could not read the cron secret from expire-proof-photos';
  end if;

  execute format($def$
    create or replace function public.notify_live_session_start()
    returns trigger
    language plpgsql
    security definer
    set search_path to 'public'
    as $trig$
    declare
      partner text;
      claimed boolean;
    begin
      select case
        when lower(p.inviter_email) = lower(new.email) then lower(p.invitee_email)
        else lower(p.inviter_email)
      end
      into partner
      from partnerships p
      where p.status = 'accepted'
        and (lower(p.inviter_email) = lower(new.email) or lower(p.invitee_email) = lower(new.email))
      order by p.responded_at desc nulls last
      limit 1;

      if partner is null then
        return new;   -- training alone, nobody to tell
      end if;

      insert into nudge_log (email, kind) values (partner, 'live_start')
        on conflict do nothing;
      claimed := found;
      if not claimed then
        return new;   -- already told them once today
      end if;

      -- Fire and forget. A webhook failure must never roll back the session
      -- the athlete is trying to start, so this is wrapped and swallowed.
      begin
        perform net.http_post(
          url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-live-start',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer %s'),
          body := jsonb_build_object(
            'to_email', partner,
            'from_name', new.user_name,
            'focus', new.focus,
            'exercise_name', new.exercise_name,
            'details_shared', new.details_shared,
            'allow_cheers', new.allow_cheers
          )
        );
      exception when others then
        raise warning 'live_start notify failed: %%', sqlerrm;
      end;

      return new;
    end;
    $trig$;
  $def$, secret);
end $$;

drop trigger if exists live_session_started on live_sessions;
create trigger live_session_started
  after insert on live_sessions
  for each row execute function public.notify_live_session_start();

select 'live start nudge ready' as result,
       (select count(*) from pg_trigger where tgname = 'live_session_started') as trigger_installed;
