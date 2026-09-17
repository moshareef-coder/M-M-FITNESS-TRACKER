-- The two notify functions 20260915_consent_and_leak_close.sql could not know
-- about, 2026-09-17.
--
-- That file's section 7 moves every use of CRON_SECRET onto vault, and rewrites
-- notify_live_session_start by name. notify_clip_sent and notify_report_filed
-- were created the following day by 20260916_clip_notification.sql and
-- 20260916_report_alert.sql, each with the secret written into the body as a
-- literal, so section 7 leaves them exactly as it found them. That is why the
-- scorecard's hole_5 stays false after a clean run of that file.
--
-- Run this AFTER section 7 has armed, that is after the vault secret exists.
-- Like section 7 it does nothing at all until then, so running it early is safe
-- and leaves today's arrangement working.
--
-- Safe to run twice.

do $outer$
declare armed boolean := false;
begin
  begin
    select exists (select 1 from vault.decrypted_secrets where name = 'cron_secret') into armed;
  exception when others then
    raise notice 'Vault is not readable here (%). Skipped.', sqlerrm;
    return;
  end;

  if not armed then
    raise notice 'No vault secret named cron_secret yet. Skipped; both functions still carry the literal. Create the secret, run 20260915_consent_and_leak_close.sql again, then run this file.';
    return;
  end if;

  -- Only the Authorization header changes in either of these. Everything else
  -- is the live body, carried across unchanged, including the throttles and the
  -- reasoning for them: the burst window on clips and the deliberate absence of
  -- one on reports.
  execute $fn$
    create or replace function notify_clip_sent()
    returns trigger language plpgsql security definer set search_path = public as $body$
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
      select count(*) into recent
        from live_clips c
       where lower(c.to_email) = lower(new.to_email)
         and c.id <> new.id
         and c.created_at > now() - interval '90 seconds';
      if recent > 0 then
        return new;
      end if;

      -- Fire and forget. A push failure must never roll back the clip itself.
      begin
        perform net.http_post(
          url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-clip',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || cron_secret()),
          body := jsonb_build_object(
            'to_email', lower(new.to_email),
            'from_name', coalesce(sender_name, '')
          )
        );
      exception when others then
        raise warning 'clip notify failed: %', sqlerrm;
      end;

      return new;
    end $body$;
  $fn$;

  execute $fn$
    create or replace function notify_report_filed()
    returns trigger language plpgsql security definer set search_path = public as $body$
    begin
      -- No throttle of any kind here, unlike the clip and live-start notifies.
      -- Those are social and restraint is the point. This is a safety queue,
      -- and the failure mode of a missed one is somebody being harmed twice,
      -- so every single report rings.
      begin
        perform net.http_post(
          url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-report',
          headers := jsonb_build_object('Content-Type', 'application/json',
                                        'Authorization', 'Bearer ' || cron_secret()),
          body := jsonb_build_object(
            'report_id', new.id,
            'kind', new.kind,
            'reason', new.reason,
            'reporter_email', new.reporter_email,
            'subject_email', new.subject_email,
            'evidence_path', new.evidence_path
          )
        );
      exception when others then
        -- Swallowed for the same reason everywhere else: the report row is the
        -- thing that must survive. An alert that fails is a late answer; a
        -- rolled back report is no answer at all.
        raise warning 'report alert failed: %', sqlerrm;
      end;
      return new;
    end $body$;
  $fn$;

  raise notice 'notify_clip_sent and notify_report_filed now read the secret from vault.';
end $outer$;


-- The same scorecard line as the other file's hole_5, which should now be true.
-- It asks the general question, not a question about three function names, so
-- it catches the next function somebody writes with the secret pasted in.
select 'cron secret' as check,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and p.prosrc like '%Bearer 9UJOk%') = 0                      as no_literal_in_functions,
       (select count(*) from cron.job where command like '%Bearer 9UJOk%') = 0 as no_literal_in_cron_jobs,
       (select count(*) from vault.decrypted_secrets where name = 'cron_secret') = 1 as vault_secret_present;
