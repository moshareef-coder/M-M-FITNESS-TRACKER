-- exercise_swaps.source: let the no-equipment swap through. 2026-09-19.
--
-- 20260909_exercise_swaps.sql allowed two sources, 'suggested' and 'searched',
-- because those were the two ways a person could swap on the day it was
-- written. The session's "I don't have the equipment" button came later and
-- writes 'no-equipment', one row per lift it replaced, as a single batch.
-- Postgres rejects the whole batch on the first row that fails the check, so
-- every swap that path ever recorded was refused, safeWrite toasted the raw
-- constraint error at the person, and ALL_SWAPS in memory went on believing
-- the rows had landed until the next reload. preferences.mjs, which reads
-- this table, has therefore never seen a single no-equipment swap.
--
-- 'no-equipment' is worth keeping distinct from the other two rather than
-- folded into 'suggested'. It is the weakest preference signal of the three:
-- the person did not dislike the movement, they were standing in a gym that
-- did not have the bar, and a reader that sinks a lift after two of these
-- would be sinking it for the wrong reason.
--
-- The constraint name is the one Postgres gives an inline column check,
-- <table>_<column>_check. If the table was ever created another way and the
-- name differs, the DROP is a no-op and the ADD fails loudly on the name
-- clash, which is the right failure: look, do not guess.

alter table exercise_swaps drop constraint if exists exercise_swaps_source_check;
alter table exercise_swaps
  add constraint exercise_swaps_source_check
  check (source in ('suggested', 'searched', 'no-equipment'));

select 'exercise_swaps source widened' as result;

-- rollback
--   alter table exercise_swaps drop constraint if exists exercise_swaps_source_check;
--   alter table exercise_swaps
--     add constraint exercise_swaps_source_check
--     check (source in ('suggested', 'searched'));
-- Rolling back with 'no-equipment' rows already in the table fails the ADD,
-- which is correct: delete those rows first or keep the wider check.
