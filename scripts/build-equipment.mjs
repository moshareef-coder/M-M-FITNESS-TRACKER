/* What each exercise is actually done on, derived from the animations.
 *
 *   node scripts/build-equipment.mjs          rewrite knowledge/equipment.mjs
 *   node scripts/build-equipment.mjs --check  fail if it is out of date
 *
 * The app used to guess equipment by matching words in the names of recently
 * logged lifts ("cable" in the name means cables). That is a guess, it cannot
 * tell a lat pulldown from a triceps pushdown, and it says nothing about which
 * attachment or which bench angle. Meanwhile every move already carries an
 * exact answer: the props its figure is drawn with. A move with a cable prop
 * whose grip is "rope" needs a rope. A move with lat-pulldown.svg needs that
 * machine. A bench prop at -35 degrees is a bench set to incline.
 *
 * So this reads the props and writes a plain data file the app imports. It is
 * generated rather than computed at runtime because the app must not load the
 * whole motion rig just to label a card, and because a generated table can be
 * read, reviewed and corrected by hand in the diff.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { MOVES_BY_LIBRARY } from "../knowledge/motion/index.mjs";
import { TRAININGS } from "../knowledge/exercise-library/index.mjs";

/* The catalogue. `group` is how a day's list is sorted, so the big things you
   have to walk to come first and the things you pick up come last. */
const KIT = {
  "lat-pulldown": ["Lat pulldown machine", "machine"],
  "seated-row": ["Seated row machine", "machine"],
  "chest-press": ["Chest press machine", "machine"],
  "shoulder-press": ["Shoulder press machine", "machine"],
  "pec-deck": ["Pec deck", "machine"],
  "leg-extension": ["Leg extension machine", "machine"],
  "leg-curl": ["Leg curl machine", "machine"],
  "leg-press": ["Leg press machine", "machine"],
  "hack-squat": ["Hack squat machine", "machine"],
  "seated-calf": ["Seated calf machine", "machine"],
  "reverse-hyper": ["Reverse hyper machine", "machine"],
  ghd: ["Glute-ham developer", "machine"],
  "back-extension": ["Back extension bench", "machine"],
  cable: ["Cable machine", "machine"],
  "cable-crossover": ["Cable crossover", "machine"],
  landmine: ["Landmine", "machine"],
  "smith-machine": ["Smith machine", "machine"],

  bench: ["Flat bench", "bench"],
  "bench-adjustable": ["Adjustable bench", "bench"],
  "preacher-bench": ["Preacher bench", "bench"],
  "pullup-bar": ["Pull-up bar", "station"],
  "dip-bars": ["Dip bars", "station"],
  parallettes: ["Parallettes", "station"],
  box: ["Box or step", "station"],
  "calf-block": ["Calf block", "station"],
  rack: ["Rack", "station"],
  "rig-post": ["Upright post", "station"],
  wall: ["A wall", "station"],
  doorway: ["A doorway", "station"],

  barbell: ["Barbell", "free"],
  "ez-bar": ["EZ bar", "free"],
  dumbbell: ["Dumbbells", "free"],
  "dumbbell-one": ["One dumbbell", "free"],
  kettlebell: ["Kettlebell", "free"],
  plate: ["Weight plate", "free"],
  "dip-belt": ["Dip belt", "free"],

  band: ["Resistance band", "small"],
  roller: ["Foam roller", "small"],
  "ab-wheel": ["Ab wheel", "small"],
  block: ["Yoga block", "small"],
  mat: ["Mat", "small"],
};

// A machine drawing names its own machine. hack-squat-sled and the rest are
// parts of one machine, so they collapse onto the machine they belong to.
const ARTWORK_KIT = {
  "lat-pulldown.svg": "lat-pulldown",
  "seated-row.svg": "seated-row",
  "chest-press.svg": "chest-press",
  "shoulder-press.svg": "shoulder-press",
  "pec-deck.svg": "pec-deck",
  "leg-extension.svg": "leg-extension",
  "leg-curl.svg": "leg-curl",
  "leg-press.svg": "leg-press",
  "leg-press-sled.svg": "leg-press",
  "hack-squat.svg": "hack-squat",
  "hack-squat-sled.svg": "hack-squat",
  "hack-squat-pad.svg": "hack-squat",
  "seated-calf.svg": "seated-calf",
  "calf-block.svg": "calf-block",
  "back-extension.svg": "back-extension",
  "reverse-hyper.svg": "reverse-hyper",
  "ghd.svg": "ghd",
  "preacher.svg": "preacher-bench",
  "landmine.svg": "landmine",
  "ab-wheel.svg": "ab-wheel",
  "crossover-beam.svg": "cable-crossover",
};

