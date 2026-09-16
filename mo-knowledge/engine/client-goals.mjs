/* What the CLIENT can actually send, read out of index.html.
 *
 * Written 2026-09-15, after `build-endurance` and `move-better` shipped in the
 * picker, resolved to "Stay consistent" for every user, and stayed green
 * through 285 tests, a 10,421 run sweep and a fuzzer. None of the three ever
 * tried either goal, because all three enumerated goals from
 * ../goals/goal-tree.json, which is the research tree and has nine bubbles that
 * the picker stopped matching. The instrument was only ever looking where it
 * already knew to look, which is the same shape as the blind spot that hid dead
 * calibration for months.
 *
 * So the gate reads the picker. index.html's GOAL_TILES is the only statement
 * anywhere of which `goal_bubble` values a real profile can carry, because the
 * app writes `profiles.goal_bubble` straight from the tile that was tapped. A
 * tile the engine cannot honour now fails a test instead of shipping.
 *
 * Read rather than mirrored, deliberately: a copy of this list in engine/ is
 * the bug this file exists to prevent, one directory over. Node only, which is
 * why nothing the app loads imports it: adapter.mjs has to stay Deno safe and
 * reads no files. Only test.mjs, sweep.mjs, fuzz.mjs and demo.mjs do.
 *
 * It throws rather than returning an empty list when it cannot find the table.
 * A gate that quietly checks nothing is worse than no gate, and an empty list
 * here would pass every caller below silently.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const CLIENT_FILE = join(here, "../../index.html");

const START = "const GOAL_TILES = [";

function tilesSource(html) {
  const from = html.indexOf(START);
  if (from < 0) {
    throw new Error(`client-goals: no "${START}" in ${CLIENT_FILE}. The picker was renamed or moved; `
      + `point this file at the new one rather than deleting the check.`);
  }
  const to = html.indexOf("\n];", from);
  if (to < 0) throw new Error(`client-goals: GOAL_TILES in ${CLIENT_FILE} is not closed by a line of "];".`);
  return html.slice(from + START.length, to);
}

/* One tile per `{ ... }` at the top level of the array. The objects are one per
   line in index.html and have no nested braces except `kids`, so the split is
   on "}," at depth zero, counted rather than assumed. */
function splitObjects(src) {
  const out = [];
  let depth = 0, start = -1;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (c === "{") { if (depth === 0) start = i; depth++; }
    else if (c === "}") { depth--; if (depth === 0 && start >= 0) { out.push(src.slice(start, i + 1)); start = -1; } }
  }
  return out;
}

const field = (src, key) => new RegExp(`\\b${key}\\s*:\\s*"([^"]*)"`).exec(src)?.[1] ?? null;

/* Every goal the picker offers, in the order it offers them.
 *   id      what lands in profiles.goal_bubble
 *   legacy  what lands in profiles.goal, for readers that predate the tiles
 *   kids    the child ids the tile can send, which is empty on every tile
 *           since the picker rewrite and is read anyway so that the day one
 *           comes back the gate covers it without being edited
 */
export function clientGoals() {
  const src = tilesSource(readFileSync(CLIENT_FILE, "utf8"));
  const tiles = splitObjects(src).map((o) => {
    const kidsSrc = /\bkids\s*:\s*\[([\s\S]*)\]\s*$/.exec(o.replace(/\s*\}\s*$/, ""))?.[1] ?? "";
    return {
      id: field(o, "id"),
      legacy: field(o, "legacy"),
      title: field(o, "title"),
      kids: splitObjects(kidsSrc).map((k) => field(k, "id")).filter(Boolean),
    };
  }).filter((t) => t.id);
  if (!tiles.length) throw new Error(`client-goals: GOAL_TILES in ${CLIENT_FILE} parsed to nothing.`);
  return tiles;
}

/* The same list as the {goal_bubble, goal_child} pairs a payload carries, which
   is what sweep.mjs and fuzz.mjs feed the engine. A tile with no children sends
   `goal_child: null`, exactly as every profile written since the rewrite does. */
export function clientGoalCases() {
  const out = [];
  for (const t of clientGoals()) {
    out.push({ id: `${t.id}/_client`, goal_bubble: t.id, goal_child: null, legacy: t.legacy });
    for (const kid of t.kids) out.push({ id: `${t.id}/${kid}`, goal_bubble: t.id, goal_child: kid, legacy: t.legacy });
  }
  return out;
}
