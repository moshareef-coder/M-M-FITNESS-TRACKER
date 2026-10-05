// Rest antics that are ours rather than the library's.
//
// The set the session stage picks from between sets lives in
// knowledge/motion/moves/idle.mjs, which is a collaborator's folder and read
// only to us. Mo, 2026-10-05: "We need to add more rest animations. The one
// where 'shake it off' looks so weird ... I think maybe just a stretch." So
// the shake-out is simply no longer picked (REST_ANTICS in index.html), and the
// stretch he asked for is authored here, in the library's own move format, so
// that the day it is wanted in knowledge/ it can be pasted across unchanged
// (mo-knowledge/LIBRARY-REQUESTS.md, item 14).
//
// knowledge/motion/index.mjs keeps its move table private and offers no way
// to register one, so this file also carries a small mount that draws a move
// with the rig's own render() and palette(). It is deliberately the same
// shape as mountMove's controller (setTheme, play, pause, seek, destroy), so
// the app's figure bookkeeping treats both alike.

import { render, palette } from "../../knowledge/motion/rig.mjs";

const FLOOR = 113.4;   // y of a pinned ankle standing on the ground, as idle.mjs
const stand = (xr, xl) => ({
  ankleR: { x: xr, y: FLOOR, bend: -1 },
  ankleL: { x: xl, y: FLOOR, bend: -1 },
});
// Front view feet pointing at the camera, drawn short and wide.
const FRONT_FEET = { R: { ang: 12, len: 0.4, w: 1.3 }, L: { ang: 12, len: 0.4, w: 1.3 } };
const ROOT = { x: 70, y: 61.6, rot: 0 };
const FEET = stand(78, 62);

// Arms hanging loose, the pose every rest starts and ends on, so the loop
// joins itself with no jump.
const DOWN = { shoulderR: 6, shoulderL: 6, elbowR: 10, elbowL: 10, wristR: 4, wristL: 4 };
// Both arms up, hands meeting over the head with the elbows soft and out, so
// the arms make a ring around the head. Measured against the alternatives on
// a contact sheet: straight parallel arms read as a goalpost, and wrists
// pinned above the crown draw the forearms across the face and hide it. The
// ring is the only overhead reach on this rig where the face stays in view.
const UP = { shoulderR: 178, shoulderL: 178, elbowR: 30, elbowL: 30, wristR: 0, wristL: 0,
             shoulderGirdleElevR: 4, shoulderGirdleElevL: 4 };

// ----------------------------------------------------------- stretch ----
// Standing square to the camera, the arms sweep out and up until the hands
// meet over the head, reach a little taller and hold there for a breath, then
// float back down the way they came and rest a beat. The big lazy stretch
// people do between sets. Must be visible: both arms up and long with the
// face still showing, which needs both sides in view, so front view.
//
// There is no side bend in it, though one was tried and is the obvious next
// step. In the frontal plane the shoulder angle sits right at its 180 degree
// seam with the arms overhead, so tipping the spine either way pushes one arm
// across the seam: one side folds the ring into an X over the face and the
// other throws it open into a V. Measured on a contact sheet at three ring
// sizes, none of them read as a lean. A clean reach is better than a broken
// lean.
//
// `oneway`, which plays the keys once and then holds the last one for the
// final 18% of the clock. Here that is wanted: the last key is the first
// pose, so the hold is a beat of standing with the arms down before the next
// stretch, and the wrap is seamless. Pingpong would also work but gives no
// rest at the bottom, so it reads as exercise rather than as a stretch.
const TALL = { ...UP, elbowR: 24, elbowL: 24, shoulderGirdleElevR: 7, shoulderGirdleElevL: 7 };
const STRETCH = {
  view: "front",
  loop: "oneway",
  dur: 6.4,
  breath: 0.5,
  // arms overhead are taller than the 140 box, so the scene is drawn a little
  // smaller and dropped, the way the library's side bend stretch does it
  fit: { k: 0.86, dy: 9 },
  feet: FRONT_FEET,
  keys: [
    { // arms loose at the sides
      t: 0,
      root: ROOT,
      joints: { spine: 0, neck: 0, ...DOWN },
      ik: { ...FEET },
    },
    { // swept out and up, hands meeting over the head
      t: 0.34,
      root: { ...ROOT, y: 61.3 },
      joints: { spine: 0, neck: 0, ...UP },
      ik: { ...FEET },
    },
    { // reaching taller and holding it: shoulders lift toward the ears
      t: 0.64,
      root: { ...ROOT, y: 60.9 },
      joints: { spine: 0, neck: 0, ...TALL },
      ik: { ...FEET },
    },
    { // and let go, back down to the sides
      t: 1,
      root: ROOT,
      joints: { spine: 0, neck: 0, ...DOWN },
      ik: { ...FEET },
    },
  ],
};

export const REST_MOVES = {
  "Rest: Stretch": STRETCH,
};
export const REST_MOVE_NAMES = Object.keys(REST_MOVES);
export const hasRestMove = (name) => Object.prototype.hasOwnProperty.call(REST_MOVES, name);

/* One rAF per mount rather than the library's shared loop: at most one rest
   antic is ever on screen, and a figure whose canvas has left the document
   stops its own loop on the next frame, so nothing leaks when the session
   screen replaces its innerHTML. */
export function mountRestMove(canvas, name, opts = {}) {
  const move = REST_MOVES[name];
  if (!canvas || !move) return null;
  let theme = opts.theme || "dark";
  const accent = opts.accent || "action";
  const skin = opts.skin || "mannequin";
  const body = opts.body || "male";
  let colors = palette(theme, accent, skin, body);
  let time = opts.t === undefined ? 0 : opts.t * move.dur;
  let playing = !opts.paused;
  let frame = null, last = 0, dead = false;

  const paint = () => {
    const cycle = ((time / move.dur) % 1 + 1) % 1;
    render(canvas, move, colors, cycle, time, { face: opts.face, mood: opts.mood, body });
  };
  const tick = (now) => {
    frame = null;
    if (dead) return;
    if (!canvas.isConnected) { last = 0; return; }
    // The same 50ms cap the library uses, so a tab coming back from the
    // background does not jump the figure halfway through its loop.
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
    last = now;
    time += dt;
    paint();
    if (playing) frame = requestAnimationFrame(tick);
  };
  const start = () => { if (!frame && playing && !dead) { last = 0; frame = requestAnimationFrame(tick); } };

  paint();
  start();

  const api = {
    play() { playing = true; start(); return api; },
    pause() { playing = false; if (frame) cancelAnimationFrame(frame); frame = null; return api; },
    seek(t) { time = Math.min(typeof t === "number" ? t : 0, 0.999999) * move.dur; paint(); return api; },
    setTheme(next) { theme = next; colors = palette(theme, accent, skin, body); paint(); return api; },
    get move() { return move; },
    destroy() {
      dead = true;
      if (frame) cancelAnimationFrame(frame);
      frame = null;
      const ctx = canvas.getContext("2d");
      if (ctx) { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height); }
    },
  };
  return api;
}