const GRIP_LABEL = {
  rope: "Rope attachment",
  vbar: "V-bar attachment",
  lat: "Wide lat bar",
  bar: "Straight bar attachment",
  handle: "Single handle",
  strap: "Ankle strap",
};

// A pulley is described by where it is, because walking up to the wrong one is
// the single most common way to start a cable exercise wrong.
function pulleyNote(top) {
  if (top <= 30) return "Pulley at the top";
  if (top >= 90) return "Pulley at the bottom";
  return "Pulley at chest height";
}

// Bench angles are authored as degrees, negative for a raised back rest.
function benchNote(inc) {
  if (!inc) return null;
  if (inc <= -60) return "Seat upright";
  if (inc < 0) return `Bench on incline, about ${Math.abs(inc)} degrees`;
  return `Bench on decline, about ${inc} degrees`;
}

function fromProps(move) {
  const kit = new Set(), setup = [];
  const props = move.props || [];
  const machineArtwork = props.some((p) => p.type === "artwork" && ARTWORK_KIT[base(p.src)]);
  let dumbbells = 0;
  for (const p of props) {
    switch (p.type) {
      case "artwork": {
        const id = ARTWORK_KIT[base(p.src)];
        if (id) kit.add(id);
        break;
      }
      case "cable": {
        // A machine that draws its own stack already named itself above; the
        // cable then only contributes which attachment is on the end of it.
        if (!machineArtwork) kit.add("cable");
        const g = p.grip || "bar";
        if (GRIP_LABEL[g]) setup.push(GRIP_LABEL[g]);
        setup.push(pulleyNote(p.top === undefined ? 16 : p.top));
        break;
      }
      case "bench": {
        const note = benchNote(p.incline || 0);
        kit.add(note ? "bench-adjustable" : "bench");
        if (note) setup.push(note);
        break;
      }
      case "box": kit.add(p.block ? "block" : "box"); break;
      case "roller": if (p.foam) kit.add("roller"); break;
      case "pullupBar": kit.add("pullup-bar"); break;
      case "dipBars": kit.add((p.y || 86) >= 80 ? "parallettes" : "dip-bars"); break;
      case "band": if (p.rest) kit.add("band"); break;
      case "wall": kit.add("wall"); break;
      case "doorframe": kit.add(p.pole ? "rig-post" : "doorway"); break;
      case "dumbbell": dumbbells++; break;
      case "kettlebell": kit.add("kettlebell"); break;
      case "mat": kit.add("mat"); break;
      // barbell is a PLATE seen end on: on a machine it is the machine's own
      // weight, on a bar it is the bar, and hung off a hip it is a dip belt.
      case "barbell": {
        if (machineArtwork) break;
        // A plate hung well BELOW the hip is on a belt; a bar across the
        // hips (the hip thrust) is not, and calling that a dip belt sent
        // somebody looking for a belt they do not need.
        if (p.point === "hip" && (p.dy || 0) >= 12) { kit.add("plate"); kit.add("dip-belt"); }
        else if (p.point === "hip") kit.add("barbell");
        else if ((p.r || 9.5) >= 6) kit.add("barbell");
        break;
      }
      default: break;
    }
  }
  /* Several moves build one adjustable bench out of two props, a flat seat
     and a back rest. That is one bench in the room, so listing both would
     send somebody looking for a second one. */
  if (kit.has("bench-adjustable")) kit.delete("bench");
  // One bell or a pair is worth saying: it decides what you carry over.
  if (dumbbells) kit.add(dumbbells === 1 ? "dumbbell-one" : "dumbbell");
  return { kit, setup };
}

const base = (src) => String(src || "").split("/").pop();

