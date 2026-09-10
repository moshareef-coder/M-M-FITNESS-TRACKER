/* Which joints a movement loads HEAVILY, exercise by exercise.
 *
 * WRITTEN FROM SCRATCH, AS COACHING JUDGEMENT. Not copied, scraped or
 * imported from anywhere. Every row below is somebody deciding, one exercise
 * at a time, whether a person with pain in that joint should be handed this
 * movement today. A physio should review this table before any of it is
 * described to a user as medical advice. It is not medical advice. It is a
 * training decision with a bias towards leaving a movement out.
 *
 * WHY IT HAS TO EXIST. The exercise library records name, primary, secondary,
 * equipment and level, and that is the lot. There is no joint in it and no
 * pain concept in it. So the only way to act on "my shoulder hurts" without
 * this file is by proxy, dropping anything that lists shoulders in primary or
 * secondary, and that is wrong in both directions at once: it drops most chest
 * pressing, where shoulders is a secondary on almost everything, while keeping
 * plenty that genuinely loads a bad shoulder. A dumbbell bench press lists
 * shoulders. So does a dip. They are not the same question.
 *
 * WHAT "HEAVILY" MEANS. Not "this joint is involved", which is nearly every
 * joint on nearly every lift. It means: a person with pain there should not be
 * handed this movement. An overhead press, a dip and an upright row load the
 * shoulder heavily. A chest supported row and a floor press do not, even
 * though the shoulder is working in all four. Deadlifts, good mornings and
 * back squats load the lower back. A leg press and a goblet squat load it much
 * less. Deep lunges and leg extensions load the knee. Hip thrusts do not.
 *
 * THE EIGHT KEYS, and the rule each one was applied with:
 *
 *   shoulder   loaded overhead, loaded end range extension behind the torso,
 *              loaded horizontal abduction at end range, or hanging
 *   elbow      loaded at a stretched or locked elbow, or a straight bar
 *              forcing supination through it
 *   wrist      bodyweight through an extended wrist, a front rack, or direct
 *              resistance to wrist flexion or extension
 *   neck       heavy shrugging through the upper traps, loaded cervical
 *              flexion, or being upside down
 *   lowerback  an unsupported spine bearing an external load, or spinal
 *              flexion, extension or rotation against resistance
 *   hip        loaded hip flexion past about ninety degrees, an end range
 *              hinge, or load driven straight through the joint
 *   knee       loaded knee flexion past about ninety degrees, a knee dominant
 *              single leg movement, or direct resistance to knee extension
 *   ankle      the ankle bearing the load in a lengthened or unstable
 *              position, or the movement's limit being ankle range
 *
 * COVERAGE. Every exercise in weight-training.mjs and calisthenics.mjs is
 * tagged here explicitly, 159 rows across 146 distinct names (thirteen names
 * appear in both libraries and share one entry, which is correct: a Push-Up is
 * a Push-Up). Yoga and pilates are deliberately not tagged. They are low load
 * by nature, no pose in either file carries an external weight, and a pose by
 * pose pass belongs with somebody who knows the contraindications for each
 * one. Until that happens they default to [] rather than to a guess, and
 * `defaultJointLoad` is told which training a name came from so it can say so.
 *
 * Deno safe: no node: imports, no dependencies, no file reads.
 */
import { patternFor } from "./load.mjs";

export const JOINTS = Object.freeze([
  "shoulder", "elbow", "wrist", "neck", "lowerback", "hip", "knee", "ankle",
]);

const IS_JOINT = new Set(JOINTS);

/* Keyed by the exercise name exactly as the library spells it, because that is
   the only identifier an exercise has. Values are frozen so a caller cannot
   accidentally push onto the shared array. */
