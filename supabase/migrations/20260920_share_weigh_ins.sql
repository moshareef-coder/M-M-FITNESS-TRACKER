-- Sharing your weigh-ins with your partner, 2026-09-20. NOT YET APPLIED.
--
-- Progress grew a switch on the right of its title that reads your partner's
-- side of the tab, and on a weight goal that tab IS the scale: the trend, the
-- goal weight, the range pills and every weigh-in in the window.
--
-- Nothing had ever drawn that before. RLS on fit_entries is ROW level, so a
-- partner who can read your day row has always been able to read the weight on
-- it (20260916_waist_measurements.sql says so, at length, and a policy cannot
-- hide one column of a visible row anyway). Being readable and being on screen
-- are different things, and nobody has agreed to the second one, because until
-- today there was nothing to agree to.
--
-- share_workout_details does not cover this and should not be stretched to.
-- That switch is about the gym: what you lifted, how much of it, which
-- muscles. Your body weight is a separate thing to be private about, and a
-- person who is happy for their partner to see every set can reasonably not
-- want them watching the scale. One switch cannot answer both questions.
--
-- DEFAULT FALSE, on purpose, and this is the line to change if you disagree
-- before running it. An opt out would turn the feature on for every existing
-- pair the moment this lands, with no warning and no conversation, for the
-- most sensitive number in the app. Opt in means the feature ships quiet and
-- switches on when somebody says so, in Settings > Partner > Your weigh-ins.
-- The app reads it as `=== true`, so a row that somehow ends up null is also
-- not shared.
alter table profiles add column if not exists share_weigh_ins boolean not null default false;

comment on column profiles.share_weigh_ins is 'opt in: may this account''s partner see its weigh-ins and tape measurements on their Progress tab. Off by default. Does not affect workout detail, which is share_workout_details; body photos are never shared either way';

-- No policy changes and none are possible: this cannot be enforced in RLS,
-- because the weight lives in a COLUMN of a row the partner is already allowed
-- to read, and Postgres row security has nothing to say about columns. The app
-- honours it in the client (partnerSharesBody in index.html), which is the
-- same place share_workout_details is honoured and has been since it shipped.
--
-- If that ever stops being good enough, the fix is not a policy here. It is
-- moving weight and the four tape columns out of fit_entries into their own
-- table with their own predicate, at which point RLS can enforce it for real.
-- That is a bigger change than a launch week can take, and it is worth writing
-- down that it is the real answer rather than pretending this one is.

select 'share_weigh_ins added' as result,
       (select count(*) from information_schema.columns
         where table_name = 'profiles' and column_name = 'share_weigh_ins') as column_present;
