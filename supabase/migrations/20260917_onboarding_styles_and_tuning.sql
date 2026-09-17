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

alter table public.profiles
  add column if not exists train_styles text[],
  add column if not exists goal_tuning jsonb;

comment on column public.profiles.train_styles is
  'Training styles the person opted into. Null means never asked; anything absent from the list is never planned.';
comment on column public.profiles.goal_tuning is
  'Per goal follow-up answers, keyed by goal id. Choice goals store a string, body goals store {areas, all}.';
