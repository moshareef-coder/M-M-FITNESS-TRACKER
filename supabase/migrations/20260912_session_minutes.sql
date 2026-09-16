-- How long you actually have, 2026-09-12. APPLIED 2026-09-15.
--
-- Every plan this engine has ever built was costed against a session length
-- the GOAL chose. `sessionMin` in goal-engine.mjs is 25, 30, 40, 45, 50 or 60
-- depending on which tile you tapped, and it is a considered number: a
-- strength goal really does need the three minutes between heavy sets that
-- make it 60. What it is not is a fact about the person's Tuesday.
--
-- Mo, 2026-09-12: "sometimes you put like five sets, six sets, whatever. But
-- some people they wanna do more, or they wanna do less. So maybe we should
-- also have it be where, how long are you wanting to work out for?"
--
-- So one column, one integer, minutes. It is the budget the week is built to
-- fit, in both directions: below the goal's own number the plan comes down to
-- meet it (accessory sets first, then accessory movements, then main sets, and
-- only last the rest between sets, which is the one that costs the goal
-- something and is said out loud when it happens); above it the plan adds sets
-- to the groups that are short of their weekly target until either the time is
-- spent or the volume research says stop.
--
-- Nullable, with no default, and that is the whole backwards compatibility
-- story. Null means "never answered", the goal's own `sessionMin` runs, and
-- the plan is byte for byte the plan it was yesterday. There is no value of
-- this column that a person who skipped the question can accidentally land on.
--
-- Not a check constraint on the range. The engine clamps to 15..120 and says
-- what it did, for the same reason limits are validated in code: a number
-- outside the range should cost a clamp and a sentence, never a failed save
-- from a slider that shipped a week later with a wider track.
alter table profiles add column if not exists session_minutes int;

comment on column profiles.session_minutes is 'how long one session should take, minutes; null means the goal decides. The engine clamps to 15..120 and builds the week to fit, trimming sets before rest and adding sets only up to the weekly volume ceiling';

-- No policy changes. One more column on a row the owner already writes and the
-- partner already reads under "couple can read profiles". How long somebody
-- trains for is no more exposing than how many days a week they train, which
-- has been on this row since the first migration.