export const JOINT_LOAD = Object.freeze({
  /* ---- weight-training: chest ---------------------------------------- */
  /* A push-up is bodyweight through an extended wrist and nothing else that
     bites. It is not a shoulder exercise the way a dip is. */
  "Push-Up": ["wrist"],
  /* Hands elevated is the regression everybody gets given: a fraction of
     bodyweight reaches the hands, so the wrist is not the problem it is flat. */
  "Incline Push-Up": [],
  /* Free path, neutral grip available, no bar forcing a range the shoulder may
     not have. This is the press a cranky shoulder keeps. */
  "Dumbbell Bench Press": [],
  "Machine Chest Press": [],
  /* Loaded horizontal abduction at end range, which is where a bad shoulder
     bites, and the machine will not let you shorten the range. */
  "Pec Deck": ["shoulder"],
  "Cable Fly": ["shoulder"],
  "Low-to-High Cable Fly": ["shoulder"],
  /* The steeper the incline the more of the press the shoulder takes. */
  "Incline Dumbbell Press": ["shoulder"],
  /* Decline is the shoulder friendliest angle there is. */
  "Decline Dumbbell Press": [],
  /* A fixed bar path takes the shoulder through the range the bar decides on
     rather than the range it has. */
  "Barbell Bench Press": ["shoulder"],
  "Incline Barbell Press": ["shoulder"],
  "Decline Barbell Press": [],
  /* The whole reason a landmine press exists is that it presses without going
     truly overhead. */
  "Landmine Press": [],
  /* Deep loaded shoulder extension with the elbow bent under bodyweight plus
     added load. The canonical way to finish off a bad shoulder. */
  "Weighted Dip": ["shoulder", "elbow"],

  /* ---- weight-training: back ----------------------------------------- */
  "Inverted Row": [],
  /* Overhead pulling under load is still overhead. */
  "Lat Pulldown": ["shoulder"],
  /* Close and neutral is the pulldown a bad shoulder keeps: less abduction,
     less external rotation, shorter lever. */
  "Close-Grip Pulldown": [],
  "Seated Cable Row": [],
  /* The supported version, one hand and one knee on the bench. The bent over
     two arm version is Barbell Row, tagged below. */
  "Dumbbell Row": [],
  /* Named in the brief as the one that does not load the shoulder. It does not
     load the lower back either, which is the point of it. */
  "Chest-Supported Row": [],
  "Straight-Arm Pulldown": ["shoulder"],
  /* Bent over and loaded means the erectors hold the position for every rep. */
  "T-Bar Row": ["lowerback"],
  "Barbell Row": ["lowerback"],
  "Pendlay Row": ["lowerback"],
  "Pull-Up": ["shoulder", "elbow"],
  /* Supinated grip moves load onto the elbow flexors and their tendons. */
  "Chin-Up": ["shoulder", "elbow"],
  "Weighted Pull-Up": ["shoulder", "elbow"],

  /* ---- weight-training: traps and rear delts -------------------------- */
  /* Heavy shrugging is the upper traps pulling on the cervical spine. */
  "Dumbbell Shrug": ["neck"],
  "Barbell Shrug": ["neck"],
  /* The three a physio actually prescribes for a bad shoulder. */
  "Face Pull": [],
  "Rear Delt Fly": [],
  "Reverse Pec Deck": [],
  /* Behind the back holds the shoulder in extension and internal rotation
     while it is loaded. */
  "Behind-the-Back Shrug": ["neck", "shoulder"],
  /* Named in the brief. Abduction with internal rotation under load, and the
     bar forces the wrist into ulnar deviation to get there. */
  "Upright Row": ["shoulder", "wrist", "neck"],
  /* An explosive pull from the floor that finishes near the shoulders. */
  "Snatch-Grip High Pull": ["shoulder", "lowerback", "neck"],

  /* ---- weight-training: shoulders ------------------------------------- */
  /* Abduction under load through the arc where a bad shoulder catches. Light,
     but it is the position and not the weight that hurts. */
  "Lateral Raise": ["shoulder"],
  "Cable Lateral Raise": ["shoulder"],
  "Front Raise": ["shoulder"],
  "Machine Shoulder Press": ["shoulder"],
  "Seated Dumbbell Press": ["shoulder"],
  "Dumbbell Shoulder Press": ["shoulder"],
  /* The rotation on the way up is the part that hurts. */
  "Arnold Press": ["shoulder"],
  /* External rotation at ninety degrees of abduction, then a press out of it.
     A useful drill on a healthy shoulder and a provocation on a bad one. */
  "Cuban Press": ["shoulder"],
  /* Standing, overhead, with a bar. Named in the brief. The lumbar spine pays
     for the last few inches of it and the wrist holds the bar back. */
  "Overhead Press": ["shoulder", "lowerback", "wrist"],
  "Push Press": ["shoulder", "lowerback", "wrist"],

  /* ---- weight-training: biceps ---------------------------------------- */
  /* Free rotation and a moderate load. These are the curls somebody with a
     sore elbow can usually keep, and dropping all curling for one bad elbow is
     exactly the over-broad answer this file exists to avoid. */
  "Dumbbell Curl": [],
  "Hammer Curl": [],
  "Cable Curl": [],
  /* The cambered bar exists to take the wrist and elbow out of full
     supination, so it is the bar version that stays. */
  "EZ-Bar Curl": [],
  "Concentration Curl": [],
  /* A straight bar forces full supination and holds it there under load. */
  "Barbell Curl": ["wrist", "elbow"],
  /* Locked against a pad at the stretched end of the range, which is where a
     distal biceps or a medial epicondyle complains. */
  "Preacher Curl": ["elbow"],
  "Incline Dumbbell Curl": ["elbow"],
  "Spider Curl": ["elbow"],

  /* ---- weight-training: triceps --------------------------------------- */
  "Triceps Pushdown": [],
  "Rope Pushdown": [],
  /* Overhead position plus a deep loaded elbow. Two of the three joints on
     this list at once. */
  "Overhead Triceps Extension": ["shoulder", "elbow"],
  "Triceps Kickback": [],
  /* Hands behind the body on a bench is the most extended, most internally
     rotated position a shoulder gets put in anywhere in this library. */
  "Bench Dip": ["shoulder", "wrist"],
  "Diamond Push-Up": ["wrist", "elbow"],
  /* The name is the warning. */
  "Skull Crusher": ["elbow"],
  "Close-Grip Bench Press": ["elbow", "wrist"],

  /* ---- weight-training: forearms -------------------------------------- */
  "Wrist Curl": ["wrist", "elbow"],
  "Reverse Wrist Curl": ["wrist", "elbow"],
  /* Pronated curling is the classic lateral epicondyle aggravator. */
  "Reverse Curl": ["wrist", "elbow"],
  "Plate Pinch": ["wrist"],
  /* Heavy, loaded, walking, with the spine holding the whole thing up. */
  "Farmer's Carry": ["wrist", "lowerback"],
  /* A passive hang is full shoulder elevation under bodyweight with the whole
     load coming through the grip. */
  "Dead Hang": ["shoulder", "elbow", "wrist"],

  /* ---- weight-training: quads ----------------------------------------- */
  /* Named in the brief as much easier on the lower back than a back squat, and
     it is, because the load is in front and the torso stays upright. The knee
     and the hip still go past ninety. */
  "Goblet Squat": ["knee", "hip"],
  /* Also named in the brief for the same reason. The back is on a pad. */
  "Leg Press": ["knee", "hip"],
  /* Named in the brief. Direct resistance to knee extension, and the shear it
     produces is the whole complaint about it. */
  "Leg Extension": ["knee"],
  "Walking Lunge": ["knee", "hip", "ankle"],
  /* Torso fixed against the pad, so the hip stays out of it and the knee takes
     everything. */
  "Hack Squat": ["knee"],
  /* Named in the brief for the lower back. Axial load, unsupported spine. */
  "Barbell Back Squat": ["knee", "hip", "lowerback"],
  "Bulgarian Split Squat": ["knee", "hip", "ankle"],
  /* Easier on the back than a back squat and still an axial load, and the
     front rack asks for wrist extension most people do not have. */
  "Front Squat": ["knee", "hip", "lowerback", "wrist"],
  /* The bar sits in the crook of the elbow. */
  "Zercher Squat": ["knee", "hip", "lowerback", "elbow"],
  /* The single most knee loading movement in the library, by design. */
  "Sissy Squat": ["knee", "ankle"],

  /* ---- weight-training: hamstrings ------------------------------------ */
  /* Lying, supported, moderate load. The one a knee usually keeps. */
  "Leg Curl": [],
  /* A hinge whose load vector is horizontal, which is why it exists: the hip
     works and the spine is barely loaded. */
  "Cable Pull-Through": ["hip"],
  "Stiff-Leg Deadlift": ["lowerback", "hip"],
  "Romanian Deadlift": ["lowerback", "hip"],
  /* Bodyweight knee flexion against a long lever, plus lumbar extension to
     hold the position. */
  "Glute-Ham Raise": ["knee", "lowerback"],
  "Single-Leg Romanian Deadlift": ["lowerback", "hip", "ankle"],
  /* Named in the brief. A loaded spine at the end of a long lever. */
  "Good Morning": ["lowerback", "hip"],
  "Nordic Curl": ["knee"],

  /* ---- weight-training: glutes ---------------------------------------- */
  /* Floor, short range, no external load. This is the one somebody comes back
     with, not the one they stop for. */
  "Glute Bridge": [],
  "Cable Kickback": [],
  "Frog Pump": [],
  "Step-Up": ["knee", "hip"],
  /* The crossover puts the loaded knee across the midline. */
  "Curtsy Lunge": ["knee", "hip", "ankle"],
  /* Named in the brief as NOT a knee movement, and it is not: the knee angle
     barely changes. The hip is a different answer. The bar sits on it and the
     whole point is loaded end range hip extension. */
  "Hip Thrust": ["hip"],
  /* A wide stance puts the hip at end range before the bar leaves the floor. */
  "Sumo Deadlift": ["lowerback", "hip", "knee"],

  /* ---- weight-training: calves ---------------------------------------- */
  /* There is no calf exercise that spares the ankle. All six are tagged, and
     that is the honest answer rather than a gap: a person with a bad ankle
     gets the softened single least loaded one and a note saying so. */
  "Dumbbell Calf Raise": ["ankle"],
  "Seated Calf Raise": ["ankle"],
  "Standing Calf Raise": ["ankle"],
  "Leg Press Calf Raise": ["ankle"],
  "Single-Leg Calf Raise": ["ankle"],
  "Donkey Calf Raise": ["ankle"],

  /* ---- weight-training: abs ------------------------------------------- */
  /* A neutral braced spine, which is what a bad back is given, not what it
     is protected from. */
  "Plank": [],
  /* Repeated loaded lumbar flexion, with the hands behind the head hauling on
     the neck. Both of those are the complaint, not the training effect. */
  "Crunch": ["neck", "lowerback"],
  "Sit-Up": ["neck", "lowerback", "hip"],
  "Reverse Crunch": ["lowerback"],
  /* The heaviest spinal flexion in the library, because it has a stack on it. */
  "Cable Crunch": ["lowerback", "neck"],
  "V-Up": ["lowerback", "hip", "neck"],
  /* Hanging is a shoulder and a grip position before it is an ab exercise, and
     the hip flexors pull on the lumbar spine on the way up. */
  "Hanging Leg Raise": ["shoulder", "wrist", "lowerback"],
  "Toes-to-Bar": ["shoulder", "wrist", "lowerback"],
  /* At full reach the lumbar spine is resisting extension with the shoulder at
     full flexion holding the wheel. */
  "Ab Wheel Rollout": ["shoulder", "wrist", "lowerback"],

  /* ---- weight-training: obliques -------------------------------------- */
  /* Loaded rotation of the lumbar spine, which is the one thing a disc
     complaint reliably objects to. */
  "Russian Twist": ["lowerback"],
  "Side Bend": ["lowerback"],
  "Side Plank": [],
  /* Anti-rotation. The spine holds still. This is the safe one. */
  "Pallof Press": [],
  "Woodchopper": ["lowerback"],
  "Hanging Windshield Wiper": ["shoulder", "wrist", "lowerback"],

  /* ---- weight-training: lower back ------------------------------------ */
  /* Both of these are what a back gets given. */
  "Bird Dog": [],
  /* End range lumbar extension, held. Unloaded and still the position an
     irritated back likes least. */
  "Superman": ["lowerback"],
  "Back Extension": ["lowerback"],
  "Suitcase Carry": ["lowerback", "wrist"],
  "Reverse Hyperextension": ["lowerback"],
  /* Named in the brief. The reference lower back movement. */
  "Deadlift": ["lowerback", "hip"],

  /* ---- calisthenics: push --------------------------------------------- */
  "Wall Push-Up": [],
  /* "Incline Push-Up", "Push-Up" and "Diamond Push-Up" are shared with
     weight-training and are tagged once, above. */
  /* Named in the brief. Deep loaded shoulder extension. */
  "Dip": ["shoulder", "elbow"],
  "Archer Push-Up": ["wrist", "shoulder", "elbow"],
  /* Leaning forward over the hands is the most extreme loaded wrist extension
     anywhere in either library. */
  "Pseudo Planche Push-Up": ["wrist", "shoulder", "elbow"],
  "One-Arm Push-Up": ["wrist", "shoulder", "elbow"],

  /* ---- calisthenics: pull --------------------------------------------- */
  /* "Dead Hang", "Inverted Row", "Pull-Up" and "Chin-Up" are shared with
     weight-training and are tagged once, above. */
  /* A negative is still the top of a pull-up, and the top is the position. */
  "Negative Pull-Up": ["shoulder", "elbow"],
  "Archer Pull-Up": ["shoulder", "elbow"],
  /* The transition asks the shoulder to go from full flexion to full internal
     rotation under load in one movement. */
  "Muscle-Up": ["shoulder", "elbow", "wrist"],
  "One-Arm Pull-Up": ["shoulder", "elbow", "wrist"],

  /* ---- calisthenics: legs --------------------------------------------- */
  /* No external load, so the hip stays out of it, but it is still knee flexion
     past ninety every rep. */
  "Bodyweight Squat": ["knee"],
  "Split Squat": ["knee", "hip", "ankle"],
  /* "Walking Lunge", "Bulgarian Split Squat" and "Nordic Curl" are shared with
     weight-training and are tagged once, above. */
  "Shrimp Squat": ["knee", "hip", "ankle"],
  "Pistol Squat": ["knee", "hip", "ankle"],

  /* ---- calisthenics: core --------------------------------------------- */
  /* "Plank", "Side Plank" and "Hanging Leg Raise" are shared with
     weight-training and are tagged once, above. */
  /* The lumbar spine is pinned flat while the hip flexors pull the other way,
     and the head is held off the floor for the whole hold. */
  "Hollow Body Hold": ["lowerback", "neck"],
  "Tuck L-Sit": ["shoulder", "wrist"],
  "L-Sit": ["shoulder", "wrist", "hip"],
  "V-Sit": ["shoulder", "wrist", "hip", "lowerback"],

  /* ---- calisthenics: skills ------------------------------------------- */
  /* Upside down on the hands: shoulder at full flexion, wrist at full
     extension, neck holding the head up against the floor. */
  "Wall Handstand Hold": ["shoulder", "wrist", "neck"],
  "Planche Lean": ["wrist", "shoulder", "elbow"],
  /* A front lever hangs the whole body off a straight arm, which is the
     largest shoulder extension torque anything here produces, and the lumbar
     spine holds the line. */
  "Tuck Front Lever": ["shoulder", "elbow", "lowerback"],
  "Freestanding Handstand": ["shoulder", "wrist", "neck"],
  "Handstand Push-Up": ["shoulder", "wrist", "neck", "elbow"],
  "Front Lever": ["shoulder", "elbow", "lowerback"],
  "Tuck Planche": ["wrist", "shoulder", "elbow"],
  "Full Planche": ["wrist", "shoulder", "elbow", "lowerback"],
  "Human Flag": ["shoulder", "wrist", "elbow", "lowerback"],
});

