-- Limits: what hurts, and what they do not own. 2026-09-09.
--
-- The optional onboarding sheet asks two questions, "does anything hurt" and
-- "anything you don't have", and until now neither answer had anywhere to go
-- and nothing downstream could act on either one. Both halves are now real:
-- mo-knowledge/engine/joint-load.mjs says which of eight joints each of the
-- 159 weight-training and calisthenics exercises loads heavily, and
-- mo-knowledge/engine/limits.mjs filters the week with it. A painful joint
-- removes the movements that load it; a missing implement narrows the
-- equipment the plan may prescribe at all.
--
-- One jsonb column rather than two text[] columns and a text column, because
-- unlike focus_groups these three fields are one answer given at one moment
-- and they are read together or not at all. Shape, exactly:
--
--   {
--     "hurts":      text[],        -- joint keys, from limits.mjs BODY_AREAS
--     "missing":    text[],        -- equipment keys, from EQUIPMENT_OPTIONS
--     "note":       text | null,   -- free text, at most 120 characters
--     "updated_at": timestamptz    -- when the sheet was saved
--   }
--
-- The keys are not free text. `hurts` must come from BODY_AREAS
-- (shoulder, elbow, wrist, neck, lowerback, hip, knee, ankle) and `missing`
-- from EQUIPMENT_OPTIONS (barbell, dumbbell, cable, machine, none, where
-- "none" means bodyweight only). The screen must import those two lists from
-- limits.mjs rather than hard-coding them: the prototype in index.html offered
-- "Pull-up bar", "Squat rack" and "Bench", and the exercise library records
-- exactly five equipment values and cannot see any of those three, so those
-- chips were answers nothing could honour. normalizeLimits drops any key it
-- does not recognise in silence, so a stale value from an older client costs a
-- filter and never a failed plan.
--
-- `note` is stored and deliberately never parsed. Turning "left knee since the
-- ACL" into a filter is how an app ends up guessing at a medical history. It
-- is there so a coach, or a later screen, can read back what the person
-- actually said. Nothing here is a medical question and none of it is phrased
-- as one; the joint table is coaching judgement and says so in its own header.
--
-- Nullable and with no default, because "has not been asked" and "was asked
-- and said nothing" are different answers and only the first is true of
-- everybody today.
alter table profiles add column if not exists limits jsonb;

comment on column profiles.limits is 'what hurts and what they do not own: { hurts: text[] from limits.mjs BODY_AREAS, missing: text[] from EQUIPMENT_OPTIONS, note: text|null max 120 chars, updated_at: timestamptz }; the engine drops movements that load a named joint and narrows the equipment it may prescribe';

-- The read policy this needs already exists: "couple can read profiles" is
-- can_see(email), and self writes its own row. So no policy changes. A partner
-- seeing that your shoulder hurts is a smaller exposure than the workout they
-- can already read, which will visibly have no overhead pressing in it.

select 'profiles.limits ready' as result,
       (select count(*) from information_schema.columns
        where table_name = 'profiles' and column_name = 'limits') as has_column;

-- rollback
-- alter table profiles drop column if exists limits;
-- Safe to run: nothing joins on this column and no view reads it. Dropping it
-- loses what somebody said hurts and returns every plan to the unfiltered
-- library, which is what generates today for anybody who skipped the sheet.
