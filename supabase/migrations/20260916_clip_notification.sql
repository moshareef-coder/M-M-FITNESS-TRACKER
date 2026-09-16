-- Tell somebody a clip has arrived, 2026-09-16.
--
-- A clip is twenty seconds, watched once, then deleted. It is sent to a person
-- who is training right now, which means their phone is locked in a bag or face
-- down on a bench. Realtime covers the app being in front (watchLiveSessions
-- puts the row in the inbox and the pill appears) and that is the minority of
-- the time. Without this, a clip sat unseen until the workout was next picked
-- up, and by then the set it was cheering is over. A clip nobody sees in time
-- is the same as no clip.
--
-- Event driven for the same reason notify-live-start is: send-nudges answers
-- "who needs a nudge right now" once an hour, which suits a state and not a
-- moment. An hour of lag here is total failure rather than degradation.
--
-- The permission needs no check of its own. live_clips already has an INSERT
-- policy requiring the sender to be who they say and the recipient to be their
-- actual partner, so a row existing at all proves a consenting pair. This
-- function must never become the place that decides who may be messaged.

do $$
declare secret text;
begin
  select (regexp_match(command, 'Bearer ([A-Za-z0-9_\-]+)'))[1]
    into secret from cron.job where jobname = 'expire-proof-photos';

  if secret is null then
    raise exception 'could not read the cron secret from expire-proof-photos';
  end if;

  execute format($def$
    create or replace function public.notify_clip_sent()
    returns trigger
    language plpgsql
    security definer
    set search_path to 'public'
    as $trig$
    declare
      sender_name text;
      recent int;
    begin
      -- The name IS the notification. "Somebody sent you a video" tells a
      -- person mid set nothing they can act on, so it is looked up here where
      -- the row is rather than passed in from a client that could lie about it.
      select p.user_name into sender_name
        from profiles p
       where lower(p.email) = lower(new.from_email)
       limit 1;

      -- One banner for a burst. Filming three takes in a row is a normal thing
      -- to do and it should not be three buzzes in somebody's pocket while they
      -- are under a bar. Deliberately NOT the once-a-day rule live_start uses:
      -- a second clip an hour later is a genuinely new moment and should ring.
      --
      -- Counted off live_clips itself rather than a log table, so there is no
      -- second piece of state to drift out of step with the clips it describes.
      select count(*) into recent
        from live_clips c
       where lower(c.to_email) = lower(new.to_email)
         and c.id <> new.id
         and c.created_at > now() - interval '90 seconds';
      if recent > 0 then
        return new;
      end if;

      -- Fire and forget. A push failure must never roll back the clip itself:
      -- the row and the uploaded file are the feature, the notification is how
      -- somebody hears about it, and losing the first to protect the second
      -- would be exactly backwards.
      begin
        perform net.http_post(
          url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-clip',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer %s'),
          body := jsonb_build_object(
            'to_email', lower(new.to_email),
            'from_name', coalesce(sender_name, '')
          )
        );
      exception when others then
        raise warning 'clip notify failed: %%', sqlerrm;
      end;

      return new;
    end;
    $trig$;
  $def$, secret);
end $$;

drop trigger if exists live_clip_sent on live_clips;
create trigger live_clip_sent
  after insert on live_clips
  for each row execute function public.notify_clip_sent();

select 'clip notification ready' as result,
       (select count(*) from pg_trigger where tgname = 'live_clip_sent') as trigger_installed;
