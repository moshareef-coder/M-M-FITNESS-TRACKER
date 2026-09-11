// Stretching library. We built this because the generator in mo-knowledge/engine/ had no
// stretching at all, and mo-knowledge/research/11-real-goals.md found that 48% of people
// setting 2026 goals want mobility, flexibility or posture, a bubble that is "five to ten
// minutes a day of work and nobody offers it". The engine reads this file three ways: it
// picks "dynamic" entries for a warm-up before a session, "static" entries for a cool-down
// after it, and "mobility" entries for the standalone daily block we give anyone whose goal
// is flexibility or mobility. Warm-up and cool-down picks are matched to the muscles the
// session actually trained, so every one of the 14 muscle keys is covered in both.
//
// Muscle keys match MUSCLE_GROUPS in index.html exactly (chest, shoulders, traps, lats,
// lowerback, biceps, triceps, forearms, abs, obliques, glutes, quads, hamstrings, calves),
// so stretch volume lands in the same heat map as lifting. Tissues without their own key are
// mapped to the nearest one: hip flexors to quads, neck to traps, thoracic spine and upper
// back to traps and lats, adductors and groin to quads with glutes secondary, ankles to calves.
//
// kind mirrors the category key, so a single entry can be filtered without its parent.
// seconds is how long ONE round lasts, and perSide tells the timer to double it for left
// then right. equipment is "none" for almost everything on purpose: a warm-up nobody can
// start because they lack a strap is a warm-up nobody does.
//
// level: beginner | intermediate | advanced -- how much body awareness the move takes to do
// safely, NOT how hard it feels. Most stretches are beginner.
//
// avoidIf lists joints from the app's pain list (shoulder, elbow, wrist, neck, lowerback,
// hip, knee, ankle). It is present only when the stretch loads that joint in a way someone
// with pain there should skip, so an empty case omits the key rather than carrying [].