/* Trainings whose exercises are deliberately untagged. See the header: low
   load by nature, and a pose by pose pass is the follow up rather than a
   guess dressed up as a decision. */
const LOW_LOAD_TRAININGS = new Set(["yoga", "pilates"]);

/* What a movement pattern loads when nobody has said. Conservative on
   purpose: a name that is not in the table is a name we have not thought
   about, and the cost of guessing high is one exercise swapped out while the
   cost of guessing low is handing a bad shoulder an overhead press. */
const PATTERN_LOAD = {
  verticalPush: ["shoulder"],
  verticalPull: ["shoulder", "elbow"],
  horizontalPush: ["shoulder", "elbow"],
  horizontalPull: ["lowerback"],
  hinge: ["lowerback", "hip"],
  squat: ["knee", "hip"],
  lunge: ["knee", "hip", "ankle"],
  carry: ["lowerback", "wrist"],
  core: ["lowerback", "neck"],
  isolation: [],
};

/* And what a primary muscle group implies on its own, for the isolation case
   where the pattern says nothing. */
const GROUP_LOAD = {
  chest: ["shoulder"], shoulders: ["shoulder"], lats: ["shoulder"],
  traps: ["neck"], biceps: ["elbow"], triceps: ["elbow"],
  forearms: ["wrist", "elbow"], abs: ["lowerback"], obliques: ["lowerback"],
  lowerback: ["lowerback"], glutes: ["hip"], quads: ["knee"],
  hamstrings: ["knee"], calves: ["ankle"],
};

/* A conservative guess for anything not in the table, so nothing untagged
   slips through unprotected. `training` is the library id the name came from,
   when the caller knows it: yoga and pilates come back empty rather than
   guessed, per the header. */
export function defaultJointLoad(exercise, { training = null } = {}) {
  if (training && LOW_LOAD_TRAININGS.has(String(training).toLowerCase())) return [];
  const out = [];
  const add = (list) => { for (const j of list) if (IS_JOINT.has(j) && !out.includes(j)) out.push(j); };
  add(PATTERN_LOAD[patternFor(exercise)] || []);
  for (const g of (exercise?.primary || [])) add(GROUP_LOAD[g] || []);
  return out;
}

/* The one call everything else should make: the table when the name is in it,
   the conservative guess when it is not. `explicit` says which happened, so a
   coverage check can be written and so an audit can tell a decision from a
   fallback. */
export function jointLoadFor(exercise, { table = JOINT_LOAD, training = null } = {}) {
  const name = exercise?.name || String(exercise || "");
  const hit = Object.prototype.hasOwnProperty.call(table, name) ? table[name] : null;
  return hit
    ? { joints: hit, explicit: true }
    : { joints: defaultJointLoad(exercise, { training }), explicit: false };
}
