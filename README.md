# Fit Together

A gamified fitness tracker for two — shared weight trend line and gym streaks, built from a text conversation about wanting to push each other.

Single-page app (`index.html`), Supabase for storage (shared project with the other creativelab1 apps, table `fit_entries`), deployed as a static site on Vercel.

No real auth — first visit asks for a name, stored in `localStorage` on that device. Anyone with the anon key can read/write the table, which is an acceptable tradeoff for a 2-person personal app (same pattern used elsewhere in this account).
