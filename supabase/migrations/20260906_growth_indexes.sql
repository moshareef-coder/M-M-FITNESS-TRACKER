-- Indexes for the two tables that only ever grow, 2026-09-06.
--
-- fit_entries and exercise_logs had none beyond the primary key. Every read
-- of them filters by email and orders by entry_date, so without an index
-- that is a full table scan sorted in memory, on every loadAll(), which runs
-- after nearly every write. Harmless at today's row counts (a few hundred);
-- the kind of thing that starts costing real milliseconds once a table is in
-- the thousands, and cheap to fix before it does rather than after.
create index if not exists fit_entries_email_date_idx
  on fit_entries (email, entry_date);

create index if not exists exercise_logs_email_date_idx
  on exercise_logs (email, entry_date);

select 'growth indexes ready' as result,
       (select count(*) from pg_indexes where indexname = 'fit_entries_email_date_idx') as fit_entries_idx,
       (select count(*) from pg_indexes where indexname = 'exercise_logs_email_date_idx') as exercise_logs_idx;