/* Names the library uses that the props cannot know about, because the drawing
   does not show them: an EZ bar reads as a bar, a Smith machine as a rack.
   A bench press is NOT on this list: its bar comes off the bench's own
   uprights, and naming a rack would send somebody across the gym. */
const NAME_KIT = [
  [/^EZ-Bar/, ["ez-bar"], ["barbell"]],
  [/^Preacher Curl$/, ["ez-bar"], ["barbell"]],
  [/Smith/, ["smith-machine"], []],
  [/^Barbell Back Squat$|^Front Squat$|^Zercher Squat$|^Good Morning$/, ["rack"], []],
];

/* Setup notes the props cannot carry. The lat pulldown's bar is drawn narrow
   so the figure reads at card size, but the machine takes the wide bar, and
   the person standing at it needs to know which one to clip on. */
const NAME_SETUP = [
  [/^Lat Pulldown$/, { drop: /attachment$/, add: ["Wide lat bar"] }],
  /* An angled bench is authored by its geometry, and the same raised pad is a
     decline when you lie on your back and an incline when you lie on your
     front. The drawing cannot tell those apart, so the two prone ones say so
     by name. */
  [/^Chest-Supported Row$|^Spider Curl$/, { drop: /^Bench on/, add: ["Bench on incline, about 45 degrees", "Lie face down on the pad"] }],
];

// Library equipment for the moves with no props at all, so a bodyweight move
// still says something rather than nothing.
const LIB_FALLBACK = { barbell: "barbell", dumbbell: "dumbbell", cable: "cable", machine: null, kettlebell: "kettlebell", bodyweight: null, band: "band" };

function libIndex() {
  const out = new Map();
  for (const t of TRAININGS) {
    for (const c of t.categories || []) {
      for (const ex of c.exercises || []) if (!out.has(ex.name)) out.set(ex.name, ex);
    }
  }
  return out;
}

function build() {
  const lib = libIndex();
  const rows = new Map();
  const seen = new Set();
  for (const MOVES of Object.values(MOVES_BY_LIBRARY)) {
    for (const [name, move] of Object.entries(MOVES)) {
      if (seen.has(move) && rows.has(name)) continue;
      seen.add(move);
      const { kit, setup } = fromProps(move);
      for (const [re, add, drop] of NAME_KIT) {
        if (!re.test(name)) continue;
        for (const d of drop) kit.delete(d);
        for (const a of add) kit.add(a);
      }
      for (const [re, rule] of NAME_SETUP) {
        if (!re.test(name)) continue;
        const kept = setup.filter((x) => !(rule.drop && rule.drop.test(x)));
        setup.length = 0; setup.push(...rule.add, ...kept);
      }
      if (!kit.size) {
        const ex = lib.get(name);
        const f = ex && LIB_FALLBACK[ex.equipment];
        if (f) kit.add(f);
      }
      rows.set(name, { kit: [...kit], setup: [...new Set(setup)] });
    }
  }
  // Library names with no animation at all still deserve a label.
  for (const [name, ex] of lib) {
    if (rows.has(name)) continue;
    const f = LIB_FALLBACK[ex.equipment];
    rows.set(name, { kit: f ? [f] : [], setup: [] });
  }
  return rows;
}

