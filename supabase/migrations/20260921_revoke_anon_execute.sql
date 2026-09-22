-- Anonymous callers can invoke every SECURITY DEFINER RPC, 2026-09-21.
--
-- Not a hole today: every one of these either checks auth.jwt()->>'email'
-- against an empty string and refuses, or fails an ownership lookup an empty
-- email cannot satisfy. Checked all twelve reachable ones by hand, not
-- assumed. This is defence in depth, closing the door a function's own logic
-- currently has to stand in front of: an unauthenticated caller should never
-- have been able to dial the number in the first place.
--
-- Two exceptions, left callable by anon on purpose:
--   peek_invite_link  join.html runs before sign-in, by design
--   claim_invite_link takes a row lock and refuses claimed/revoked/expired/
--                      self/already-paired tokens; pairing has to start
--                      signed out, that is what the link is for
revoke execute on function redeem_invite_code from anon;
revoke execute on function create_invite_link from anon;
revoke execute on function revoke_invite_link from anon;
revoke execute on function rotate_invite_code from anon;
revoke execute on function block_person from anon;
revoke execute on function leave_my_group from anon;
revoke execute on function remove_group_member from anon;
revoke execute on function respond_to_pair_invite from anon;
revoke execute on function respond_to_group_invite from anon;
revoke execute on function assign_workout from anon;
revoke execute on function mark_partner_entry_seen from anon;

-- purge_stale_live_sessions() lets an unauthenticated caller trigger a
-- cleanup delete. Harmless (it only removes sessions already four hours
-- stale) but there is no reason a stranger's button should exist. Revoked
-- from anon; the app never calls this directly, pg_cron does, and pg_cron
-- runs as the function owner regardless of grants.
revoke execute on function purge_stale_live_sessions from anon;

-- Verify after running: none of the above should appear in
-- `select routine_name from information_schema.routine_privileges
--  where grantee = 'anon' and privilege_type = 'EXECUTE'`.
-- peek_invite_link and claim_invite_link should still be there.