export const STRETCHING = {
  id: "stretching",
  label: "Stretching",
  trackingMode: "duration",
  categories: [
    {
      key: "dynamic",
      label: "Dynamic, before training",
      exercises: [
        { name: "Arm Circles", primary: ["shoulders"], secondary: ["chest", "traps"], kind: "dynamic", seconds: 30, perSide: false, equipment: "none", level: "beginner", cue: "Start with small circles and let them grow. Keep the ribs down so the movement happens at the shoulder." },
        { name: "Shoulder Rolls", primary: ["traps"], secondary: ["shoulders"], kind: "dynamic", seconds: 25, perSide: false, equipment: "none", level: "beginner", cue: "Roll back and down, big and slow. Half the reps forward, half back." },
        { name: "Cross-Body Arm Swings", primary: ["chest"], secondary: ["shoulders", "traps"], kind: "dynamic", seconds: 30, perSide: false, equipment: "none", level: "beginner", cue: "Swing the arms wide open, then cross them in front. Stay relaxed, this is not a stretch you force." },
        { name: "Wall Slides", primary: ["traps", "lats"], secondary: ["shoulders"], kind: "dynamic", seconds: 35, perSide: false, equipment: "wall", level: "beginner", cue: "Back of the hands stay on the wall as you slide up. If they lift off, that is your honest range." },
        { name: "Elbow Circles", primary: ["biceps", "triceps"], secondary: ["forearms"], kind: "dynamic", seconds: 25, perSide: false, equipment: "none", level: "beginner", cue: "Upper arms stay still, circle from the elbow. Both directions." },
        { name: "Wrist Circles", primary: ["forearms"], secondary: [], kind: "dynamic", seconds: 25, perSide: false, equipment: "none", level: "beginner", cue: "Interlace the fingers and circle slowly. Worth two rounds before any pressing or hanging." },
        { name: "Torso Twists", primary: ["obliques"], secondary: ["lowerback", "abs"], kind: "dynamic", seconds: 30, perSide: false, equipment: "none", level: "beginner", cue: "Hips face forward, turn through the ribs. Let the arms be loose and follow." },
        { name: "Prone Press-Up", primary: ["abs"], secondary: ["lowerback", "chest"], kind: "dynamic", seconds: 30, perSide: false, equipment: "none", level: "beginner", cue: "Press the chest up and leave the hips on the floor. Go only as high as stays comfortable." },
        { name: "Pelvic Tilts", primary: ["lowerback"], secondary: ["abs", "glutes"], kind: "dynamic", seconds: 30, perSide: false, equipment: "none", level: "beginner", cue: "Rock the pelvis to flatten the low back, then release. Small movement, no effort in the legs." },
        { name: "Hip Circles", primary: ["glutes"], secondary: ["quads", "lowerback"], kind: "dynamic", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Lift one knee and draw a circle with it. Stand tall instead of leaning away from the leg." },
        { name: "Leg Swings", primary: ["hamstrings"], secondary: ["glutes", "quads"], kind: "dynamic", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Swing from the hip, not the back. Let the range grow with each swing." },
        { name: "Lateral Leg Swings", primary: ["quads"], secondary: ["glutes"], kind: "dynamic", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Swing the leg across the body and back out. Keep the standing knee soft and the chest square." },
        { name: "Toy Soldier Kicks", primary: ["hamstrings"], secondary: ["glutes", "abs"], kind: "dynamic", seconds: 35, perSide: false, equipment: "none", level: "beginner", cue: "Walk forward kicking a straight leg up to meet the opposite hand. Chest tall, no rounding to reach it." },
        { name: "Ankle Circles", primary: ["calves"], secondary: [], kind: "dynamic", seconds: 25, perSide: true, equipment: "none", level: "beginner", cue: "Lift the foot and circle the ankle both ways. Move the foot, not the whole leg." },
        { name: "World's Greatest Stretch", primary: ["quads", "glutes"], secondary: ["hamstrings", "obliques", "traps"], kind: "dynamic", seconds: 40, perSide: true, equipment: "none", level: "intermediate", cue: "Deep lunge, drop the back elbow toward the floor, then open the chest to the ceiling. One rep should take a slow breath.", avoidIf: ["knee", "hip"] },
        { name: "Walking Lunge with Twist", primary: ["quads", "glutes"], secondary: ["obliques", "hamstrings"], kind: "dynamic", seconds: 40, perSide: false, equipment: "none", level: "intermediate", cue: "Step into the lunge, then turn the chest over the front leg. Front knee tracks over the foot, never inward.", avoidIf: ["knee"] },
      ],
    },
    {
      key: "static",
      label: "Static, after training",
      exercises: [
        { name: "Doorway Pec Stretch", primary: ["chest"], secondary: ["shoulders", "biceps"], kind: "static", seconds: 35, perSide: true, equipment: "doorway", level: "beginner", cue: "Forearm on the frame at shoulder height, then step through. Stop at a stretch, never at a pinch.", avoidIf: ["shoulder"] },
        { name: "Cross-Body Shoulder Stretch", primary: ["shoulders"], secondary: ["traps"], kind: "static", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Pull the arm across the chest with the other forearm. Keep the shoulder down, not shrugged to the ear.", avoidIf: ["shoulder"] },
        { name: "Overhead Triceps Stretch", primary: ["triceps"], secondary: ["lats", "shoulders"], kind: "static", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Hand behind the neck, gently press the elbow back. Ribs stay down instead of flaring out.", avoidIf: ["shoulder"] },
        { name: "Upper Trap Stretch", primary: ["traps"], secondary: [], kind: "static", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Ear toward the shoulder, let the opposite hand hang heavy. No pulling hard on the head.", avoidIf: ["neck"] },
        { name: "Thread the Needle Stretch", primary: ["traps"], secondary: ["lats", "shoulders"], kind: "static", seconds: 35, perSide: true, equipment: "none", level: "beginner", cue: "On all fours, slide one arm under the other and rest on the shoulder. Let the upper back rotate, keep the hips square.", avoidIf: ["shoulder", "neck"] },
        { name: "Kneeling Lat Stretch", primary: ["lats"], secondary: ["traps", "lowerback"], kind: "static", seconds: 35, perSide: false, equipment: "bench", level: "beginner", cue: "Elbows on the bench, sink the chest toward the floor. Breathe into the ribs and let it settle." },
        { name: "Biceps Wall Stretch", primary: ["biceps"], secondary: ["chest", "shoulders"], kind: "static", seconds: 30, perSide: true, equipment: "wall", level: "beginner", cue: "Palm flat on the wall behind you, then turn the body away. Go slowly, the biceps tendon does not like a sudden pull.", avoidIf: ["shoulder", "elbow"] },
        { name: "Wrist Flexor Stretch", primary: ["forearms"], secondary: [], kind: "static", seconds: 25, perSide: true, equipment: "none", level: "beginner", cue: "Arm straight, fingers up, pull the hand back gently. Elbow stays locked out.", avoidIf: ["wrist"] },
        { name: "Wrist Extensor Stretch", primary: ["forearms"], secondary: [], kind: "static", seconds: 25, perSide: true, equipment: "none", level: "beginner", cue: "Arm straight, fingers down, press the back of the hand toward you. Light pressure is enough.", avoidIf: ["wrist"] },
        { name: "Sphinx Stretch", primary: ["abs"], secondary: ["lowerback", "chest"], kind: "static", seconds: 35, perSide: false, equipment: "none", level: "beginner", cue: "Forearms down, elbows under the shoulders, hips heavy on the floor. Relax the glutes and let the front of the body lengthen.", avoidIf: ["lowerback"] },
        { name: "Seated Spinal Twist", primary: ["obliques"], secondary: ["lowerback", "glutes"], kind: "static", seconds: 35, perSide: true, equipment: "none", level: "beginner", cue: "Sit tall first, then turn. Grow taller on the inhale and twist a little more on the exhale.", avoidIf: ["lowerback"] },
        { name: "Standing Side Bend Stretch", primary: ["obliques"], secondary: ["lats"], kind: "static", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Reach one arm overhead and lean sideways, not forward. Keep both feet planted evenly." },
        { name: "Knees-to-Chest Stretch", primary: ["lowerback"], secondary: ["glutes"], kind: "static", seconds: 35, perSide: false, equipment: "none", level: "beginner", cue: "Hug both knees in and let the low back round into the floor. Rock side to side if it feels good." },
        { name: "Figure Four Stretch", primary: ["glutes"], secondary: ["lowerback"], kind: "static", seconds: 40, perSide: true, equipment: "none", level: "beginner", cue: "Ankle across the opposite knee, then pull the back thigh toward you. Keep the head and shoulders relaxed on the floor.", avoidIf: ["hip"] },
        { name: "Kneeling Hip Flexor Stretch", primary: ["quads"], secondary: ["glutes"], kind: "static", seconds: 40, perSide: true, equipment: "none", level: "beginner", cue: "Tuck the pelvis under before you shift forward. That tuck is the stretch, not the distance you travel.", avoidIf: ["knee"] },
        { name: "Couch Stretch", primary: ["quads"], secondary: ["glutes"], kind: "static", seconds: 45, perSide: true, equipment: "wall", level: "intermediate", cue: "Back foot up the wall, front foot planted, squeeze the back glute. Back off if the knee complains at all.", avoidIf: ["knee", "hip"] },
        { name: "Frog Stretch", primary: ["quads"], secondary: ["glutes"], kind: "static", seconds: 45, perSide: false, equipment: "none", level: "intermediate", cue: "Knees wide, shins in line with the thighs, rock back slowly. This one is for the groin, so go gently.", avoidIf: ["knee", "hip"] },
        { name: "Standing Hamstring Stretch", primary: ["hamstrings"], secondary: ["calves"], kind: "static", seconds: 30, perSide: true, equipment: "none", level: "beginner", cue: "Heel out in front, toes up, hinge at the hip with a flat back. Rounding the spine cheats the stretch." },
        { name: "Supine Hamstring Stretch", primary: ["hamstrings"], secondary: ["calves"], kind: "static", seconds: 40, perSide: true, equipment: "band", level: "beginner", cue: "Strap around the foot, keep the other leg down, draw the leg up until you feel it. Knee can stay a little soft." },
        { name: "Standing Calf Stretch", primary: ["calves"], secondary: [], kind: "static", seconds: 35, perSide: true, equipment: "wall", level: "beginner", cue: "Back leg straight, heel pinned down, hips forward. If the heel lifts, shorten the stance." },
        { name: "Bent-Knee Calf Stretch", primary: ["calves"], secondary: [], kind: "static", seconds: 30, perSide: true, equipment: "wall", level: "beginner", cue: "Same position but bend the back knee. This one reaches the soleus, lower down and closer to the ankle." },
      ],
    },
    {
      key: "mobility",
      label: "Mobility, daily",
      exercises: [
        { name: "90/90 Hip Switch", primary: ["glutes", "quads"], secondary: ["lowerback"], kind: "mobility", seconds: 60, perSide: false, equipment: "none", level: "intermediate", cue: "Sit with both knees at right angles and rotate slowly to the other side. Chest tall, let the knees lead.", avoidIf: ["hip", "knee"] },
        { name: "Half-Kneeling Hip Flexor Rock", primary: ["quads"], secondary: ["glutes", "abs"], kind: "mobility", seconds: 45, perSide: true, equipment: "none", level: "beginner", cue: "Tuck the pelvis, then rock forward an inch and back. The desk job lives in this muscle, so give it the full minute.", avoidIf: ["knee"] },
        { name: "Deep Squat Hold", primary: ["quads", "glutes"], secondary: ["calves", "lowerback"], kind: "mobility", seconds: 45, perSide: false, equipment: "none", level: "intermediate", cue: "Sit as low as you can with both heels down and elbows inside the knees. Hold a doorframe if you need to at first.", avoidIf: ["knee", "ankle"] },
        { name: "Cossack Squat", primary: ["quads", "glutes"], secondary: ["hamstrings", "calves"], kind: "mobility", seconds: 45, perSide: true, equipment: "none", level: "intermediate", cue: "Shift the weight over one bent leg, other leg straight with the toes up. Go only as deep as you can come back up from.", avoidIf: ["knee", "hip"] },
        { name: "Standing Hip Airplane", primary: ["glutes"], secondary: ["hamstrings", "abs"], kind: "mobility", seconds: 30, perSide: true, equipment: "none", level: "advanced", cue: "Balance on one leg, hinge forward, then rotate the hips open and closed. Hold something for balance until it is smooth.", avoidIf: ["hip", "knee"] },
        { name: "Open Book Thoracic Rotation", primary: ["traps", "lats"], secondary: ["chest", "obliques"], kind: "mobility", seconds: 40, perSide: true, equipment: "none", level: "beginner", cue: "On your side, knees stacked, open the top arm across and follow it with your eyes. Let the knees stay put." },
        { name: "Quadruped Thoracic Rotation", primary: ["traps"], secondary: ["lats", "obliques"], kind: "mobility", seconds: 35, perSide: true, equipment: "none", level: "beginner", cue: "Hand behind the head, rotate the elbow to the ceiling, then back under. The turn comes from the ribs, not the low back." },
        { name: "Foam Roller Thoracic Extension", primary: ["traps", "lats"], secondary: ["chest"], kind: "mobility", seconds: 45, perSide: false, equipment: "foam roller", level: "beginner", cue: "Roller across the upper back, support the head, extend over it a few inches at a time. Keep the ribs from flaring.", avoidIf: ["lowerback"] },
        { name: "Foam Roller Chest Opener", primary: ["chest"], secondary: ["shoulders", "traps"], kind: "mobility", seconds: 60, perSide: false, equipment: "foam roller", level: "beginner", cue: "Lie along the roller head to tailbone and let the arms fall open. Do nothing for a minute and let gravity work.", avoidIf: ["shoulder"] },
        { name: "Chin Tucks", primary: ["traps"], secondary: [], kind: "mobility", seconds: 30, perSide: false, equipment: "none", level: "beginner", cue: "Slide the chin straight back to make a double chin, hold, release. This is the one that undoes a day at a screen.", avoidIf: ["neck"] },
        { name: "Prone Scorpion Stretch", primary: ["lowerback"], secondary: ["chest", "quads", "obliques"], kind: "mobility", seconds: 30, perSide: true, equipment: "none", level: "intermediate", cue: "Face down, arms wide, reach one foot across toward the opposite hand. Move slowly and keep the chest down.", avoidIf: ["lowerback"] },
        { name: "Standing Forward Hang", primary: ["lowerback"], secondary: ["hamstrings"], kind: "mobility", seconds: 45, perSide: false, equipment: "none", level: "beginner", cue: "Knees soft, fold forward and hang from the hips. Nod the head yes and no to let the neck go too.", avoidIf: ["lowerback"] },
      ],
    },
  ],
};
