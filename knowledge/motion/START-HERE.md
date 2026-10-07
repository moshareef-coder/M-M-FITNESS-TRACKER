# Unio animations: start here

For Yahya, who owns fixing the animations, and for any Claude session helping him.
Written 2026-10-06. AUTHORING.md next to this file is the deep reference for how
a move is built; this file is how the work flows.

## What you are working on

Every exercise in Unio is drawn by one figure (a robot in a white suit) that
the app animates from keyframes. There are about 285 animations:

| Section | Where it lives |
|---|---|
| Weight training, calisthenics, yoga, pilates, stretching, cardio | `knowledge/motion/moves/*.mjs` |
| The robot's rest animations (water, towel, phone, watch, shake-out) | `knowledge/motion/moves/idle.mjs` |
| Rest: Stretch | `mo-knowledge/motion/rest.mjs` |
| Cardio machines (treadmill run and so on) | `knowledge/motion/moves/cardio.mjs` |
| The figure itself, props, cameras | `knowledge/motion/rig.mjs` |
| Equipment drawings | `knowledge/motion/props/*.svg` |

## The two ways to fix one

**1. By hand, in Animation Studio** (the main way)

https://claude.ai/artifact/3eog6Vgew8BT3QtauyRuv5

- Set "Editing as" to your name (top left).
- Pick a category (Bodyweight, Barbell, Dumbbell, Cable, Machines, Yoga,
  Pilates, Stretching, Cardio, Resting), then an animation.
- Drag the coloured dots or use the sliders, press Play.
- **Complete** when it is right. **Looks right already** when it needed nothing.
- **Flag for review** when you want Mo to look, with a note saying what.
- **Reset** (tap twice) puts an animation back to how it is in the app and
  clears your saved version. Use it any time something goes wrong.
- Nothing reaches the app from the studio. When the batch is done, **Mo** tells
  Claude everything is ready, and Claude ships the Complete ones (see below).

**2. By asking Claude** in a terminal in your workspace (`~/unio-animations`):
describe the fix ("Barbell Row: the bar should touch the stomach at the top"),
Claude edits the move file and shows you frames.

## Rules Mo has set (do not break these)

- **Accuracy beats a pretty pose.** A clean pose of the wrong movement is worse
  than nothing; beginners copy what they see.
- **Pick the camera that shows the joint doing the work.** Lateral raises from
  the front, rows and hinges from the side, pull-ups from behind.
- **Keep the figure lean.** Never make the chest or thighs thicker.
- **Rest animations stay calm and readable**; no flailing (the shake-out was
  dropped for looking wrong).
- Galleries of animations start paused; click to play.
- No em dashes or en dashes in anything you write, code or text.

## Before anything is called done

```
node knowledge/motion/validate.mjs        # must say 0 invalid
node scripts/motion-sheet.mjs <library>   # contact sheet of frames to look at
node scripts/make-sandbox.mjs             # then check it in the sandbox app
```

Then send Mo the preview link and wait for his yes. Nothing goes to the live
app without Mo.

## For Claude: shipping what is complete

Only when **Mo** says the animations are ready (not on Yahya's word alone):

1. Read the studio's database: ArtifactData `list` on collection `moves` at
   https://claude.ai/artifact/3eog6Vgew8BT3QtauyRuv5, keep docs with
   `status: "complete"` (`fine` means nothing changed; `todo` means reset).
2. For each, put `keys` into that move's object **verbatim** (his numbers are
   the spec, never re-solve them). `name` says which move; find it with
   `grep -n '"<name>"' knowledge/motion/moves/*.mjs mo-knowledge/motion/rest.mjs`.
   Also copy the keys to every name in `applyTo` (offset the shoulder swing by
   the root rotation difference if their body tilt differs).
3. `node knowledge/motion/validate.mjs`: 0 invalid, or stop and tell him which
   one failed and why.
4. Commit, one commit per batch, naming each move and quoting his `note`.
5. Write each doc back with `status: "shipped"` (pin with `if_version`), adding
   `{status: "shipped", by: "Claude", at}` to `history`.
6. Republish the studio so its copy of the move files matches the repo
   (it serves its own copy: `knowledge/motion/**` and `mo-knowledge/motion/rest.mjs`
   published next to the page).
7. Docs with `status: "flagged"` are for Mo: list them with their `flagNote`,
   do not ship them.

## Where his work lives

`~/unio-animations` on its own branch, so it never collides with app work. Push
the branch for a preview link; Mo merges.
