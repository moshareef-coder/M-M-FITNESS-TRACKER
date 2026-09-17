# Security audit

2026-09-17, against live production. Everything below was read from the running
project, not from the migrations, because the migrations say what we intended
and the database says what is true.

Scope: Postgres and RLS, storage, edge functions, auth configuration, project
configuration, and a sample of the client. **Not** a penetration test, and not
an exhaustive read of 28,000 lines of `index.html`.

## Update, later the same day

Everything below still describes what was found. What has since been fixed:

- 20260915_consent_and_leak_close.sql was applied, which the audit missed was
  sitting written and unrun. It closed **3** (invite codes now raise a request
  the owner answers, plus a rate limit), **6** (body photos out of the shared
  read policy) and removed the client INSERT policy on partnerships.
- The cron secret was rotated into vault, and 20260917_cron_secret_addendum.sql
  moved the last two functions off the literal, closing **7**. Verified: zero
  functions and zero cron jobs carry the old value.
- 20260917_invite_links.sql landed, which replaces the guessable six character
  code as the main route in with a 128 bit single use link.

Still open: **1** (SSL enforcement, open CIDR), **2** (password length, breach
check), **4** (captcha), **5** (PITR), **8** and **9**. The advisor still
returns zero errors.

## Verdict

The data layer is in good shape. Supabase's own security advisor returns **zero
errors**. Nothing found would leak one user's data to another today. The real
gaps are in project configuration and in one design decision about invite
codes that is harmless at nine users and is not harmless at a hundred thousand.

## What is actually solid

- **RLS is on for all 28 public tables.** Not one wide open policy: a query for
  any policy with `USING (true)` or no qualifier at all returns nothing.
- **Every policy routes through the same four helpers**, `is_me`, `can_see`,
  `my_partner_email`, `is_platform_admin`, so there is one place where
  visibility is decided rather than 89 places.
- **Anonymous callers get nothing.** The helpers resolve to the empty string
  with no JWT, so the question is whether any row carries an empty email and so
  matches. Checked across profiles, entries, logs, photos, tokens and
  partnerships: **zero rows**. NULL is safe already, since `lower(null) = ''` is
  null rather than true.
- **All 23 SECURITY DEFINER functions pin `search_path`.** This is the trap the
  repo already documents, and it is closed everywhere it matters.
- **No secrets in the client.** The only key in `index.html` is the publishable
  one. No service role key, no API secret, nothing.
- **Both storage buckets are private**, keyed by an email folder, with MIME
  allowlists and size caps, and read through signed URLs that expire (300s for
  clips, 3600s for proof).
- **All seven publicly reachable edge functions gate on a shared secret** before
  doing anything, compared to the end rather than short circuiting.
- **HTML escaping is disciplined.** `escapeHtml` is applied at the render helpers
  themselves, so partner-controlled strings land escaped even where the call
  site does not say so. Sampled the name, note and comment paths and found no
  hole. Sampled, not proven.

## Gaps, worst first

**1. The database accepts unencrypted connections, from anywhere.**
`ssl-enforcement` is off and the allowed CIDR list is `0.0.0.0/0` for both v4
and v6. The app itself goes through PostgREST over HTTPS and is unaffected, so
this is about direct Postgres access. Turn SSL enforcement on and restrict the
CIDR list. Both are free and neither can break the app.

**2. Passwords can be six characters, and leaked ones are allowed.**
`password_min_length` is 6, `password_required_characters` is unset, and
`password_hibp_enabled` is false, so a password that appears in a known breach
is accepted. Raise to 8 and turn on the breach check. Free, one settings page.

**3. An invite code pairs you instantly, with nobody's consent.**
This is the one worth arguing about. `redeem_invite_code` creates an **accepted**
partnership the moment a code matches. The owner of that code is not asked. From
that instant the redeemer can read their profile, weigh-ins, measurements,
workout history and **body photos**.

