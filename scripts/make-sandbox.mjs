/* Builds sandbox-app.html: the REAL index.html, with the fixture client
   injected straight after the Supabase CDN tag so window.supabase is already
   replaced by the time the app calls createClient().
     node scripts/make-sandbox.mjs

   WHY A COPY. index.html stays exactly as it ships. No sandbox flag, no dead
   branch in the production boot path, nothing to accidentally leave switched
   on. The copy lives on the same origin, so ./knowledge/*.mjs, the .riv and
   the service-worker-cached assets all resolve exactly as they do in the real
   app, which is the whole point: it is the app, not a mock of it.

   The service worker is the one thing removed. A sandbox that installs the
   production worker would start serving the sandbox shell to the real app. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, "index.html"), "utf8");

const CDN = '<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>';
if (!src.includes(CDN)) throw new Error("make-sandbox: could not find the Supabase script tag to inject after");

let out = src.replace(CDN, CDN + '\n<script src="/sandbox-data.js"></script>');

/* Registering the production worker from the sandbox would poison the cache
   for the real app, since they share an origin. */
const swCall = 'navigator.serviceWorker\n      .register("/sw.js", { updateViaCache: "none" })';
if (out.includes(swCall)) {
  out = out.replace(swCall, 'Promise.resolve()\n      .then(() => null)');
} else {
  console.warn("make-sandbox: service worker registration not found, check it is still disabled");
}

/* A visible marker, so a screenshot of the sandbox is never mistaken for the
   real app during a review. */
out = out.replace("</title>", " (sandbox)</title>");

writeFileSync(join(root, "sandbox-app.html"), out);
console.log(`sandbox-app.html written (${(out.length / 1024).toFixed(0)} KB)`);
