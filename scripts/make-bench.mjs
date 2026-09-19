/* Builds engine-bench.html: the bench template with the real engine inlined.

     node scripts/make-bench.mjs

   The bench has to be ONE file, because it is published as an artifact and a
   single file publish cannot carry the 22 modules a relative import would need.
   Inlining the real source is the only way to keep the promise the page makes
   at the top: that this is the engine, not a copy of the logic.

   Regenerate after any engine change, the same way the sandbox is regenerated
   after an index.html change, or the bench answers for a build that is gone. */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { execFileSync } from "node:child_process";

const root = join(dirname(new URL(import.meta.url).pathname), "..");
const src = readFileSync(join(root, "engine-bench.src.html"), "utf8");
const MARK = "/*__ENGINE_BUNDLE__*/";
if (!src.includes(MARK)) throw new Error("make-bench: the template lost its engine placeholder");

const bundle = execFileSync("node", [join(root, "scripts/bundle-engine.mjs")], { encoding: "utf8", maxBuffer: 32 << 20 });
const out = src.replace(MARK, bundle);
writeFileSync(join(root, "engine-bench.html"), out);
console.log(`engine-bench.html written (${(out.length / 1024).toFixed(0)} KB)`);
