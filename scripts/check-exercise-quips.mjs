/* Runs his exercise-aware lines (quips.mjs, exerciseLinesTagged) over EVERY
   move in the library and fails if any of them is short of specific lines,
   names a muscle the library does not list for that move, carries an em or en
   dash, or is too long to be said in about two seconds.

   Why a script rather than eyeballing quip-lab: the lines are generated from
   library facts, so the only way to know a calf raise never hears about its
   back is to ask all 300 rows. Re-run it after any edit to the lines or to
   knowledge/exercise-library, which can change a move's muscles under them.

   Usage: node scripts/check-exercise-quips.mjs   (exit 1 on any failure) */
import { TRAININGS } from "../knowledge/exercise-library/index.mjs";
import { exerciseLinesTagged, SIGNATURE_NAMES } from "../quips.mjs";

/* The fewest lines a move may have at each moment. `rest` is checked twice:
   with sets left (where the "again" lines join) and after the last set. */
const MIN = { set: 4, rest: 2, restMore: 3, next: 2 };
const MAX_CHARS = 90;

/* Words that claim a muscle. "back" is left out on purpose: it is also a
   direction ("hips back", "come back"), and the lines that mean the muscle
   are tagged `lats` by construction, which the tag check covers. */
const VOCAB = [
  [/\bchest\b/i, ["chest"]],
  [/\bshoulders?\b/i, ["shoulders"]],
  [/\blats\b/i, ["lats"]],
  [/\btraps\b/i, ["traps"]],
  [/\bbiceps\b/i, ["biceps"]],
  [/\btriceps\b/i, ["triceps"]],
  [/\bforearms?\b/i, ["forearms"]],
  [/\bquads?\b/i, ["quads"]],
  [/\bhamstrings?\b/i, ["hamstrings"]],
  [/\bglutes?\b/i, ["glutes"]],
  [/\bcal(f|ves)\b/i, ["calves"]],
  [/\babs\b/i, ["abs"]],
  [/\bobliques\b/i, ["obliques"]],
  [/\blower back\b/i, ["lowerback"]],
  [/\bcore\b/i, ["abs", "obliques", "lowerback"]],
];

const rows = [];
for (const t of TRAININGS) for (const c of t.categories || []) for (const ex of c.exercises || []) {
  rows.push({ ...ex, training: t.id, category: c.key });
}

const fails = [];
const counts = { set: [], rest: [], restMore: [], next: [] };
const libNames = new Set(rows.map((r) => r.name.toLowerCase()));
for (const n of SIGNATURE_NAMES) if (!libNames.has(n)) fails.push(`signature "${n}" matches no library move, so it can never fire`);

const other = rows.find((r) => r.name === "Plank");
for (const ex of rows) {
  const where = `${ex.name} (${ex.training})`;
  const lists = {
    set: exerciseLinesTagged(ex, "set", { setsLeft: 2 }),
    rest: exerciseLinesTagged(ex, "rest", { setsLeft: 0 }),
    restMore: exerciseLinesTagged(ex, "rest", { setsLeft: 2 }),
    next: exerciseLinesTagged(ex, "next", { ex: other }),
  };
  const allowed = new Set([...(ex.primary || []), ...(ex.secondary || [])]);
  for (const [moment, lines] of Object.entries(lists)) {
    counts[moment].push(lines.length);
    if (lines.length < MIN[moment]) fails.push(`${where}: only ${lines.length} ${moment} lines (min ${MIN[moment]})`);
    const seen = new Set();
    for (const { text, muscles } of lines) {
      if (seen.has(text)) fails.push(`${where}: duplicate ${moment} line "${text}"`);
      seen.add(text);
      if (/[\u2013\u2014]/.test(text)) fails.push(`${where}: dash in "${text}"`);
      if (text.length > MAX_CHARS) fails.push(`${where}: ${text.length} chars, too long to say: "${text}"`);
      for (const m of muscles) if (!(ex.primary || []).includes(m)) fails.push(`${where}: tagged ${m}, not a primary: "${text}"`);
      /* The move's own name is not a claim: "Chest-Supported Row" says chest
         and works the back. Scanned with the name taken out. */
      const said = text.split(ex.name.replace(/\s*\([^)]*\)/g, "").trim()).join(" ");
      for (const [re, keys] of VOCAB) {
        if (re.test(said) && !keys.some((k) => allowed.has(k))) fails.push(`${where}: names ${keys.join("/")} which it does not work: "${text}"`);
      }
    }
  }
  /* A "rest" with nothing left must never promise another set. */
  for (const { text } of lists.rest) if (/\bagain\b|another set|more sets?\b/i.test(text)) fails.push(`${where}: promises another set with none left: "${text}"`);
}

const stat = (a) => `min ${Math.min(...a)}, median ${a.slice().sort((x, y) => x - y)[a.length >> 1]}, max ${Math.max(...a)}`;
console.log(`${rows.length} library rows checked (${libNames.size} distinct names), ${SIGNATURE_NAMES.length} with signature lines.`);
for (const [k, a] of Object.entries(counts)) console.log(`  ${k.padEnd(8)} specific lines per move: ${stat(a)}`);
if (fails.length) {
  console.log(`\nFAIL (${fails.length}):`);
  for (const f of fails) console.log("  " + f);
  process.exit(1);
}
console.log("OK: every move has specific lines at every moment, all true to its muscles, no dashes.");
