-- Somebody finds out a report arrived, 2026-09-16.
--
-- 20260916_report_and_block.sql gave people a report button and the app tells
-- them we look at every report within a day. That sentence is now printed in
-- front of users and App Store Review Guideline 1.2 expects it to be true, and
-- until this file runs it is not: reports land in a table nobody watches. A
-- promise with nothing behind it is worse than no button, because somebody in
-- trouble stops looking for another way to be heard.
--
-- Three parts: who answers reports, the alert when one lands, and the ability
-- for that person to actually see and close it.

-- ---------------------------------------------------------------------------
-- 1. Who answers.
-- ---------------------------------------------------------------------------

-- A table rather than an email literal scattered through policies and edge
-- functions. Adding a second person later should be one row, not a redeploy of
-- anything, and it should not be possible to add one by editing the client.
create table if not exists platform_admins (
  email      text primary key,
  added_at   timestamptz not null default now()
);

alter table platform_admins enable row level security;
-- No policy at all: the table is readable only by the service role. Being able
-- to list who moderates is not something any account needs, and it is a map of
-- who to pressure.

insert into platform_admins (email) values ('mo.shareef@creativelab1.com')
  on conflict do nothing;

create or replace function is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admins where email = my_email());
$$;

revoke all on function is_platform_admin() from public;
grant execute on function is_platform_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 2. The person who answers can see and close a report.
-- ---------------------------------------------------------------------------

-- Added alongside the reporter's own policy rather than replacing it: a
-- reporter still sees their own report, and now a moderator sees all of them.
drop policy if exists "a moderator reads every report" on content_reports;
create policy "a moderator reads every report" on content_reports
  for select using (is_platform_admin());

-- Closing one is the only write anybody gets, and only a moderator gets it.
-- Reporters still cannot edit or withdraw: a report that can be retracted under
-- pressure is not a safety mechanism.
drop policy if exists "a moderator closes a report" on content_reports;
create policy "a moderator closes a report" on content_reports
  for update using (is_platform_admin()) with check (is_platform_admin());

-- A held clip has to be releasable once the report is dealt with, or the
-- exemption added to expire-clips becomes a permanent leak: every reported clip
-- kept for ever, which is the opposite of what this app promises about video.
drop policy if exists "a moderator releases a held clip" on live_clips;
create policy "a moderator releases a held clip" on live_clips
  for delete using (is_platform_admin());

-- ---------------------------------------------------------------------------
-- 3. The alert.
-- ---------------------------------------------------------------------------

do $$
declare secret text;
begin
  select (regexp_match(command, 'Bearer ([A-Za-z0-9_\-]+)'))[1]
    into secret from cron.job where jobname = 'expire-proof-photos';

  if secret is null then
    raise exception 'could not read the cron secret from expire-proof-photos';
  end if;

  execute format($def$
    create or replace function public.notify_report_filed()
    returns trigger
    language plpgsql
    security definer
    set search_path to 'public'
    as $trig$
    begin
      -- No throttle of any kind here, unlike the clip and live-start notifies.
      -- Those are social and restraint is the point. This is a safety queue,
      -- and the failure mode of a missed one is somebody being harmed twice,
      -- so every single report rings.
      begin
        perform net.http_post(
          url := 'https://stcpiovpjismhltklfdw.supabase.co/functions/v1/notify-report',
          headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer %s'),
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
        raise warning 'report alert failed: %%', sqlerrm;
      end;
      return new;
    end;
    $trig$;
  $def$, secret);
end $$;

drop trigger if exists content_report_filed on content_reports;
create trigger content_report_filed
  after insert on content_reports
  for each row execute function public.notify_report_filed();

select 'report alert ready' as result,
       (select count(*) from platform_admins) as admins_configured,
       (select count(*) from pg_trigger where tgname = 'content_report_filed') as trigger_installed;
