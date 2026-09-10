-- Goal bubble and child, 2026-09-09.
--
-- profiles.goal is one of five legacy strings ("Lose weight", "Build muscle",
-- "Get stronger", "Recomp (lose fat, gain muscle)", "Stay consistent"). The
-- workout engine speaks nine bubbles and 43 children (mo-knowledge/goals/
-- goal-tree.json), and mo-knowledge/engine/adapter.mjs's mapGoal bridges the
-- five to the nine today by parsing free text out of goal_detail, which is
-- lossy: "abs" under Lose weight reads as belly fat, under Recomp as abs, and
-- under Get stronger as nothing at all. The tile picker in index.html
-- (renderGoalTilesPrototype) can already produce the exact bubble and child a
-- person tapped; it just has nowhere to store them. These two columns are
-- that place.
--
-- Nullable and with no default, because "picked a tile" and "picked nothing"
-- are different answers and only the first is true of everybody today. The
-- legacy `goal` string keeps being written for one release after the tile
-- picker ships, so nothing that still reads it breaks; goal_bubble and
-- goal_child are additive, not a replacement, until that column is retired.
alter table profiles add column if not exists goal_bubble text;
alter table profiles add column if not exists goal_child text;

comment on column profiles.goal_bubble is 'bubble id from mo-knowledge/goals/goal-tree.json (e.g. lose-weight, event), set by the tile picker; nullable until that ships, and the legacy goal string keeps being written alongside it for one release';
comment on column profiles.goal_child is 'child id from mo-knowledge/goals/goal-tree.json, scoped under goal_bubble (e.g. event-hyrox under event); nullable, same one-release overlap with the legacy goal string';

-- The read policy these need already exists: "couple can read profiles" is
-- can_see(email), and self writes its own row. So no policy changes, and a
-- partner seeing which bubble and child you picked is the same exposure as
-- the goal string they can already read.

select 'profiles.goal_bubble ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'profiles' and column_name in ('goal_bubble', 'goal_child')) as has_columns;

-- rollback
-- alter table profiles drop column if exists goal_bubble;
-- alter table profiles drop column if exists goal_child;
