-- Push was dead everywhere except a cable install, 2026-09-15.
--
-- The client wrote environment = 'development' as a literal, and this table
-- defaulted to the same word, because both were copied from the checked-in
-- App.entitlements. That file is not what a distribution build is signed with:
-- APNs mints a PRODUCTION token for anything signed for TestFlight or the App
-- Store, the sender posted it to the sandbox gateway, and Apple answered
-- BadDeviceToken. Every token this app has ever registered from a build that
-- was not plugged into a Mac is in here labelled wrong.
--
-- The client now asks the native side, which reads the aps-environment
-- entitlement out of the signature it is running under. This migration deals
-- with the rows that were written before it could.

-- A row that reaches this table without saying which gateway minted it came
-- from a build that shipped, and a build that shipped is production. The old
-- default made the failing case the quiet one.
alter table apns_tokens alter column environment set default 'production';

-- Rows are NOT rewritten. There is no way to tell from here which build
-- registered a given token, and guessing would break the ones that are right.
-- Instead send-nudges now retries the other gateway on BadDeviceToken and
-- writes the corrected environment back on success, so every mislabelled row
-- repairs itself the first time it is sent to.
--
-- What does have to happen here is giving them the chance. The sender only
-- considers tokens with failures < 5, and a token that has been aimed at the
-- wrong gateway since the TestFlight build went out is long past that: it would
-- sit excluded forever while the fix that could rescue it never ran. This is
-- one amnesty, not a policy change. A token that is genuinely dead fails both
-- gateways and climbs back past five on its own.
update apns_tokens set failures = 0 where failures >= 5;
