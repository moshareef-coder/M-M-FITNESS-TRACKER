-- Onboarding learned two things it has nowhere to put.
--
-- train_styles: what the person is actually willing to do, as a list of style
-- ids (lifting, home, running, cycling, walking, pilates, yoga). Strict opt in:
-- anything not in this list is never planned, which is why an empty list and a
-- null mean different things. Null is "never asked", and every account created
-- before this column existed is null and keeps the plan it already had. An
-- empty array would mean "asked, and they want nothing", which the app does not
-- allow you to save.
--
-- goal_tuning: the answer each goal gave about itself, keyed by goal id, since
-- a person can hold three goals at once and each one asks something different.
-- One json column rather than a column per question because the questions
-- change whenever a goal does, and a column each would mean a migration every
-- time. Shape, by goal kind:
--   choice goals  "lose-weight": "steady"
--   body goals    "get-stronger": { "areas": ["quads:3","hamstrings:3"], "all": false }
-- The areas strings are the same "group:tier" shape profiles.focus_groups
-- already uses, so the engine parses them with the code it has.
--
-- Both are additive and nullable. Nothing reads them as required, and
-- index.html carries both in PENDING_PROFILE_COLUMNS so setup still completes
-- on a database where this has not been applied.

-- committed_at: when they made the promise at the end of onboarding. A date
-- rather than a boolean, because the only thing worth saying about it later is
-- "since March", and a flag cannot say that. Null means they never made one,
-- which is every account created before this screen existed.
-- tracked_metrics: which measurements this person wants Progress to chart, from
-- weight, waist_in, hips_in, chest_in, thigh_in, arm_in. Null means never
-- chosen and reads as the goal's own default, which is what every account has
-- today. An EMPTY list is a real answer and not the same as null: a mobility
-- goal legitimately tracks no number at all, and the app honours that rather
-- than falling back to the scale.
alter table public.profiles
  add column if not exists train_styles text[],
  add column if not exists goal_tuning jsonb,
  add column if not exists committed_at timestamptz,
  add column if not exists tracked_metrics text[],
  -- tracked_by_goal: the same question answered per goal, keyed by goal id,
  -- because Progress reads through one goal at a time and "what do you want to
  -- measure" has a different answer for each. tracked_metrics stays as the
  -- union across goals for anything asking whether this person tracks a thing
  -- at all.
  add column if not exists tracked_by_goal jsonb;

comment on column public.profiles.train_styles is
  'Training styles the person opted into. Null means never asked; anything absent from the list is never planned.';
comment on column public.profiles.tracked_metrics is
  'What Progress charts for this person. Null means never chosen and falls back to the goal default; an empty array means they chose to track nothing.';
comment on column public.profiles.tracked_by_goal is
  'What Progress charts, per goal id. The per goal answer; tracked_metrics is the union across them.';
comment on column public.profiles.committed_at is
  'When the person made the commitment at the end of onboarding. Null means never.';
comment on column public.profiles.goal_tuning is
  'Per goal follow-up answers, keyed by goal id. Choice goals store a string, body goals store {areas, all}.';
