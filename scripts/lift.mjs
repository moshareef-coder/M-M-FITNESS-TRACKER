/* Lifts pieces of index.html out by name, for the scripts that run the app's
   own code somewhere other than the app: the state gallery and the body
   snapshot pre-render. Loud when something has been renamed, because a
   gallery that quietly draws last month's UI is worse than none. */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const root = join(dirname(fileURLToPath(import.meta.url)), "..");
export const src = readFileSync(join(root, "index.html"), "utf8");

export const style = src.match(/<style>([\s\S]*?)<\/style>/)[1];
export const fonts = src.match(/<link[^>]*fonts[^>]*>/g)?.join("\n") || "";

export function grab(re, what) {
  const m = src.match(re);
  if (!m) throw new Error(`could not find ${what} in index.html`);
  return m[0];
}

export function fn(name) {
  const m = src.match(new RegExp(`\\n(async )?function ${name}\\(.*?\\n}\\n`, "s"));
  if (!m) throw new Error(`function ${name}() is gone or was renamed. Fix the script that asked for it.`);
  return m[0];
}

/* Everything between two section banners, for code that is more than a
   function: the working-muscles block carries its caches and helpers too. */
export function section(fromBanner, toBanner) {
  const a = src.indexOf(fromBanner), b = src.indexOf(toBanner);
  if (a < 0 || b < 0 || b <= a) throw new Error(`could not find the section from ${fromBanner} to ${toBanner}`);
  return src.slice(a, b);
}

/* The figures the gallery shows, one per (exercise, whose body). The
   pre-render draws exactly these, in both themes, so the gallery's keys and
   the snapshot file agree by construction. Emails match the gallery fixtures. */
export const SNAP_SPECS = [
  { exerciseName: "Barbell Squat", who: "them", size: "lg", email: "mell@x" },
  { exerciseName: "Barbell Row", who: "them", size: "lg", email: "mell@x" },
  { exerciseName: "Calf Raise", who: "them", size: "lg", email: "mell@x" },
  { exerciseName: "Bench Press", who: "me", size: "sm", email: "mo@x" },
  { exerciseName: "Romanian Deadlift", who: "me", size: "sm", email: "mo@x" },
];

/* Who is which sex in the fixtures, so Male and Female figures both appear. */
export const SNAP_PROFILES = [{ email: "mo@x", sex: "Male" }, { email: "mell@x", sex: "Female" }];

export const SNAP_FILE = join(root, "scripts", ".body-snaps.json");
