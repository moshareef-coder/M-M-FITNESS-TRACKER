/* Inlines the engine into one script, so the bench can be published as a single
   file and still run the REAL modules rather than a copy of the logic.

     node scripts/bundle-engine.mjs > /tmp/engine.bundle.js

   WHY A BUNDLER AND NOT A COPY. A bench that reimplements the engine proves
   nothing: it can agree with a version of the engine that no longer exists.
   This reads the same files the edge function vendors, so a bench that is
   wrong is the engine being wrong.

   It handles exactly the syntax this engine uses, which is a small subset:
   `import { a, b } from "./x.mjs"`, `export function`, `export const`. Anything
   else throws rather than being mangled quietly, because a bundler that guesses
   is how a bench starts lying. */
import { readFileSync, statSync } from "node:fs";
import { dirname, resolve, relative } from "node:path";

const ROOT = resolve(dirname(new URL(import.meta.url).pathname), "..");
const ENTRY = resolve(ROOT, "mo-knowledge/engine/adapter.mjs");

const IMPORT_RE = /^import\s*\{([\s\S]*?)\}\s*from\s*"([^"]+)"\s*;?\s*$/gm;
const BAD_IMPORT_RE = /^import\s+(?!\{)/m;
const BAD_EXPORT_RE = /^export\s+(?!(function|const|async function)\b)/m;

const id = (abs) => relative(ROOT, abs);
const order = [];
const seen = new Map();   // abs -> "visiting" | "done"

function walk(abs) {
  const state = seen.get(abs);
  if (state === "done") return;
  if (state === "visiting") {
    /* A cycle would need exports to exist before the module that defines them
       has run, and `export const` is not hoisted, so the honest answer is to
       refuse rather than emit a bundle that fails at a distance. */
    throw new Error(`import cycle reaches ${id(abs)}; this bundler cannot express one`);
  }
  seen.set(abs, "visiting");
  const src = readFileSync(abs, "utf8");
  const bad = src.match(BAD_IMPORT_RE) || src.match(BAD_EXPORT_RE);
  if (bad) throw new Error(`${id(abs)}: unsupported module syntax "${bad[0].trim()}"`);
  for (const m of src.matchAll(IMPORT_RE)) {
    if (!m[2].startsWith(".")) throw new Error(`${id(abs)}: bare import "${m[2]}" cannot be bundled`);
    walk(resolve(dirname(abs), m[2]));
  }
  seen.set(abs, "done");
  order.push(abs);
}
walk(ENTRY);

const chunks = [];
for (const abs of order) {
  let src = readFileSync(abs, "utf8");
  src = src.replace(IMPORT_RE, (_, names, spec) =>
    `const {${names.replace(/\s+/g, " ").trim()}} = __req(${JSON.stringify(id(resolve(dirname(abs), spec)))});`);
  const names = [];
  src = src.replace(/^export\s+(async\s+function|function|const)\s+([A-Za-z_$][\w$]*)/gm, (_, kind, name) => {
    names.push(name);
    return `${kind} ${name}`;
  });
  chunks.push(
    `__M[${JSON.stringify(id(abs))}] = (__x, __req) => {\n${src}\n` +
    `Object.assign(__x, {${names.join(", ")}});\n};`);
}

const bytes = order.reduce((n, f) => n + statSync(f).size, 0);
process.stdout.write(
`/* Unio engine, bundled from source by scripts/bundle-engine.mjs.
   ${order.length} modules, ${Math.round(bytes / 1024)} KB. Do not edit: regenerate. */
const __M = {}, __C = {};
function __req(k) { if (__C[k]) return __C[k]; const x = {}; __C[k] = x; __M[k](x, __req); return x; }
${chunks.join("\n")}
const ENGINE = __req(${JSON.stringify(id(ENTRY))});
`);
process.stderr.write(`bundled ${order.length} modules, ${Math.round(bytes / 1024)} KB\n`);
