/* Copies the engine and the exercise library INTO the edge function directory,
   so the function can be deployed the way every other function here is: the
   Management API, contents only, no bundler.

     node scripts/vendor-engine.mjs

   Why copies rather than imports. The function used to reach two directories
   outside supabase/functions/ for adapter.mjs, and transitively for
   knowledge/exercise-library/. That works under `supabase functions deploy`,
   which bundles, and silently does not under the Management API, which uploads
   exactly the files you hand it. Vendoring makes the function self contained
   and makes the deploy a plain multipart POST.

   The vendored copies are build output. mo-knowledge/engine/ and
   knowledge/exercise-library/ stay the sources; edit those, re-run this. */
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fn = join(root, "supabase/functions/generate-workout");
const ENGINE_SRC = join(root, "mo-knowledge/engine");
const LIB_SRC = join(root, "knowledge/exercise-library");
const ENGINE_OUT = join(fn, "_engine");
const LIB_OUT = join(fn, "_library");

/* Only what the function runs. demo, test and bakeoff are node-only and would
   fail Deno's import of node:fs on the way in. */
const ENGINE_FILES = ["adapter.mjs", "plan.mjs", "goal-engine.mjs", "training-age.mjs", "load.mjs", "calibrate.mjs", "pair.mjs", "alternatives.mjs", "focus.mjs", "preferences.mjs", "plateau-response.mjs"];

rmSync(ENGINE_OUT, { recursive: true, force: true });
rmSync(LIB_OUT, { recursive: true, force: true });
mkdirSync(ENGINE_OUT, { recursive: true });
mkdirSync(LIB_OUT, { recursive: true });

let count = 0;
for (const f of ENGINE_FILES) {
  let src = readFileSync(join(ENGINE_SRC, f), "utf8");
  /* The one import that leaves the engine directory. */
  src = src.replace(/["']\.\.\/\.\.\/knowledge\/exercise-library\/index\.mjs["']/g, '"../_library/index.mjs"');
  if (/^\s*import\b[^\n]*["']node:/m.test(src)) throw new Error(`${f} imports node:, it cannot run in the function`);
  writeFileSync(join(ENGINE_OUT, f), `/* VENDORED by scripts/vendor-engine.mjs from mo-knowledge/engine/${f}. Do not edit here. */\n` + src);
  count++;
}
for (const f of readdirSync(LIB_SRC).filter((n) => n.endsWith(".mjs"))) {
  writeFileSync(join(LIB_OUT, f), `/* VENDORED by scripts/vendor-engine.mjs from knowledge/exercise-library/${f}. Do not edit here. */\n` + readFileSync(join(LIB_SRC, f), "utf8"));
  count++;
}
console.log(`vendored ${count} files into ${fn.replace(root + "/", "")}/{_engine,_library}`);

/* Three agents in one round each added an import to plan.mjs and each had to
   remember to add it here. Two of them nearly shipped a bundle whose plan.mjs
   imported a file that was never copied, which fails at boot, in production,
   silently until somebody taps Generate. So check rather than remember. */
for (const f of ENGINE_FILES) {
  const src = readFileSync(join(ENGINE_OUT, f), "utf8");
  for (const m of src.matchAll(/from\s+["']\.\/([a-zA-Z0-9_-]+\.mjs)["']/g)) {
    if (!ENGINE_FILES.includes(m[1])) {
      throw new Error(`${f} imports ${m[1]}, which is not in ENGINE_FILES. Add it, or the deployed function cannot boot.`);
    }
  }
}
console.log("import check: every engine import is vendored");
