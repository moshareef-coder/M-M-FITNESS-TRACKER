-- Fit Together: RLS verification. Read only, safe to run any time.
-- Paste the whole file into the Supabase SQL editor. It prints five results.
-- Nothing here writes, drops or alters anything.

-- 1. THE MATRIX. Every table in public: is RLS on, how many policies, and
--    which commands are covered. What you want to see:
--      rls_enabled = true on every row
--      policies > 0 on every row EXCEPT nudge_log and ai_usage_log, which are
--        deliberately service-role-only (RLS on, zero policies, nobody but the
--        service key can touch them)
--    A row with rls_enabled = false is an open table: anybody with the anon
--    key can read and write every row in it.
select c.relname                                as table_name,
       c.relrowsecurity                         as rls_enabled,
       c.relforcerowsecurity                    as rls_forced,
       count(p.polname)                         as policies,
       count(*) filter (where p.polcmd = 'r')   as select_policies,
       count(*) filter (where p.polcmd = 'a')   as insert_policies,
       count(*) filter (where p.polcmd = 'w')   as update_policies,
       count(*) filter (where p.polcmd = 'd')   as delete_policies,
       count(*) filter (where p.polcmd = '*')   as all_policies,
       count(*) filter (where not p.polpermissive) as restrictive_policies
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
left join pg_policy p on p.polrelid = c.oid
where n.nspname = 'public' and c.relkind = 'r'
group by c.relname, c.relrowsecurity, c.relforcerowsecurity
order by c.relrowsecurity, count(p.polname), c.relname;

-- 2. THE PREDICATES. Read these as an attacker. Anything whose USING is
--    `true`, `auth.role() = 'authenticated'`, or mentions no email column at
--    all lets any signed in user reach every row.
select tablename,
       policyname,
       cmd,
       permissive,
       roles,
       qual        as using_expression,
       with_check  as with_check_expression
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;

-- 3. STORAGE. Buckets first: `public = true` means every object in it is
--    readable by URL with no token and no account, which for workout-proof
--    would expose proof photos, avatars and body photos to anyone who can
--    guess or obtain a path.
select id, name, public, file_size_limit, allowed_mime_types, created_at
from storage.buckets
order by id;

-- Then the object policies. Check that every one of them constrains
-- (storage.foldername(name))[1] to an email the caller is allowed to reach.
select policyname, cmd, permissive, roles, qual as using_expression, with_check
from pg_policies
where schemaname = 'storage' and tablename = 'objects'
order by cmd, policyname;

-- 4. THE COLUMN LOCKS. RLS guards rows, not columns, so these triggers are
--    what stops a user rewriting a column that decides visibility or trust on
--    a row they are otherwise allowed to update. Expect six rows after
--    20260911_rls_hardening.sql is applied:
--      lock_partnership_parties_trg, lock_group_member_fields_trg (09-03)
--      lock_partnership_insert_trg, lock_group_member_insert_trg,
--      lock_group_fields_trg, lock_profile_trust_fields_trg (09-11)
select c.relname as table_name,
       t.tgname  as trigger_name,
       case when t.tgtype::int & 4 = 4 then 'INSERT ' else '' end ||
       case when t.tgtype::int & 16 = 16 then 'UPDATE ' else '' end ||
       case when t.tgtype::int & 8 = 8 then 'DELETE ' else '' end as fires_on,
       case when t.tgtype::int & 2 = 2 then 'BEFORE' else 'AFTER' end as timing,
       t.tgenabled as enabled
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by c.relname, t.tgname;

-- 5. REALTIME. Which tables are published to subscribers. Postgres Changes
--    applies RLS per subscriber for INSERT and UPDATE, but a DELETE event
--    carries the primary key only and is delivered without an RLS check, so
--    anything published here leaks its primary key on delete to every
--    subscriber. live_sessions is keyed on email.
select pubname, schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
order by tablename;

-- 6. The helper functions every policy leans on. Read these last and read
--    them carefully: if can_see() is wrong, every policy that calls it is
--    wrong, and it is called by most of them.
select p.proname,
       pg_get_function_identity_arguments(p.oid) as args,
       p.prosecdef                               as security_definer,
       pg_get_functiondef(p.oid)                 as definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('is_me', 'can_see', 'my_email', 'my_partner_email',
                    'i_own_group', 'cheers_allowed', 'redeem_invite_code',
                    'respond_to_group_invite', 'assign_workout',
                    'remove_group_member', 'mark_partner_entry_seen')
order by p.proname;
