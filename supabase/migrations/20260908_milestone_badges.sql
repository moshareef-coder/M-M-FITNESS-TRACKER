-- Milestone badges: one-time achievements, kept forever once earned. 2026-09-08.
-- Each row is one person earning one badge. The client decides eligibility
-- (same trust level as session_reactions' hearts); this table is just the
-- record of it, and the reason it stays a real record rather than a client
-- side flag is the celebration: it only fires once, the moment a row appears
-- that was not there before.

create table if not exists milestone_badges (
  email text not null,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (email, badge_id)
);

alter table milestone_badges enable row level security;

drop policy if exists "pair can read milestone badges" on milestone_badges;
create policy "pair can read milestone badges" on milestone_badges
  for select using (is_me(email) or can_see(email));

drop policy if exists "self can earn milestone badges" on milestone_badges;
create policy "self can earn milestone badges" on milestone_badges
  for insert with check (is_me(email));

select 'milestone_badges ready' as result;
