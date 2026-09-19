/* The recovery suggestion's rules, asserted rather than described.
 *
 *   node --test mo-knowledge/engine/recovery-pick.test.mjs
 *
 * Every case here is one of Mo's own sentences from 2026-09-18 turned into a
 * question the code has to answer the same way twice.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { recoveryPick, timeBand } from "./recovery-pick.mjs";

test("the bands are the ones people actually say", () => {
  assert.equal(timeBand(3), "late");
  assert.equal(timeBand(5), "morning");
  assert.equal(timeBand(11), "morning");
  assert.equal(timeBand(12), "afternoon");
  assert.equal(timeBand(16), "afternoon");
  assert.equal(timeBand(17), "evening");
  assert.equal(timeBand(21), "evening");
  assert.equal(timeBand(22), "late");
  assert.equal(timeBand(undefined), "afternoon", "a missing hour must not throw");
});

test("trained today gets holds for what was trained, named for the hour", () => {
  const p = recoveryPick({ hour: 19, trainedToday: true, groupsToday: ["lats", "biceps"] });
  assert.equal(p.kind, "stretch");
  assert.equal(p.block, "static");
  assert.equal(p.label, "Evening stretch");
  assert.deepEqual(p.groups, ["lats", "biceps"]);
});

test("a session finished early still gets its cool-down, labelled morning", () => {
  const p = recoveryPick({ hour: 6, trainedToday: true, groupsToday: ["quads"] });
  assert.equal(p.kind, "stretch");
  assert.equal(p.label, "Morning stretch");
});

test("training still ahead today is prep, not holds", () => {
  const p = recoveryPick({ hour: 8, planToday: { focus: "Leg day", groups: ["quads", "glutes"] } });
  assert.equal(p.kind, "prep");
  assert.equal(p.block, "dynamic", "holds before lifting is the thing to avoid");
  assert.equal(p.label, "Morning mobility");
  assert.match(p.why, /leg day/);
  assert.deepEqual(p.groups, ["quads", "glutes"]);
});

test("yoga is offered on an open evening, to somebody who does yoga", () => {
  const p = recoveryPick({ hour: 19, doesYoga: true });
  assert.equal(p.kind, "yoga");
  assert.equal(p.label, "Evening yoga");
});

test("yoga is never offered instead of a cool-down or a warm up", () => {
  assert.equal(recoveryPick({ hour: 19, doesYoga: true, trainedToday: true, groupsToday: ["chest"] }).kind, "stretch");
  assert.equal(recoveryPick({ hour: 8, doesYoga: true, planToday: { focus: "Push day", groups: ["chest"] } }).kind, "prep");
});

test("yoga is not offered to somebody who never ticked it", () => {
  assert.equal(recoveryPick({ hour: 19, doesYoga: false }).kind, "stretch");
});

test("yoga is not offered at six in the morning or at midnight", () => {
  assert.equal(recoveryPick({ hour: 6, doesYoga: true }).kind, "stretch");
  assert.equal(recoveryPick({ hour: 23, doesYoga: true }).kind, "stretch");
});

test("tomorrow's session is the reason given on an empty day", () => {
  const p = recoveryPick({ hour: 20, planTomorrow: { focus: "Pull day" } });
  assert.equal(p.kind, "stretch");
  assert.match(p.why, /Pull day tomorrow/);
  assert.doesNotMatch(p.why, /tonight/i, "this branch runs in the afternoon too");
});

test("a deliberate rest day is not told it logged nothing", () => {
  const p = recoveryPick({ hour: 14, restDay: true });
  assert.match(p.why, /rest day is the training/i);
});

test("every combination answers, and never with an empty label or reason", () => {
  for (const hour of [0, 3, 5, 9, 12, 16, 17, 21, 22, 23]) {
    for (const trainedToday of [true, false]) {
      for (const planToday of [null, { focus: "Push day", groups: ["chest"] }]) {
        for (const planTomorrow of [null, { focus: "Leg day" }]) {
          for (const doesYoga of [true, false]) {
            for (const restDay of [true, false]) {
              const p = recoveryPick({ hour, trainedToday, planToday, planTomorrow, doesYoga, restDay,
                groupsToday: trainedToday ? ["chest"] : [] });
              assert.ok(p.label && p.label.length > 3, `label missing at ${hour}h`);
              assert.ok(p.why && p.why.length > 8, `reason missing at ${hour}h`);
              assert.ok(["stretch", "prep", "yoga"].includes(p.kind));
              assert.ok(p.kind !== "yoga" || p.block === null);
              assert.ok(p.kind !== "prep" || p.block === "dynamic");
              assert.ok(p.kind !== "stretch" || p.block === "static");
            }
          }
        }
      }
    }
  }
});