Codes are six characters from a 31 character alphabet, so 887 million of them.
At nine users, guessing one is one in a hundred million and not worth anyone's
time. At a hundred thousand users it is roughly one in nine thousand per guess,
and there is no captcha on signup and no rate limit on the RPC. It also matters
that people paste invite codes into bios and group chats, which is a problem no
amount of entropy fixes.

Three fixes, cheapest first: rotate a code the moment it is redeemed; make
redemption create a **pending** request the owner accepts, the way the invite
flow already works elsewhere in this app; rate limit redemption attempts per
account. The second is the one that actually matches what people expect.

**4. No captcha on signup.** Free signup with no challenge is what makes 3
practical at scale. Supabase supports hCaptcha or Turnstile as a toggle.

**5. Point in time recovery is off.** Seven daily backups, most recent
2026-09-16. Worst case is losing a day. Fine to launch on, worth buying once
there is data belonging to people who are not us.

**6. Body photos live in the workout-proof bucket**, whose read policy is
`can_see()`. That helper includes group visibility: a group with
`members_see_each_other`, or anyone holding an `owner` or `coach` role. Coaching
was cut, so no such group exists and nothing is exposed today. The path is
still there, and progress photos are the most sensitive thing in this database.
Either give body photos their own bucket read by `is_me` alone, or narrow the
policy to pairs.

**7. One `CRON_SECRET` across six functions.** A leak from any one of them is a
leak for all six, including the ones that delete. Cheap to split, and cheaper
still to just rotate it on a schedule.

**8. Five functions with a mutable `search_path`**: `is_me`, `my_email`,
`is_allowed_email`, `gen_invite_code`, `clamp_sessions`. All SECURITY INVOKER,
so there is no privilege to escalate to, which is why this is near the bottom.
Set it anyway, it costs one line each.

**9. `pg_net` is installed in the public schema.** Advisor warning, low risk,
move it when convenient.

## SOC 2: no, and not close

SOC 2 is not a law and not a standard anyone can fail. It is an audit report you
buy because a **business customer's procurement department will not sign without
one**. Unio sells to individual people through the App Store. Not one of them
will ever ask.

What it would cost: 20 to 60 thousand a year for tooling and the audit itself,
three to twelve months to a Type II report, and a meaningful share of our own
time writing policies and collecting evidence. Spending that now buys nothing.

**When it changes.** Start it the quarter a real B2B channel appears and not
before: gyms buying seats for members, an employer wellness programme, a
trainer platform reselling us. The trigger to watch for is the first security
questionnaire that arrives by email. Until then, the work that would go into
SOC 2 is better spent on the nine items above, which are the things that would
actually cause the breach the audit is meant to prevent.

**What does apply to us right now**, none of which is SOC 2:

- App Store privacy nutrition labels that match what we actually collect.
- A privacy policy that is reachable, current, and specific.
- Account deletion in the app, which is live and was verified in the launch
  readiness pass.
- GDPR and CCPA basics: deletion, export on request, a named contact. Deletion
  we have. Export is not built.
- If Apple Health ever ships, Guideline 5.1.3, which is stricter than anything
  here. See APPLE-HEALTH-PLAN.md.

## Order of work

Before submitting, all free, none of it can break the app:

1. SSL enforcement on.
2. Password minimum to 8, breach check on.
3. Captcha on signup.

Before real users arrive in numbers:

4. Invite codes become a request the owner accepts, or at minimum rotate on use.
5. Body photos out of the shared read policy.
6. Point in time recovery on.

Whenever:

7. Split or rotate `CRON_SECRET`.
8. `search_path` on the last five functions.
9. `pg_net` out of public.

## How to re-check this

The three commands that produced most of the above, so this can be re-run rather
than trusted:

- Advisor: `GET /v1/projects/<ref>/advisors/security`, and confirm zero at
  `level = error`.
- Open policies: `select * from pg_policies where schemaname='public' and
  (qual='true' or with_check='true')`. It must return nothing.
- Definer functions missing a pinned path: `select proname from pg_proc p join
  pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.prosecdef
  and coalesce(array_to_string(p.proconfig,','),'') not like '%search_path%'`. It
  must return nothing.