function serialise(rows) {
  const order = ["machine", "bench", "station", "free", "small"];
  const sortKit = (ids) => ids.slice().sort((a, b) => {
    const ga = order.indexOf(KIT[a]?.[1]), gb = order.indexOf(KIT[b]?.[1]);
    return ga - gb || (KIT[a]?.[0] || a).localeCompare(KIT[b]?.[0] || b);
  });
  const names = [...rows.keys()].sort();
  const lines = names.map((n) => {
    const r = rows.get(n);
    const kit = sortKit(r.kit);
    const setup = `[${r.setup.map((s) => JSON.stringify(s)).join(", ")}]`;
    return `  ${JSON.stringify(n)}: { kit: [${kit.map((k) => JSON.stringify(k)).join(", ")}], setup: ${setup} },`;
  });
  const kitLines = Object.entries(KIT).map(([id, [label, group]]) =>
    `  ${JSON.stringify(id)}: { label: ${JSON.stringify(label)}, group: ${JSON.stringify(group)} },`);
  return `/* GENERATED by scripts/build-equipment.mjs. Do not edit by hand.
 *
 * What every exercise is done on, read off the props its animation is drawn
 * with, so the machine named here is the machine in the picture. Regenerate
 * after changing any move's props:
 *
 *   node scripts/build-equipment.mjs
 *
 * \`kit\` is what you have to find; \`setup\` is how to set it up once you are
 * standing at it. An empty kit means bodyweight, nothing to fetch.
 */

export const KIT = {
${kitLines.join("\n")}
};

export const EQUIPMENT = {
${lines.join("\n")}
};

/* People and plans do not always use the library's full name: a plan can say
   "Bench Press" where the library says "Barbell Bench Press", and somebody
   typing their own exercise will write "bench press" or "Bench press".
   So: exact name, then the same name ignoring case and punctuation, then the
   ONE library name that ends with it. Ends with, not contains, because
   "Bench Press" is a bench press with a bar on it, while "Squat" could be six
   different lifts and a wrong machine is worse than no line at all. */
const NORM = new Map();
for (const n of Object.keys(EQUIPMENT)) {
  const k = n.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!NORM.has(k)) NORM.set(k, n);
}
export function resolveName(name) {
  if (!name) return null;
  if (EQUIPMENT[name]) return name;
  const k = String(name).toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!k) return null;
  if (NORM.has(k)) return NORM.get(k);
  const hits = [];
  for (const [nk, full] of NORM) if (nk.endsWith(k)) hits.push(full);
  if (hits.length === 1) return hits[0];
  /* Several matched. A gym settles this the same way every time: the
     unqualified name means the barbell one. "Bench press" is the barbell
     bench press, "row" is the barbell row, and anything else gets said out
     loud ("dumbbell row"). So one barbell candidate wins; no barbell
     candidate, or two, and we say nothing rather than name the wrong kit. */
  const words = String(name).trim().split(" ").filter(Boolean).length;
  if (words < 2) return null;      // "Press" is not a lift, it is half of one
  const barbell = hits.filter((n) => n.startsWith("Barbell "));
  return barbell.length === 1 ? barbell[0] : null;
}
export function kitOf(name) {
  const key = resolveName(name);
  return key ? EQUIPMENT[key] : null;
}

/* Everything one session needs, biggest thing first, deduplicated, with the
   exercises that want each so a card can say why. */
export function kitForSession(names = []) {
  const order = ${JSON.stringify(order)};
  const by = new Map();
  for (const name of names) {
    for (const id of (kitOf(name) || {}).kit || []) {
      if (!by.has(id)) by.set(id, []);
      by.get(id).push(name);
    }
  }
  // A day that wants a pair somewhere already sends you to the rack, so the
  // single-bell line would just be a second trip for the same shelf.
  if (by.has("dumbbell") && by.has("dumbbell-one")) {
    by.get("dumbbell").push(...by.get("dumbbell-one"));
    by.delete("dumbbell-one");
  }
  return [...by.entries()]
    .map(([id, uses]) => ({ id, label: (KIT[id] || {}).label || id, group: (KIT[id] || {}).group || "small", uses }))
    .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.uses.length - a.uses.length || a.label.localeCompare(b.label));
}

/* One line for a card: "Cable machine, rope attachment" or "Bodyweight". */
export function kitLine(name) {
  const r = kitOf(name);
  if (!r) return "";
  const labels = (r.kit || []).map((id) => (KIT[id] || {}).label || id);
  const all = labels.concat(r.setup || []);
  return all.length ? all.join(", ") : "Bodyweight, nothing to fetch";
}
`;
}

const out = serialise(build());
const path = new URL("../knowledge/equipment.mjs", import.meta.url);
if (process.argv.includes("--check")) {
  let cur = "";
  try { cur = readFileSync(path, "utf8"); } catch {}
  if (cur !== out) { console.error("knowledge/equipment.mjs is out of date: run node scripts/build-equipment.mjs"); process.exit(1); }
  console.log("equipment table is current");
} else {
  writeFileSync(path, out);
  console.log(`knowledge/equipment.mjs written (${out.split("\n").length} lines)`);
}
