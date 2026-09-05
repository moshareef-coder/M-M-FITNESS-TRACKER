-- Live clips, 2026-09-04.
--
-- A few seconds of video sent to someone who is training RIGHT NOW, watched
-- once, then gone. Deliberately not a feature that accumulates: there is no
-- history, no gallery, no thumbnail in the timeline. The row and the file both
-- die when the workout ends, and a sweeper catches anything a closed app left
-- behind.
--
-- Storage is a separate bucket from workout-proof, which is image-only, thirty
-- day retention and keepsake-adjacent. Nothing here is a keepsake.

create table if not exists live_clips (
  id          uuid primary key default gen_random_uuid(),
  from_email  text not null,
  to_email    text not null,
  path        text not null,
  created_at  timestamptz not null default now(),
  viewed_at   timestamptz
);

create index if not exists live_clips_inbox on live_clips (lower(to_email), created_at desc);

alter table live_clips enable row level security;

-- Both ends can see it: the person training, and the sender who wants to know
-- it landed. Nobody else, ever.
drop policy if exists "pair can see a live clip" on live_clips;
create policy "pair can see a live clip" on live_clips
  for select using (is_me(to_email) or is_me(from_email));

-- You can only send as yourself, and only to someone you are actually paired
-- with. This is the check that stops a stranger dropping video on a person.
drop policy if exists "send a clip to your partner" on live_clips;
create policy "send a clip to your partner" on live_clips
  for insert with check (is_me(from_email) and lower(to_email) = my_partner_email());

-- The recipient marks it watched.
drop policy if exists "recipient marks a clip watched" on live_clips;
create policy "recipient marks a clip watched" on live_clips
  for update using (is_me(to_email)) with check (is_me(to_email));

-- Either end can destroy it, because "delete it" should never be blocked.
drop policy if exists "either end deletes a clip" on live_clips;
create policy "either end deletes a clip" on live_clips
  for delete using (is_me(to_email) or is_me(from_email));

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'live_clips'
  ) then
    alter publication supabase_realtime add table live_clips;
  end if;
end $$;

-- The bucket. Small cap on purpose: five seconds of phone video is a couple of
-- megabytes, and anything much larger is not the feature.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('live-clips', 'live-clips', false, 12582912,
        array['video/mp4', 'video/quicktime', 'video/webm'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types,
      public = false;

-- Files live at {recipient-email}/{uuid}, so the folder name is the inbox and
-- the same is_me / partner rules decide who may touch it.
drop policy if exists "clip: send into your partner's inbox" on storage.objects;
create policy "clip: send into your partner's inbox" on storage.objects
  for insert with check (
    bucket_id = 'live-clips'
    and lower((storage.foldername(name))[1]) = my_partner_email()
  );

drop policy if exists "clip: read your own inbox" on storage.objects;
create policy "clip: read your own inbox" on storage.objects
  for select using (
    bucket_id = 'live-clips'
    and (is_me((storage.foldername(name))[1]) or can_see((storage.foldername(name))[1]))
  );

drop policy if exists "clip: clear your own inbox" on storage.objects;
create policy "clip: clear your own inbox" on storage.objects
  for delete using (
    bucket_id = 'live-clips'
    and (is_me((storage.foldername(name))[1]) or can_see((storage.foldername(name))[1]))
  );

select 'live_clips ready' as result,
       (select count(*) from pg_policies where tablename = 'live_clips') as row_policies,
       (select count(*) from pg_policies where schemaname = 'storage' and policyname like 'clip:%') as storage_policies,
       (select count(*) from pg_publication_tables
          where pubname = 'supabase_realtime' and tablename = 'live_clips') as published;
