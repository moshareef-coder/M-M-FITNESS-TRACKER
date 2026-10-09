-- "Mell wants to train together", on the lock screen, 2026-10-09.
--
-- DEPENDS ON 20261004_train_together.sql, which is itself written and not
-- applied. Run that first; this file refuses to run without it rather than
-- half applying.
--
-- An invite is only good for half an hour (TG_INVITE_TTL in the app), and the
-- person being asked is almost never looking at the app when it is sent. So
-- the moment a together_sessions row is inserted as 'invited', notify-partner
-- tells the guest, with Join and Not now on the banner (TOGETHER_INVITE in
-- AppDelegate.swift). The push carries a 30 minute apns-expiration, so a
-- phone that was off all morning does not light up with a dead invite.
--
-- The INSERT policy on together_sessions already requires the guest to be the
-- host's actual partner, so a row existing proves a pair; nothing here decides
-- who may be messaged. The guest's own Setup switch is read by the function.
--
-- Safe to run twice.

do $$
begin
  if to_regclass('public.together_sessions') is null then
    raise exception 'together_sessions does not exist: run 20261004_train_together.sql first';
  end if;
end $$;

create or replace function public.notify_together_invite()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  host_name text;
  recent int;
begin
  if new.status <> 'invited' then
    return new;
  end if;

  -- Invite, cancel, invite again is what somebody does while deciding which
  -- workout to bring. One banner for that, not three.
  select count(*) into recent
    from together_sessions s
   where lower(s.host_email) = lower(new.host_email)
     and lower(s.guest_email) = lower(new.guest_email)
     and s.id <> new.id
     and s.created_at > now() - interval '2 minutes';
  if recent > 0 then
    return new;
  end if;

  select p.user_name into host_name
    from profiles p
   where lower(p.email) = lower(new.host_email)
   limit 1;

  -- Fire and forget. The invite row is the feature; a failed push must never
  -- roll it back.
  begin
    perform net.http_post(
      url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-partner',
      headers := jsonb_build_object('Content-Type', 'application/json',
                                    'Authorization', 'Bearer ' || cron_secret()),
      body := jsonb_build_object(
        'kind', 'invite',
        'to_email', lower(new.guest_email),
        'from_name', coalesce(host_name, ''),
        'session_id', new.id,
        -- tgRequestJoin: asking to join a workout the guest already has going.
        'request', (new.workout ->> 'request') is not distinct from 'true'
      )
    );
  exception when others then
    raise warning 'together invite notify failed: %', sqlerrm;
  end;

  return new;
end;
$$;

drop trigger if exists together_invite_sent on together_sessions;
create trigger together_invite_sent
  after insert on together_sessions
  for each row execute function public.notify_together_invite();

select 'together invite notify ready' as result,
       (select count(*) from pg_trigger where tgname = 'together_invite_sent') as trigger_installed;
