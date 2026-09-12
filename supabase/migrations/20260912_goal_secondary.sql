-- More than one goal, 2026-09-12. WRITTEN, NOT APPLIED.
--
-- The tile picker has been single select since it landed, with a note in
-- index.html arguing that "a plan built for two goals is a plan built for
-- neither". That is true of the parameter set and of nothing else: two goals
-- cannot both set a rep range, a rest or a day count, but "build muscle and
-- touch my toes" is one rep range plus ten minutes of hips and upper back,
-- which the engine can honour without contradicting anything. So the goal
-- selection becomes one primary plus a short list of extras, and this column
-- is the list.
--
-- A new column rather than a wider goal_bubble. profiles.goal_bubble and
-- profiles.goal_child are live text columns with real rows behind them, they
-- are read on every generate, and a person who only ever picked one thing must
-- keep getting the plan they got yesterday, to the byte. Nothing about them
-- moves here.
--
-- jsonb rather than two parallel text[] columns, because an entry is a pair
-- and splitting a pair across two arrays is how the third row ends up pointing
-- at the wrong child. Default '[]' rather than null: "has not picked extras"
-- and "picked none" are the same answer here, unlike focus_chosen_at, and the
-- engine treats null, '[]' and nonsense identically anyway.
--
-- Shape, exactly, and it is validated in the engine rather than in a check
-- constraint, so an id the tree renames costs an ignored goal and never a
-- failed insert:
--   [{"bubble": "do-a-thing", "child": "flexibility"}]
-- Ids are spelled as in mo-knowledge/goals/goal-tree.json. The engine honours
-- the first two it can use and names the rest in meta.goals.ignored and in the
-- plan's notes, so a longer list is never silently trimmed.
alter table profiles add column if not exists goal_secondary jsonb not null default '[]'::jsonb;

comment on column profiles.goal_secondary is 'the "and also" goals, [{bubble, child}] from goal-tree.json; they add priority muscles, the mobility block and cardio, and can never change rep ranges, rest or the day count';

-- No policy changes. This is one more column on a row the owner already writes
-- and the partner already reads under "couple can read profiles"; a second
-- goal is no more exposing than the first one, which is already there.
