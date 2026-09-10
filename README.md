# Fit Together

A gamified fitness tracker for two, a shared weight trend line and gym streaks, built from a text conversation about wanting to push each other.

Single-page app (`index.html`), Supabase for auth, storage and realtime (shared project with the other creativelab1 apps), deployed as a static site on Vercel.

Real Supabase auth (Google sign-in and email magic link), with per-user row-level security. After signing in you pair with your training partner by invite code, or join a group. From there: a generated workout plan, guided live sessions with your partner, short recorded clips shared between you, shared ranks and XP, and a Body Impact view of muscle coverage over time.

Ships as an installable PWA (`manifest.webmanifest`, `sw.js`) and as a native iOS wrap via Capacitor (`ios/`, `capacitor.config.json`), synced from the same web build (`scripts/sync-web.mjs`).
