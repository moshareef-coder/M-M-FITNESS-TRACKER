-- Thirty days of premium, free, for everyone, 2026-10-09.
--
-- Mo, at launch: the free window goes from seven days to thirty. A week is
-- one or two workouts for most people, too few for the generator and the
-- weekly picture to become a habit before the paywall arrives. Same function,
-- same anchor (profiles.created_at), only the interval moves, so it takes
-- effect the moment this runs with no app update: accounts made in the last
-- thirty days get their premium back, including the ones whose week ran out.
--
-- What follows is the 2026-09-17 note, still true apart from the number.
--
--
-- Not a trial on pairing. Pairing stays free forever, the way it always has:
-- the free partner is how this app grows at all, somebody pays, invites their
-- partner for nothing, that partner forms a habit and eventually becomes a
-- payer of their own. Charging for the relationship, even after a week, kills
-- that loop outright and turns the best week of somebody's new habit into the
-- moment they get asked for money or lose their partner.
--
-- What trials instead is the thing actually being sold: the generator, the
-- planner, body impact, the progress analysis. Every new account gets all of
-- it free for thirty days from when the account was created, solo or paired,
-- no card required. On day thirty-one those features lock; everything shared with
-- a partner keeps working exactly as it did on day one.
--
-- Anchored to profiles.created_at, which already exists and already means
-- "when this account started", rather than a new column that could drift out
-- of step with it.

create or replace function is_premium()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    -- paid, the same check as before
    exists (
      select 1
        from subscriptions s
       where s.status in ('active', 'grace')
         and (s.expires_at is null or s.expires_at > now())
         and (lower(s.email) = my_email() or lower(s.email) = my_partner_email())
    )
    or
    -- or still inside the first thirty days of MY OWN account. Deliberately my
    -- own creation date only, never a partner's: a trial that could be
    -- refreshed by pairing with a brand new account would never actually end.
    exists (
      select 1
        from profiles p
       where lower(p.email) = my_email()
         and p.created_at > now() - interval '30 days'
    );
$$;

select 'premium trial is 30 days' as result,
       (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'is_premium') as fn_exists;
