// Unio: what the figure says during a session.
//
// The single source for every line, imported by index.html at runtime and by
// quip-lab.html, the review page that lists every one of them. Moved out of
// index.html so the two could never quote different banks; before this, a
// review page would have had to copy the lines in by hand and go stale the
// first time one was reworded.
//
// THE VOICE. Deadpan first: he states absurd things flatly and never winks.
// He is a drawing and he knows it, which is the well most of the jokes come
// out of. He is fond of you in a slightly clingy way, he takes the workout
// more seriously than is reasonable, and he is easily impressed. He never
// does a bit for two lines, there is no setup and punchline, every line lands
// on its own in about a second and a half.
//
// WHAT HE NEVER JOKES ABOUT. Not your body, not the scale, not how much you
// lift, not how little, not a set you missed, not a day you skipped, not your
// partner versus you. He knows your goal and your streak and he can be warm
// and specific about them, which is different from being clever at your
// expense. Punch at himself, at the equipment, at the concept of exercise.
// When in doubt he is the idiot in the scene, never you.
//
// HE DOES COACH NOW. This used to say he never gives form advice. Mo asked for
// the opposite in September 2026: he wants the figure to talk about the lift
// you are actually on, and to say keep your back straight or fix your grip,
// funny but useful. So the cues live in the FORM table below, one per lift,
// written as real coaching cues and kept separate from the joke. The old rule
// was right about one thing and that part survives: the cue has to be correct,
// because a joke that is also wrong instruction is worse than no joke. He
// still gives no medical advice, and he still never diagnoses a pain.
//
// HE PUSHES STRETCHING AND CARDIO. Also Mo's call. Rests and idle beats are
// where he makes the case for stretching, warm-ups and cool-downs are talked
// up rather than treated as filler, and cardio and the classes have their own
// bank and their own cues.
//
// HOW OFTEN. He speaks at nearly every beat: most sets, every last set, every
// new lift, every long rest, an aside partway through a rest, a line on a
// clock while the session screen is up regardless, plus the warm-up and
// cool-down holds. What keeps that from turning into wallpaper is not
// silence, it is variety: a bank this size, contextual lines that only exist
// when they are true, and no repeat until a bank is used up. The odds and
// the floor between lines live in index.html next to sayQuip, since they are
// about pacing a live session rather than about what he has to say.
//
// A line is either a plain string, or a function of a context object that
// returns a string when it applies and null when it does not. The null ones
// are how he gets to be specific about your goal, your streak or your
// partner without inventing facts on a fresh account. The context shape is
// built by quipCtx() in index.html; quip-lab.html builds synthetic versions
// of the same shape to show every branch a function can take.

/* ---------------------------------------------------------------- form ----

   WHAT CHANGED, AND WHY THE OLD RULE IS GONE. This file used to say he never
   gives form advice, on the grounds that a joke which is also wrong
   instruction is worse than no joke. Mo asked for the opposite: he wants the
   figure to talk about the lift you are actually on, and to tell you to keep
   your back straight or fix your grip, funny but useful.

   The reasoning behind the old rule still stands, so it moves rather than
   disappears: every cue below is a real coaching cue for that exact lift,
   written plainly, and the joke sits beside it instead of inside it. The cue
   is the part that has to be right. If a lift has no entry it falls back by
   movement pattern, and if that misses too it says nothing rather than
   guessing, because a vague cue attached to a specific lift is how you end up
   telling somebody to brace their belly during a calf raise.

   `cue` is the instruction. `joke` is his line about the lift itself. They are
   used separately: a moment can take one, the other, or both. */
export const FORM = {
  "barbell bench press": { cue: "Feet flat, shoulder blades pinched back, bar to the middle of your chest.", joke: "Lie down, push the bar, sit up a hero." },
  "dumbbell bench press": { cue: "Elbows about forty five degrees from your body, not flared straight out.", joke: "Two weights. Twice the chances to look thoughtful." },
  "incline dumbbell press": { cue: "Bench at thirty degrees. Any steeper and it turns into a shoulder day.", joke: "Slightly uphill. Like life." },
  "incline barbell press": { cue: "Bench at thirty degrees, bar to your collarbone, not your throat.", joke: "Uphill pressing. Very brave." },
  "decline dumbbell press": { cue: "Hook your legs in first. Falling off is not part of it.", joke: "Upside down pressing. I am already dizzy." },
  "decline barbell press": { cue: "Get a spotter for the bar. Always.", joke: "Head down. Blood everywhere it should not be." },
  "close-grip bench press": { cue: "Hands shoulder width, elbows tucked to your sides. This is a triceps lift.", joke: "Same bench, tighter hands, sadder triceps." },
  "push-up": { cue: "Straight line from your head to your heels. No sagging hips.", joke: "The original. No equipment, no excuses, no mercy." },
  "diamond push-up": { cue: "Hands together under your chest, elbows brush your ribs.", joke: "A push-up that went to a private school." },
  "machine chest press": { cue: "Handles at chest height before you start, or your shoulders take it.", joke: "A machine did the thinking. Enjoy." },
  "pec deck": { cue: "Soft bend in the elbows, squeeze at the middle, do not slam it back.", joke: "A hug with a grudge." },
  "cable fly": { cue: "Keep a soft bend in the elbows the whole way. Hug, do not press.", joke: "Hugging the air. It never hugs back." },
  "dip": { cue: "Lean forward a little for chest, stay upright for triceps. Do not drop fast.", joke: "Lowering yourself, on purpose, for once." },
  "weighted dip": { cue: "Add weight only when ten clean bodyweight ones are easy.", joke: "A dip, but you brought luggage." },
  "pull-up": { cue: "Chest up, pull your elbows down to your ribs. No swinging.", joke: "You against gravity. Gravity is undefeated but rude about it." },
  "chin-up": { cue: "Palms toward you. This one is biceps as much as back.", joke: "A pull-up that likes you." },
  "lat pulldown": { cue: "Chest up, bar to your collarbone, no leaning back to cheat it.", joke: "A pull-up for people with chairs." },
  "seated cable row": { cue: "Chest tall, pull to your belly button, squeeze the shoulder blades.", joke: "Rowing. No boat. No water. No point. Excellent." },
  "barbell row": { cue: "Flat back, hinge to about forty five degrees, pull to your belly button.", joke: "Bent over, pulling. Like picking up laundry with ambition." },
  "dumbbell row": { cue: "Flat back, pull the weight to your hip, not your shoulder.", joke: "One arm at a time. Very focused of you." },
  "inverted row": { cue: "Body straight, chest to the bar, squeeze at the top.", joke: "A push-up in reverse. Physics is fine with it." },
  "t-bar row": { cue: "Chest against the pad if there is one. Let it hold you honest.", joke: "The bar has one job and it is heavy." },
  "face pull": { cue: "Pull to your forehead, elbows high, spread your hands at the end.", joke: "For the shoulders you cannot see. They exist." },
  "straight-arm pulldown": { cue: "Arms stay long, move only at the shoulder.", joke: "Long arms. Longer face." },
  "dead hang": { cue: "Just hang. Shoulders relaxed, breathe.", joke: "Doing nothing, strenuously." },
  "overhead press": { cue: "Squeeze your glutes, ribs down, press straight up past your forehead.", joke: "Pushing the sky. The sky is fine." },
  "military press": { cue: "Feet together, strict, no leg drive. That is what makes it military.", joke: "Strictest press there is. No help allowed." },
  "push press": { cue: "A small dip from the legs, then drive. The legs start it, the arms finish it.", joke: "A press that cheats, officially." },
  "seated dumbbell press": { cue: "Back against the pad, press straight up, do not arch away from it.", joke: "Sitting down to lift over your head. Efficient." },
  "arnold press": { cue: "Start palms toward you, rotate as you press.", joke: "Named after a man. The man is not here." },
  "lateral raise": { cue: "Lead with your elbows, stop at shoulder height, no shrugging.", joke: "Small weights. Enormous suffering." },
  "front raise": { cue: "Thumbs up, stop at eye level, no swinging from the hips.", joke: "Pointing at nothing, with weight." },
  "upright row": { cue: "Grip from the top, lift straight up the front of your body, elbows out and above your hands.", joke: "Straight up. Elbows lead, hands follow." },
  "rear delt fly": { cue: "Soft elbows, squeeze the back of the shoulders, not the traps.", joke: "For the back of the shoulder. Nobody sees it. You will know." },
  "shrug": { cue: "Straight up, no rolling, hold at the top for a second.", joke: "Shrugging. On purpose. With weight." },
  "cuban press": { cue: "Row, rotate, press. Three moves, light weight, no rushing.", joke: "Three exercises in a trench coat." },
  "curl": { cue: "Elbows pinned to your sides, no swinging, lower it slower than you lift it.", joke: "The most honest exercise. It is for looks and we both know it." },
  "hammer curl": { cue: "Palms facing each other the whole way. Thumbs up.", joke: "Curling like you are holding two hammers. Do not hammer anything." },
  "preacher curl": { cue: "Armpits on the pad, do not lock out hard at the bottom.", joke: "A curl you cannot cheat. Rude." },
  "concentration curl": { cue: "Elbow braced on your thigh, move only the forearm.", joke: "Named for concentration. Please supply some." },
  "triceps pushdown": { cue: "Elbows stay pinned at your sides. Only the forearm moves.", joke: "Pushing down. The rope is judging your elbows." },
  "overhead triceps extension": { cue: "Elbows point forward and stay there. Lower behind your head slowly.", joke: "Behind the head. Trust the elbows." },
  "skull crusher": { cue: "Lower to your forehead, not your nose. The name is a warning.", joke: "The name is doing a lot of work. Go slow." },
  "bench dip": { cue: "Keep your back close to the bench, elbows straight back not flared.", joke: "A dip with furniture involved." },
  "wrist curl": { cue: "Forearms flat, move only the wrist, light weight.", joke: "The smallest exercise. Still counts." },
  "farmer's carry": { cue: "Stand tall, shoulders back, walk. Do not lean.", joke: "Carrying heavy things somewhere. The dream." },
  "squat": { cue: "Brace your belly, knees track over your toes, push the floor away.", joke: "Down, then up. Your legs will send a letter tomorrow." },
  "barbell back squat": { cue: "Bar on your traps, brace, sit between your hips, knees out.", joke: "The big one. Everything hurts and it works." },
  "front squat": { cue: "Elbows high the whole way. Drop them and the bar goes with them.", joke: "Bar at the front. Elbows up or it leaves." },
  "goblet squat": { cue: "Hold it at your chest, elbows inside your knees at the bottom.", joke: "Holding it like a goblet. Very medieval." },
  "bulgarian split squat": { cue: "Back foot on the bench, weight through the front heel, chest tall.", joke: "One leg. Named after a country that did nothing wrong." },
  "leg press": { cue: "Feet shoulder width, do not lock the knees hard at the top.", joke: "Sitting down, pushing a building. Reasonable." },
  "leg extension": { cue: "Squeeze at the top for a second, lower it under control.", joke: "Kicking, seated, with resistance." },
  "leg curl": { cue: "Hips stay down on the pad. Curl your heels to your backside.", joke: "Curling with your legs. It is allowed." },
  "lunge": { cue: "Front knee over the ankle, back knee toward the floor, chest tall.", joke: "Walking, but expensive." },
  "step-up": { cue: "Push through the heel of the top foot. Do not bounce off the back leg.", joke: "Stairs, with opinions." },
  "deadlift": { cue: "Flat back, bar close to your legs, push the floor away and stand up.", joke: "Pick it up. Put it down. Timeless." },
  "romanian deadlift": { cue: "Push your hips back, soft knees, feel the hamstrings. Stop when your back would round.", joke: "Hips back, not knees down. That is the whole trick." },
  "stiff-leg deadlift": { cue: "Hips back first, back stays flat, bar stays close.", joke: "Straighter legs, louder hamstrings." },
  "good morning": { cue: "Light weight. Hips back, back flat. This one punishes rounding.", joke: "Named politely. Behaves otherwise." },
  "hip thrust": { cue: "Chin tucked, ribs down, squeeze at the top. Do not arch your back.", joke: "The strangest looking lift in the building. Also the best." },
  "bridge": { cue: "Ribs down, squeeze the glutes, roll down one vertebra at a time.", joke: "A bridge. Built from a person." },
  "running": { cue: "Land under your hips, not out in front. Short quick steps beat long reaching ones.", joke: "Running. From nothing. Toward nothing. Magnificent." },
  "walking": { cue: "Stand tall, let the arms swing. It counts. It genuinely counts.", joke: "Walking. The most underrated thing a person can do." },
  "hiking": { cue: "Short steps uphill, small steps downhill, let your legs take the brake.", joke: "A walk that got ambitious." },
  "cycling": { cue: "Saddle high enough that your knee is almost straight at the bottom. Spin, do not grind.", joke: "Sitting down, going fast. The best deal in exercise." },
  "spin class": { cue: "Do not lock your elbows. Keep the core doing some of the work.", joke: "A room of people cycling nowhere, loudly. I love it." },
  "swimming": { cue: "Breathe out underwater. Rotate from the hips, not the neck.", joke: "Exercise, but wet." },
  "rowing machine": { cue: "Legs, then back, then arms. Reverse it on the way in. That order matters.", joke: "Legs first. Always legs first. Everyone gets this wrong." },
  "elliptical": { cue: "Stand tall, let go of the handles now and then.", joke: "The gentlest machine. No notes." },
  "stair climber": { cue: "Stand up straight. Leaning on the rails is how you cheat yourself.", joke: "Stairs that never end. Someone designed this on purpose." },
  "boxing": { cue: "Hands up, turn the hips into the punch, breathe out on contact.", joke: "Fighting nobody. Winning anyway." },
  "kickboxing": { cue: "Pivot the standing foot on every kick. Hands stay up.", joke: "Fighting nobody, with your legs too." },
  "hiit": { cue: "Full effort on, actual rest off. The rest is the part that makes it work.", joke: "Short. Horrible. Effective. Three of my favourite words." },
  "crossfit": { cue: "Form first, speed second. Always. A fast bad rep is just a bad rep.", joke: "Everything at once, quickly. Bold." },
  "barre": { cue: "Small movements, high reps. It will burn long before it looks hard.", joke: "Tiny movements. Enormous burning." },
  "yoga": { cue: "Breathe. If you are holding your breath, come out a little.", joke: "Breathing, with shapes." },
  "pilates": { cue: "Ribs down, navel toward your spine, move from the middle.", joke: "Everything comes from the middle. That is the whole idea." },
  "glute bridge": { cue: "Squeeze at the top, hold for a second, ribs down.", joke: "Lying down and squeezing. My favourite genre." },
  "calf raise": { cue: "All the way up, all the way down, slow at the bottom.", joke: "Calves. Famously stubborn. Keep going." },
  "nordic curl": { cue: "Lower as slowly as you can. Catch yourself with your hands.", joke: "Falling forward, slowly, on purpose." },
  "plank": { cue: "Ribs down, glutes squeezed, straight line from head to heels.", joke: "Holding still. Hardest thing there is." },
  "side plank": { cue: "Stack the shoulders and hips, lift the bottom hip up.", joke: "Sideways holding still. Worse, somehow." },
  "crunch": { cue: "Ribs toward your hips. Do not pull on your neck.", joke: "A small sit-up with commitment issues." },
  "sit-up": { cue: "Chin off your chest, roll up one vertebra at a time.", joke: "The full one. Respect." },
  "hanging leg raise": { cue: "No swinging. Curl your pelvis up, not just the legs.", joke: "Hanging, and lifting. Two problems at once." },
  "ab wheel rollout": { cue: "Ribs down, do not let your back arch. Go only as far as you can hold that.", joke: "A wheel. One wheel. Enormous consequences." },
  "russian twist": { cue: "Rotate from the ribs, not the arms. Keep your chest tall.", joke: "Twisting. The obliques are listening." },
  "cable crunch": { cue: "Round your spine down toward your knees. Hips stay still.", joke: "Kneeling and folding. Very dramatic." },
  "pallof press": { cue: "Do not let the cable twist you. That is the whole exercise.", joke: "Resisting a rope. Quietly heroic." },
  "bird dog": { cue: "Opposite arm and leg. Hips stay level. Slow.", joke: "Named after two animals. Behaves like neither." },
  "back extension": { cue: "Stop when your body is in a straight line. Do not arch past it.", joke: "Bending backward, responsibly." },
  "dead bug": { cue: "Lower back stays flat on the floor the whole time.", joke: "The name is upsetting. The exercise is fine." },
  "reverse pec deck": { cue: "Soft elbows, squeeze the back of the shoulders, not the traps.", joke: "A pec deck with regrets." },
  "snatch-grip high pull": { cue: "Wide grip, drive with the hips, elbows finish high.", joke: "Wide hands. Loud hips." },
  "triceps kickback": { cue: "Upper arm parallel to the floor and still. Only the forearm moves.", joke: "Kicking backward, with a weight. Nobody is behind you." },
  "plate pinch": { cue: "Pinch with the fingers, stand tall, breathe.", joke: "Holding a plate until your hands complain." },
  "cable pull-through": { cue: "Hips back, then squeeze the glutes to stand. The arms are just rope.", joke: "Your arms are rope here. Let the hips work." },
  "cable kickback": { cue: "Hips square, squeeze the glute, no arching the lower back.", joke: "Kicking a rope. The rope started it." },
  "frog pump": { cue: "Heels together, knees out, squeeze at the top.", joke: "Named after a frog. Sorry." },
  "v-up": { cue: "Reach for your toes, lift both ends at once, lower slowly.", joke: "Folding in half. Briefly." },
  "toes-to-bar": { cue: "No swinging. Curl your pelvis up as the feet rise.", joke: "Feet to the bar. The bar stays." },
  "side bend": { cue: "Slide straight down the side, no leaning forward or back.", joke: "Leaning sideways, professionally." },
  "woodchopper": { cue: "Rotate from the ribs, pivot the back foot, keep your arms long.", joke: "Chopping wood. There is no wood." },
  "hanging windshield wiper": { cue: "Shoulders stay tight. Control the swing, never let it throw you.", joke: "You are a wiper now. It is raining nowhere." },
  "superman": { cue: "Lift chest and thighs, look at the floor, do not crank your neck.", joke: "Flying, face down, on a mat." },
  "revolved triangle": { cue: "Hips level, rotate from the ribs, take a block if the floor is far.", joke: "A triangle, but it turned." },
  "upward-facing dog": { cue: "Thighs off the floor, shoulders down and back, do not crunch your lower back.", joke: "A dog, facing up. Naturally." },
  "downward-facing dog": { cue: "Hips high, heels reaching down, spread your fingers wide.", joke: "The famous one. Everyone knows this dog." },
  "forward fold": { cue: "Soft knees. Fold from the hips, let your head hang.", joke: "Folding forward. Very peaceful. Very hamstrings." },
  "extended side angle": { cue: "Front knee over the ankle, reach through the top arm, open the chest.", joke: "Long lines. Deep breath." },
  "the hundred": { cue: "Ribs down, low back pressed to the mat, small fast pumps, breathe in five out five.", joke: "One hundred. I will not be counting. I will be counting." },
  "roll-up": { cue: "One vertebra at a time, up and down. No throwing yourself forward.", joke: "Rolling. Slowly. That is the whole point." },
  "criss-cross": { cue: "Rotate from the ribs, elbow toward the opposite knee, slow.", joke: "Crossing. Slowly. The abs notice." },
  "teaser": { cue: "Lift and lower with control. Keep the low back on the mat as long as you can.", joke: "Named a teaser. It is not teasing." },
  "jackknife": { cue: "Control the way down. Do not drop onto your neck.", joke: "Folding, then unfolding. Carefully." },
  "clamshell": { cue: "Hips stacked, open the top knee, keep the pelvis still.", joke: "A shell. Opening. Glutes involved." },
  "side-lying leg lift": { cue: "Body in one long line, lift from the hip not the waist.", joke: "Lying sideways, lifting a leg. Peak pilates." },
  "side kick series": { cue: "Hips stacked and still. The leg moves, nothing else does.", joke: "A series. Of kicks. Sideways." },
  "swan": { cue: "Lift from the upper back, keep the back of the neck long.", joke: "A swan. Elegant. Uncomfortable." },
  "saw": { cue: "Sit tall, rotate first, then reach past the opposite foot.", joke: "Sawing. There is nothing to saw." },
  "swimming": { cue: "Small quick flutters, opposite arm and leg, keep the ribs down.", joke: "Swimming on dry land. No progress made." },
  "shoulder bridge": { cue: "Ribs down, squeeze the glutes, roll down one vertebra at a time.", joke: "A bridge, built from you." },
  "roll-over": { cue: "Only go as far as your neck is comfortable. Slow both ways.", joke: "Rolling over. Legs first." },
  "corkscrew": { cue: "Keep both shoulders on the mat. Circle the legs slowly.", joke: "A corkscrew. No bottle." },
  "control balance": { cue: "The word control is in the name. Take it seriously.", joke: "It says control right there in the name." },
  "spine stretch forward": { cue: "Sit tall first, then round forward from the top of the spine.", joke: "Reaching forward. Vertebra by vertebra." },
  "wall push-up": { cue: "Hands on the wall, body straight, same shape as a floor push-up.", joke: "A push-up that met a wall and gave up. Wisely." },
  "incline push-up": { cue: "Hands on something raised. The higher it is, the easier it gets.", joke: "A push-up on a slope. Still counts." },
  "pseudo planche push-up": { cue: "Hands by your waist, lean forward. Shoulders do the work.", joke: "Leaning forward on purpose. Shoulders furious." },
  "one-arm push-up": { cue: "Feet wide for balance, hips square, go slow.", joke: "One arm. The other is just watching." },
  "muscle-up": { cue: "Pull high and fast, then turn the wrists over the bar.", joke: "Pull-up and dip, glued together, at speed." },
  "planche lean": { cue: "Lean forward on straight arms, hollow the body.", joke: "Leaning. Just leaning. It is enough." },
  "handstand push-up": { cue: "Only when the hold is easy. Kick up to a wall first.", joke: "Upside down. And pressing. Show off." },
  "human flag": { cue: "Top arm pulls, bottom arm pushes. Everything is squeezed.", joke: "A flag. Made of a person." },
  "shoulder rolls": { cue: "Big slow circles. Forward first, then back.", joke: "Rolling the shoulders. Free. Do it more." },
  "wall slides": { cue: "Keep your wrists and elbows on the wall the whole slide.", joke: "Sliding up a wall. The wall does not mind." },
  "pelvic tilts": { cue: "Small movement. Flatten your back to the floor, then release.", joke: "Tiny movements. Big effect." },
  "toy soldier kicks": { cue: "Straight leg, reach for the opposite hand, stay tall.", joke: "Marching. Stiffly. Like a toy." },
  "wall hip hinge drill": { cue: "Brush the wall with your backside. Back stays flat.", joke: "Practising a hinge. Against a wall." },
  "knee-to-wall ankle rock": { cue: "Heel stays down. Drive the knee toward the wall.", joke: "Ankles. Nobody stretches them. Be different." },
  "band pull-apart": { cue: "Straight arms, pull the band to your chest, squeeze the shoulder blades.", joke: "A band. Pulled apart. Shoulders grateful." },
  "scapular push-up": { cue: "Arms stay straight. Only the shoulder blades move.", joke: "A push-up where nothing bends. Trust me." },
  "band shoulder external rotation": { cue: "Elbow pinned to your side, rotate the forearm out.", joke: "Small, boring, and it saves shoulders." },
  "quadruped wrist rocks": { cue: "Rock gently. Back off the moment it pinches.", joke: "Wrists. They carry you. Be kind." },
  "chin tucks": { cue: "Slide the chin straight back, not down. Small movement.", joke: "Making a double chin, therapeutically." },

  /* Added 2026-09-21: every exercise in the library gets its own line now,
     not a shared pattern fallback. Grouped by the category the move library
     files them under, for anyone diffing this against a future addition to
     one of those files. */
  // Weight training -- Chest
  "low-to-high cable fly": { cue: "Pulleys set low, hands finish up near eye level, soft bend in the elbows the whole way.", joke: ["An upper-chest fly with a commute built in.", "The angle changed. My enthusiasm did not."] },
  "landmine press": { cue: "Press the bar up and slightly forward along its natural arc, brace so your ribs do not flare.", joke: ["A barbell wedged in a corner, pressed with real confidence.", "One end of the bar is on the floor. That end is having a great day."] },

  // Weight training -- Back (Lats)
  "close-grip pulldown": { cue: "Narrow grip, pull the bar to your upper chest, elbows finish close to your sides.", joke: ["Same pulldown, hands closer together. The biceps noticed immediately.", "A lat pulldown that got claustrophobic on purpose."] },
  "chest-supported row": { cue: "Chest stays pinned to the pad for the whole set. If it lifts off, the weight is too heavy.", joke: ["A row with a chest strap. No cheating permitted.", "The pad does the bracing so your lower back does not have to argue about it."] },
  "pendlay row": { cue: "Bar rests on the floor between every rep. Flat back, explode it up to your ribs, no bounce off the ground.", joke: ["The bar touches down every single rep. No momentum allowed, ever.", "A barbell row that resets to zero on principle."] },
  "weighted pull-up": { cue: "Add weight only once bodyweight pull-ups are smooth and controlled. Same strict form, just heavier.", joke: ["A pull-up, but you brought a friend. The friend is a plate.", "Gravity was already winning. Now it is personal."] },

  // Weight training -- Traps / Upper Back
  "dumbbell shrug": { cue: "Dumbbells at your sides, shrug straight up toward your ears, hold a beat at the top.", joke: ["Two weights, one shrug. Efficient indifference.", "The dumbbells do not care either. It is a whole shared mood."] },
  "barbell shrug": { cue: "Bar stays in front of your thighs. Straight up and down, never roll the shoulders around it.", joke: ["The heaviest shrug in the building. Still, fundamentally, a shrug.", "A barbell, held, then barely moved. My favourite kind of lift."] },
  "behind-the-back shrug": { cue: "Bar held behind you, close to your glutes. Shrug straight up, keep the range short and controlled.", joke: ["A shrug that will not even face you.", "Doing this where you cannot see it happen. Trust exercises, apparently."] },

  // Weight training -- Shoulders
  "cable lateral raise": { cue: "Pulley set low, lead with the elbow, stop at shoulder height, control the return instead of letting the stack yank it back.", joke: ["The cable does not let you rest at the bottom. It never forgets.", "A lateral raise with a leash on it."] },
  "machine shoulder press": { cue: "Set the seat so the handles start level with your shoulders, press straight up, no arching off the pad.", joke: ["A machine decided the path so your shoulders do not have to negotiate.", "Pressing overhead, fully chaperoned."] },
  "dumbbell shoulder press": { cue: "Palms face forward, press the dumbbells up and slightly in until they nearly touch overhead.", joke: ["Two independent weights overhead, trusting you completely.", "Like the barbell version, except each arm can panic on its own."] },

  // Weight training -- Biceps
  "dumbbell curl": { cue: "Palms face forward the entire way up, elbows stay pinned at your sides.", joke: ["The dumbbell version of the most honest exercise there is, now in stereo.", "Left arm, right arm, each one convinced it is doing more work."] },
  "cable curl": { cue: "Stand tall, elbows pinned to your sides, let the cable keep tension on the muscle even at the bottom.", joke: ["A curl that never gets a break at the bottom. The cable insists.", "Gravity usually gives a curl a rest down there. The cable refuses to."] },
  "ez-bar curl": { cue: "Grip the angled part of the bar, elbows at your sides, wrists stay neutral instead of twisted.", joke: ["A barbell that bent itself into something kinder to your wrists.", "Wavy bar, same elbows, same honest story."] },
  "barbell curl": { cue: "Elbows locked at your sides, no leaning back to help it, lower it slower than you lifted it.", joke: ["Two arms, one bar, maximum mirror time.", "The bar is straight. Your form is the part under negotiation."] },
  "incline dumbbell curl": { cue: "Sit back on an incline bench and let your arms hang straight down. No swinging is even physically possible here.", joke: ["The bench pins your arms behind you so cheating is off the table.", "Leaning back to curl. Very reclined. Very honest."] },
  "spider curl": { cue: "Chest pressed into the incline pad, arms hanging straight down, curl without letting the elbows drift back.", joke: ["Face down on a bench, curling into the space beneath it.", "A curl with your chest confiscated. Nowhere for momentum to hide."] },

  // Weight training -- Triceps
  "rope pushdown": { cue: "Elbows pinned at your sides, spread the rope ends apart as you finish at the bottom.", joke: ["The rope splits in two at the bottom. Very dramatic for a triceps exercise.", "A pushdown with a rope attached. The rope has no opinions and performs fine."] },

  // Weight training -- Forearms
  "reverse wrist curl": { cue: "Forearm flat and supported, palm down, lift only from the wrist through a small range.", joke: ["The wrist curl's quieter sibling. Nobody ever asks about it.", "Tiny movement, opposite direction, same total indifference from the room."] },
  "reverse curl": { cue: "Palms face down the whole way, elbows pinned, expect to use noticeably less weight than a normal curl.", joke: ["A curl that flipped its grip and got humbled instantly.", "Same motion, upside-down hands, an entirely different ego."] },

  // Weight training -- Quads
  "walking lunge": { cue: "Step forward into a lunge, then drive through the front heel to bring the back foot through into the next step.", joke: ["A lunge that refuses to stay in one place. Ambitious.", "Walking, if walking cost considerably more effort."] },
  "hack squat": { cue: "Back flat against the pad, feet slightly forward on the platform, knees track over your toes.", joke: ["A squat with a backrest. Somehow still difficult.", "The machine holds your spine so your quads can suffer in peace."] },
  "zercher squat": { cue: "Bar cradled in the crooks of your elbows, chest tall, squat down between your hips.", joke: ["Carrying the bar in your elbow creases. It will remember this for days.", "The bar sits exactly where your arms bend. Your arms were not consulted."] },
  "sissy squat": { cue: "Knees travel forward, lean back from the knees rather than the hips, hold something for balance if you need it.", joke: ["Named sissy. Nothing about it is.", "Leaning backward on purpose while your knees go the other way. Trust the process."] },

  // Weight training -- Hamstrings
  "glute-ham raise": { cue: "Hips anchored on the pad, lower your torso forward under control, pull yourself back up with the hamstrings.", joke: ["A machine built entirely to humble hamstrings.", "Falling forward, slowly, and then very deliberately not."] },
  "single-leg romanian deadlift": { cue: "Hinge at the hips with a flat back, let the free leg rise straight back as you lower, stop where your balance stops you.", joke: ["Balancing on one leg while also bending over. Nothing could go wrong.", "The two-legged version's braver, wobblier cousin."] },

  // Weight training -- Glutes
  "curtsy lunge": { cue: "Step one leg behind and across the other, bend both knees, keep your chest tall.", joke: ["A lunge that also curtsies. Very polite for something this hard.", "Crossing your legs on purpose, under load."] },
  "sumo deadlift": { cue: "Wide stance, hands inside your knees, chest tall, push your knees out as you pull the bar up.", joke: ["A deadlift with a wider stance and a much stronger opinion about hips.", "Same bar, same floor, dramatically different legs."] },

  // Weight training -- Calves
  "dumbbell calf raise": { cue: "Dumbbells at your sides, rise onto your toes, pause, then lower past level for a real stretch.", joke: ["Calves, now with dumbbells for company.", "Holding extra weight just to make the smallest muscle work harder."] },
  "seated calf raise": { cue: "Knees bent under the pad, push through the balls of your feet, full range up and down.", joke: ["Sitting down to work the one muscle that carries you standing up.", "The seated version. The calves still find something to complain about."] },
  "standing calf raise": { cue: "Legs straight, rise all the way up onto your toes, lower until you feel a genuine stretch at the bottom.", joke: ["Standing there, rising slightly. The most honest description of a whole set.", "Calves are famously stubborn. This is the classic argument with them."] },
  "leg press calf raise": { cue: "Feet low on the platform, toes only, push through the balls of your feet without locking the knees.", joke: ["Borrowing the leg press machine for a much smaller job.", "The sled barely registers that this is even happening."] },
  "single-leg calf raise": { cue: "One foot at a time, hold something for balance, full range on every rep.", joke: ["Half the feet, all of the complaining.", "Balancing and rising at once. Showing off, frankly."] },
  "donkey calf raise": { cue: "Hips hinged forward, torso low, rise onto your toes from that bent-over position.", joke: ["Named after a donkey. The pose does explain why.", "Bent over just to make the calves reach further. Apparently worth it."] },

  // Weight training -- Abs
  "reverse crunch": { cue: "Curl your hips off the floor toward your ribs, do not just swing your legs up.", joke: ["A crunch that runs in reverse, as if the regular one was too straightforward.", "The bottom half does the work this time. It is thrilled."] },

  // Weight training -- Lower Back
  "suitcase carry": { cue: "One weight, one side, stand tall and resist leaning toward it as you walk.", joke: ["Carrying one heavy bag like you are late for a flight you are not on.", "The farmer's carry's lopsided cousin."] },
  "reverse hyperextension": { cue: "Torso stays flat on the bench, swing the legs up using the glutes, not momentum from your lower back.", joke: ["The extension where your legs fly and your spine just watches.", "Hanging off a bench, kicking backward, with genuine purpose."] },

  // Yoga -- Standing poses
  "mountain pose": { cue: "Feet grounded evenly, shoulders stacked over hips, crown reaching up. It looks like nothing and it is not nothing.", joke: ["Standing still, on purpose, and calling it a pose.", "The pose that is just correct posture with better branding."] },
  "chair pose": { cue: "Weight back into your heels, knees over not past your toes, arms reach up by your ears.", joke: ["A squat that got invited to yoga and had to change its name.", "Sitting in a chair that does not exist. The chair never shows up."] },
  "warrior i": { cue: "Hips squared toward the front foot, back heel grounded at an angle, arms reach straight overhead.", joke: ["The first warrior. Hips facing forward, motive still unclear.", "Arms in the air like a warrior who forgot why."] },
  "warrior ii": { cue: "Hips open to the side this time, front knee over the ankle, arms reach out parallel to the floor.", joke: ["The second warrior. A better view of the side of the room, at least.", "Arms out wide, gaze down the front hand, very dramatic for a stretch."] },
  "triangle pose": { cue: "Hinge sideways from the hip, not the waist, and stack your shoulders directly on top of each other.", joke: ["A triangle made of a person. Geometry teachers would approve.", "Reaching in two directions at once. An ambitious shape."] },
  "warrior iii": { cue: "Hinge forward from the hips, one leg lifts straight back, hips stay square to the floor.", joke: ["The third warrior. Also the one most likely to fall over.", "Balancing on one leg while horizontal. Bold choice."] },

  // Yoga -- Balance poses
  "tree pose": { cue: "Foot presses into your inner thigh or calf, never the knee, and press back into it just as hard.", joke: ["Standing on one leg, pretending to be a tree. The tree is not fooled.", "This one is mostly about the standing leg, and it is furious about it."] },
  "eagle pose": { cue: "Wrap the arms and legs around each other, sink the hips like sitting into a low chair, pick one spot and stare at it.", joke: ["Wrapping your own limbs around themselves. Not what eagles do, statistically.", "A pretzel that also has to balance. Ambitious."] },
  "half moon pose": { cue: "Stack your hips vertically, extend the top arm straight up, keep the standing knee soft rather than locked.", joke: ["Half a moon, balanced on one hand and one leg. The other half is elsewhere.", "One hand down, one leg up. Gravity is paying very close attention."] },
  "dancer's pose": { cue: "Grab the lifted foot from the inside, then kick back into your hand as your chest lifts forward.", joke: ["A dancer's pose performed by someone who has never danced. Same as everyone.", "Reaching back for your own foot. A trust exercise, technically."] },
  "crow pose": { cue: "Knees rest on the backs of your upper arms, weight shifts forward onto your hands, look slightly ahead rather than down.", joke: ["Balancing your entire body on your hands. The hands were not consulted.", "A crow, on the floor, about to not be on the floor."] },

  // Yoga -- Core & twists
  "plank pose": { cue: "Straight line from your head to your heels, hands under your shoulders, ribs pulled in.", joke: ["Yoga's version of the plank. Same stillness, calmer soundtrack.", "Holding a push-up position and calling it peaceful."] },
  "boat pose": { cue: "Balance on your sit bones, chest lifted, shins parallel to the floor or higher if your back starts to round.", joke: ["A boat made of a person, floating on nothing.", "Sitting there in a V shape, going nowhere, working very hard."] },
  "revolved chair pose": { cue: "Sink into chair pose first, then rotate from the ribs, keeping both knees level as you twist.", joke: ["Chair pose, except it also had to spin. Overachiever.", "The chair that never existed will now also not stay still."] },
  "firefly pose": { cue: "Hands planted behind your heels, shins resting high on the backs of your upper arms, lean forward and press down to float the hips.", joke: ["Legs straight out to the sides, floating on two hands. Fireflies do not do this either.", "An arm balance for people who have made peace with falling."] },

  // Yoga -- Backbends
  "cobra pose": { cue: "Hips stay on the mat, press through your hands, keep a slight bend in the elbows rather than locking them out.", joke: ["Lifting the chest, keeping the hips down. The snake part is optional.", "A backbend that starts from the floor and barely leaves it."] },
  "bridge pose": { cue: "Feet hip-width, push through your heels to lift the hips, roll back down one vertebra at a time.", joke: ["A bridge, built from a person, lying down for once.", "The gentler backbend. It still has opinions about your lower back."] },
  "camel pose": { cue: "Push the hips forward over your knees first, then reach back for your heels one hand at a time.", joke: ["Reaching for your own heels while kneeling. The camel would not do this either.", "A backbend on your knees. The floor is very far from your head right now."] },
  "wheel pose": { cue: "Hands by your ears, feet close to your hips, press evenly through hands and feet to lift.", joke: ["The whole body, arched into a wheel. An ambitious flooring choice.", "Upside down and backward at the same time. Showing off.", "The strongest backbend on the list, and it looks it."] },
  "king pigeon pose": { cue: "Square the hips first before you reach back for the foot. Only go as deep as your hips actually allow.", joke: ["Pigeon pose that decided regular pigeon was not enough.", "A hip opener that also wanted to be a backbend. Greedy."] },

  // Yoga -- Hip openers & forward folds
  "low lunge": { cue: "Back knee cushioned on the mat, front knee over the ankle, sink the hips forward and down.", joke: ["A lunge that gave up on the back leg entirely.", "Kneeling and reaching forward. The floor is very involved."] },
  "butterfly pose": { cue: "Soles of the feet together, let the knees drop toward the floor, do not press down on them.", joke: ["Sitting like a butterfly. The knees have their own agenda.", "Feet together, knees out, patience required."] },
  "pigeon pose": { cue: "Square the hips toward the front of the mat, support the front hip with a block if it is not reaching the floor.", joke: ["One leg forward, one leg back, hips extremely upset about both.", "The pose everyone avoids and everyone needs."] },
  "lizard pose": { cue: "Front foot lands outside your hands, hips sink low and square, back knee can rest down for support.", joke: ["A lunge that got even lower and dragged the hands with it.", "Hands and feet, all on the floor, hips somewhere near the basement."] },
  "splits (hanumanasana)": { cue: "Square the hips forward, walk down slowly, use blocks under both hands, and never force the range.", joke: ["The splits. The floor is very far away and slowly getting closer.", "Named after a monkey. Only the monkey does this without blocks."] },

  // Yoga -- Restorative / cool-down
  "child's pose": { cue: "Hips sink back toward your heels, arms reach forward or rest by your sides, forehead down.", joke: ["The pose where you get to just stop for a minute. Deeply underrated.", "Folded up small on purpose. Highly recommend."] },
  "cat-cow": { cue: "Inhale as you arch and lift your chest, exhale as you round through your spine like a cat. Slow both ways.", joke: ["The only pose named after two entirely different animals having a great time.", "A warm-up so gentle even a drawing could love it. I am lines. I still love it."] },
  "corpse pose (savasana)": { cue: "Let your feet fall open, palms up, and actually stop moving. Stillness is the whole exercise here.", joke: ["Lying perfectly still and calling it the hardest pose in the room. They are right.", "The one pose I could do professionally.", "I have not moved in weeks. This one I understand completely."] },
  "reclined twist": { cue: "Knees drop to one side, keep both shoulders pressed to the floor, and let gravity do the twisting.", joke: ["A twist you do lying down. The laziest, most effective idea in the whole practice.", "Knees go one way, shoulders refuse to follow. A small, polite rebellion."] },
  "legs-up-the-wall pose": { cue: "Hips close to the wall, legs relaxed straight up, arms resting open, just breathe.", joke: ["Lying down with your legs on a wall. The wall does all the work.", "The most effort-free pose that still counts. My favourite category."] },
  "reclined bound angle pose": { cue: "Soles of the feet together, let gravity open the knees, support them with pillows if they do not reach the floor.", joke: ["Butterfly pose, but lying down, because even the trying got tired.", "Knees falling open while you do nothing. A pose built for nap adjacency."] },

  // Pilates -- Core / abs
  "double leg stretch": { cue: "Low back pressed to the mat the whole time, extend arms and legs only as far as you can hold that.", joke: ["Stretching two legs by making them do considerably more work.", "Arms and legs fly out together. The middle stays exactly where it should."] },
  "single leg stretch": { cue: "Low back stays flat on the mat, switch legs with control rather than a kick.", joke: ["One knee in, one leg out, and somehow both feel it.", "The hundred's smaller, sneakier cousin."] },

  // Pilates -- Glutes / hips
  "leg circles": { cue: "Hips stay still on the mat, the circle comes from the hip socket, not from swinging the whole leg.", joke: ["Drawing circles in the air with your leg. The ceiling remains unimpressed.", "One leg working, one hip trying very hard to stay out of it."] },

  // Calisthenics -- Pull progressions
  "negative pull-up": { cue: "Start at the top of the bar, then lower yourself as slowly as you possibly can, all the way to a hang.", joke: ["A pull-up in reverse, for people not quite ready for the real thing. No shame in it.", "Falling, but make it strength training."] },
  "archer pull-up": { cue: "Pull up while shifting your chin toward one hand, letting the other arm stay long and mostly straight.", joke: ["A pull-up that picked a favourite arm and will not apologise for it.", "One arm does the pulling. The other just enjoys the view."] },
  "one-arm pull-up": { cue: "Full body tension, pull from the shoulder and lat, not just the arm. Most people spend years building to this.", joke: ["The pull-up's final form. I am simply lines and I still find this intimidating.", "One arm. The other is somewhere else entirely, doing nothing, judged."] },

  // Calisthenics -- Leg progressions
  "bodyweight squat": { cue: "Feet shoulder width, knees track over your toes, sit back like there is a chair behind you.", joke: ["A squat with no weight, no bar, no excuse.", "The squat in its purest form. Nothing left to blame but gravity."] },
  "split squat": { cue: "Feet planted for the whole set, front knee over the ankle, drop straight down rather than forward.", joke: ["A lunge that stopped moving and got serious about it.", "Same legs as a lunge, none of the travel."] },
  "shrimp squat": { cue: "Hold your back foot behind you, sit the standing hip back and down, use a hand for balance while you learn it.", joke: ["A pistol squat that decided one bent leg was not hard enough.", "Balancing on one leg while the other one folds up behind you. Ambitious."] },
  "pistol squat": { cue: "Extend the free leg straight out in front, sit the standing hip back, and keep the heel down.", joke: ["One leg squatting, the other leg pointing accusingly at nothing.", "A squat that demands balance, strength, and forgiving ankles, all at once."] },

  // Calisthenics -- Core & static holds
  "hollow body hold": { cue: "Press your lower back into the floor and keep it there, arms and legs extended, ribs down.", joke: ["Holding a banana shape until your abs file a formal complaint.", "Lying down has never been this much work."] },
  "tuck l-sit": { cue: "Press your shoulders down away from your ears, knees tucked tight, hips lifted off the floor.", joke: ["An L-sit that has not finished growing up yet.", "Floating with your knees tucked in. Small victories."] },
  "l-sit": { cue: "Press the shoulders down, legs straight and together, point the toes.", joke: ["Sitting in mid-air, legs out straight, dignity fully intact.", "The letter L, held against your will."] },
  "v-sit": { cue: "Legs lift above parallel this time, hips further forward than an L-sit, shoulders still pressed down.", joke: ["The L-sit's more dramatic sibling.", "A V shape made entirely of effort."] },

  // Calisthenics -- Advanced statics (skill work)
  "wall handstand hold": { cue: "Stack wrists under shoulders, squeeze the glutes and brace, use the wall for balance rather than leaning your whole weight on it.", joke: ["Upside down, with a wall for a safety net. Reasonable.", "A handstand that admits it needs help. Respect."] },
  "tuck front lever": { cue: "Hollow the body, pull your shoulder blades down, keep the knees tucked tight to shorten the lever.", joke: ["A front lever that has not committed to straight legs yet. Smart.", "Horizontal, tucked up, extremely proud of it."] },
  "freestanding handstand": { cue: "Fingers spread wide, press through the fingertips to balance, look at your hands rather than the floor.", joke: ["Upside down, unsupported, entirely on your own. Brave.", "The wall left the room for this one."] },
  "front lever": { cue: "Straight body, straight arms, pull the shoulder blades down and back to keep the line flat, not banana-shaped.", joke: ["The move pattern already warned you this was absurd. It undersold it.", "A plank, rotated ninety degrees, hanging from a bar. Sure."] },
  "tuck planche": { cue: "Lean forward over your hands, knees tucked to your chest, shoulders in front of your wrists.", joke: ["A planche still deciding if it actually wants to happen.", "Leaning forward on your hands with your knees along for the ride."] },
  "full planche": { cue: "Straight arms, straight body, lean far enough forward that your shoulders are well past your wrists.", joke: ["The planche in its final form. I am impressed and I do not even have a body.", "Floating parallel to the floor on two hands.", "The floor is directly underneath this the entire time and remains unbothered."] },

  // Stretching -- Dynamic, before training
  "arm circles": { cue: "Start small and controlled, let the circles get bigger only once the shoulder feels warm.", joke: ["Windmill impressions. No wind involved.", "The easiest warm-up there is. I would still forget to do it."] },
  "cross-body arm swings": { cue: "Let both arms swing across your chest and back out, keep the motion loose rather than forced.", joke: ["Hugging yourself repeatedly, at speed, strictly for warm-up purposes.", "Arms crossing back and forth like they are mid-argument."] },
  "elbow circles": { cue: "Fingertips on your shoulders, circle the elbows in a full slow ring, both directions.", joke: ["The smallest circles in the entire warm-up. Still counts.", "Elbows, circling, for reasons nobody questions."] },
  "wrist circles": { cue: "Slow full circles in both directions, letting the whole hand move rather than just the fingers.", joke: ["The joint that carries every other exercise on this list, getting thirty seconds of attention.", "Wrists. Overworked. Underwarmed. Fixing that now."] },
  "torso twists": { cue: "Rotate from the ribs, let the arms swing loosely along for the ride, feet stay mostly still.", joke: ["Twisting side to side like a very slow pendulum.", "The torso, waking up, one twist at a time."] },
  "prone press-up": { cue: "Hips stay on the floor, press up through your hands, let the lower back relax into it.", joke: ["A cobra pose that showed up early to warm up, not to pose.", "Pressing the top half up, leaving the bottom half entirely out of it."] },
  "leg swings": { cue: "Hold something for balance, swing the leg from the hip, let it get a little taller each swing without forcing the top.", joke: ["One leg swinging like a pendulum with somewhere to be.", "The standing leg does all the real work here and gets none of the credit."] },
  "lateral leg swings": { cue: "Hold something for balance, swing the leg across your body and back, hips stay facing forward.", joke: ["The sideways version. The standing leg is still furious about it.", "Swinging a leg like a gate that will not stay shut."] },
  "ankle circles": { cue: "Slow full circles, both directions, both ankles, a small range is fine.", joke: ["The joint everyone forgets exists until it stops cooperating.", "Ankles. They carry the whole operation and get thirty seconds of thanks."] },
  "world's greatest stretch": { cue: "Step into a deep lunge, drop the back knee, rotate toward the front leg, then straighten it for a hamstring reach.", joke: ["Named the world's greatest by someone very confident.", "Four stretches wearing a trench coat, calling itself one."] },
  "walking lunge with twist": { cue: "Lunge forward, rotate the torso toward the front leg, and let the rotation come from the ribs rather than the arms.", joke: ["A lunge that also wanted to be a twist. Overachiever.", "Walking, lunging, and twisting, all at once. The warm-up equivalent of multitasking."] },
  "squat to stand": { cue: "Hinge down to hold your ankles or shins, sink into a squat without letting go, then stand back up.", joke: ["A squat that cannot decide if it wants to bend over or sit down, so it does both.", "Touching your toes, then squatting underneath them. Efficient confusion."] },
  "straight-arm band pulldown": { cue: "Arms stay straight the whole way, pull the band down in front of you to your thighs, feel it in the lats and shoulders.", joke: ["A pulldown that showed up before the workout even started.", "The band resists the whole way. It has strong opinions about your shoulders."] },
  "prone y raise": { cue: "Thumbs up, lift the arms into a Y shape, squeeze the lower traps, keep the neck long.", joke: ["Lying face down, forming a letter, for the shoulders' benefit.", "The Y. Rarer than the T. More annoying than both."] },

  // Stretching -- Static, after training
  "doorway pec stretch": { cue: "Forearm on the frame at shoulder height, step through slowly until you feel it across your chest.", joke: ["A doorway, repurposed as gym equipment. Every doorway is now suspect.", "Leaning into a door until your chest opens up. The door never complains."] },
  "cross-body shoulder stretch": { cue: "Pull the arm across your chest with the other forearm, keep the shoulder down rather than hunched up.", joke: ["Hugging one arm across yourself. A very one-sided hug.", "The stretch for the shoulder you cannot see in the mirror."] },
  "overhead triceps stretch": { cue: "Elbow points straight up, gently pull it back with the other hand, no yanking.", joke: ["Reaching for your own back and achieving very little distance.", "An arm behind your head, apologising to your triceps."] },
  "upper trap stretch": { cue: "Tilt your ear toward your shoulder, a light hand on the head is enough, never pull hard.", joke: ["The stretch for the muscle that carries all your stress, quite literally.", "Tilting the head slightly. The trap has been waiting all day for this."] },
  "thread the needle stretch": { cue: "Thread one arm under your body and rest the shoulder down, hips level, breathe into the twist.", joke: ["Threading an arm through a needle that is not actually there.", "A twist for the upper back, disguised as a craft project."] },
  "kneeling lat stretch": { cue: "Reach both arms forward and sit your hips back toward your heels, letting the lats lengthen.", joke: ["Child's pose that got specific about which muscle it was for.", "Reaching forward until the lats finally let go."] },
  "biceps wall stretch": { cue: "Palm flat on the wall behind you, arm straight, slowly rotate your body away from the wall.", joke: ["Turning your back on a wall you were just holding onto.", "The bicep, stretched by architectural betrayal."] },
  "wrist flexor stretch": { cue: "Arm out straight, palm up, gently pull the fingers back toward you with the other hand.", joke: ["Bending the wrist backward on purpose, which feels wrong and is correct.", "The forearm's turn to complain, finally."] },
  "wrist extensor stretch": { cue: "Arm out straight, palm down, gently press the back of the hand down and toward you.", joke: ["The opposite direction from the last one. The wrist is unimpressed either way.", "Palm down this time. Same wrist, an entirely new grievance."] },
  "sphinx stretch": { cue: "Forearms flat on the floor, elbows under your shoulders, let the lower back relax down without forcing the arch.", joke: ["A cobra that decided to relax about the whole thing.", "Propped up on your elbows, doing a very calm impression of a sphinx."] },
  "seated spinal twist": { cue: "Sit tall first, then rotate from the ribs toward the bent knee, using the arm as a gentle lever rather than a yank.", joke: ["Sitting and twisting. The floor's most polite argument.", "A twist that starts with sitting up straight, which is the hard part."] },
  "standing side bend stretch": { cue: "Reach one arm overhead and lean sideways from the ribs, both feet grounded, no leaning forward.", joke: ["Leaning sideways like you are trying to see around someone.", "The side of the body nobody stretches, finally getting a turn."] },
  "knees-to-chest stretch": { cue: "Pull both knees toward your chest, keeping your lower back flat on the floor, and breathe.", joke: ["Curling up small on the floor. Deeply relatable.", "Hugging your own knees. Nobody is around to judge this, except me."] },
  "figure four stretch": { cue: "Cross the ankle over the opposite knee, pull the far thigh toward your chest, keep the crossed foot flexed.", joke: ["Your legs, forming a shape a mathematician would recognise.", "The number four, made of legs, for the glutes."] },
  "kneeling hip flexor stretch": { cue: "Squeeze the back glute and push the hips forward, ribs down so you do not just arch the lower back.", joke: ["Kneeling to stretch a muscle that got tight from too much sitting. There is irony in there somewhere.", "The hip flexors, cornered at last."] },
  "couch stretch": { cue: "Back shin against the couch, squeeze the glute on that side, keep the torso upright rather than leaning forward.", joke: ["A stretch that requires actual furniture. Bold.", "The couch, finally doing something for your fitness instead of against it."] },
  "frog stretch": { cue: "Knees wide, ankles in line with the knees, sink the hips back slowly, stop well before it pinches.", joke: ["On all fours, knees wide, looking exactly like the name suggests.", "A pose named after an amphibian, performed by someone who is not one."] },
  "standing hamstring stretch": { cue: "Heel forward with a slight elevation, leg straight but not locked, hinge from the hips with a flat back.", joke: ["Reaching for a foot that never seems to get any closer.", "Standing there, bent over a straight leg. The hamstring saw this coming."] },
  "supine hamstring stretch": { cue: "Lying on your back, raise one leg, pull gently with a strap or your hands, keep the other leg flat.", joke: ["Reaching for your own foot from a lying-down position. Efficient laziness.", "The hamstring stretch you can do without ever standing up. My favourite kind."] },
  "standing calf stretch": { cue: "Back leg straight, heel pressed down, lean into the wall until you feel it in the upper calf.", joke: ["Leaning on a wall like it owes you something. It is just a wall.", "The calf, stretched by leaning on architecture."] },
  "bent-knee calf stretch": { cue: "Same stance as the straight-leg version, but bend the back knee this time, heel still down.", joke: ["The standing calf stretch's more relaxed cousin.", "A bent knee changes which half of the calf gets to complain."] },

  // Stretching -- Mobility, daily
  "90/90 hip switch": { cue: "Both knees stay at right angles, sit tall, rotate through the hips slowly without muscling it with your hands.", joke: ["Two right angles, switching sides, with great effort.", "Sitting on the floor, rotating, and calling it hip mobility. It is."] },
  "half-kneeling hip flexor rock": { cue: "Squeeze the back glute, rock your hips forward and back in a small controlled range, ribs stay down.", joke: ["Rocking gently back and forth like you are stalling for time. You are, productively.", "The hip flexor stretch that could not sit still."] },
  "deep squat hold": { cue: "Heels flat, chest tall, let your elbows gently press your knees out, then just hold and breathe.", joke: ["Squatting all the way down and simply staying there. Deeply human, evolutionarily speaking.", "The position toddlers do for fun and adults pay to relearn.", "A hold with nothing moving and everything working."] },
  "cossack squat": { cue: "Wide stance, sit into one hip while the other leg stays straight, heel down on the bent side.", joke: ["A squat that leans hard to one side and commits fully.", "One leg bending, one leg refusing. A whole negotiation."] },
  "standing hip airplane": { cue: "Stand on one leg, hinge forward, rotate the hips open then closed while the standing leg stays steady.", joke: ["Arms out like wings, balanced on one leg, betting heavily on air traffic control.", "The hip, rotating, while the standing leg quietly panics."] },
  "open book thoracic rotation": { cue: "Lie on your side, knees stacked and glued together, open the top arm across your body and follow it with your eyes.", joke: ["Knees pinned together so the twist has to come from the right place.", "Reading an invisible book, with your ribs."] },
  "quadruped thoracic rotation": { cue: "Hand behind your head, rotate the elbow up toward the ceiling then thread it back under your body, hips stay still.", joke: ["Threading the needle's more athletic cousin.", "On all fours, rotating an elbow toward the sky. The hips are told to stay out of it."] },
  "foam roller thoracic extension": { cue: "Roller under your upper back, hands behind your head, arch gently over it, hips low, nothing on your neck.", joke: ["A tube of foam, quietly correcting years of slouching.", "Draping yourself backward over foam. The foam has seen worse."] },
  "foam roller chest opener": { cue: "Lie the full length of the roller along your spine, let your arms fall open to the sides, and breathe into it.", joke: ["Lying on a foam tube with your arms out like you have given up entirely. That is the point.", "The roller does the opening. You just have to lie there."] },
  "prone scorpion stretch": { cue: "Lying face down, arms out to the sides, lift one leg and rotate it across toward the opposite hand, chest stays down.", joke: ["Named after a scorpion. The tail is doing a lot of the imagining.", "One leg reaching across your own back. The sting is optional."] },
  "standing forward hang": { cue: "Bend the knees generously, fold forward from the hips, and let your arms and head hang like dead weight.", joke: ["Hanging upside-down-ish, doing absolutely nothing, entirely on purpose.", "The stretch that asks you to just give up, briefly, for your hamstrings."] },

  // Cardio -- Steady / easy
  "easy run": { cue: "Relaxed shoulders, let the arms swing from the shoulder rather than the elbow.", joke: ["Running from nothing, toward nothing, at a pace where you could still hold a conversation with nobody.", "The easy run. Named accurately, for once."] },
  "brisk walk": { cue: "Push off through the toes on each step, let the hips move naturally, do not overstride.", joke: ["Walking, but with intent. The intent is doing a lot of work.", "Faster than a stroll, slower than admitting you are exercising."] },
  "easy ride": { cue: "Hands light on the bars, elbows soft, let the legs absorb the road rather than your shoulders.", joke: ["Sitting down, moving fast, somehow still officially exercise.", "The bike does most of the work. I respect the hustle regardless."] },
  "easy spin": { cue: "Pedal in smooth full circles, not just stomping the downstroke.", joke: ["A bike that goes nowhere, ridden with total conviction.", "Spinning in place. The wheels are decorative and I love that for them."] },
  "easy swim": { cue: "Long strokes, reach full extension before you pull, do not rush the turnover.", joke: ["Exercise, but wet, and somehow still my favourite kind to imagine.", "The only cardio where drowning is technically on the table. Stay alert."] },
  "elliptical steady": { cue: "Keep the stride smooth front to back, do not lean your weight onto the handles.", joke: ["A machine that argues it is running, walking, and neither, all at once.", "The gentlest way to go absolutely nowhere with purpose."] },
  "incline walk": { cue: "Lean very slightly from the ankles, not the waist, and take shorter steps than you would on flat ground.", joke: ["A walk that got ambitious about the incline setting.", "Climbing a hill that is actually a conveyor belt. The hill knows."] },

  // Cardio -- Intervals
  "run intervals": { cue: "Quicken the cadence for the hard minute rather than just lengthening the stride.", joke: ["Fast, then slow, then fast again. My favourite kind of indecision.", "A run that keeps changing its mind, on a fixed schedule."] },
  "bike intervals": { cue: "Stay seated through most of the hard effort, only stand if the legs are truly begging for it.", joke: ["The bike equivalent of sprinting, minus the part where you actually go anywhere.", "Pedalling hard at a wall of numbers on a screen. Thrilling, somehow."] },
  "hill repeats": { cue: "Lean forward slightly from the ankles on the way up, not from the waist.", joke: ["Running uphill on purpose, repeatedly, as if the first time was not clear enough.", "A hill that will still be there for the next rep. It always is."] },
  "sprint intervals": { cue: "Drive the knees and pump the arms hard, that is where the actual speed comes from.", joke: ["The fastest you will move all week, for twenty seconds, entirely on purpose.", "All out, then walking. The walking part is doing important work too."] },
  "hiit circuit": { cue: "Reset your breathing in the rest windows, do not carry ragged breath straight into the next move.", joke: ["Several exercises, none of them long enough to get comfortable with.", "Twenty seconds of chaos, forty seconds of regret. Repeat."] },
  "stair intervals": { cue: "Push through the whole foot on each step, not just the toes.", joke: ["Stairs that go nowhere, worked hard on purpose, repeatedly.", "A staircase with no top floor. Somebody designed this and should be proud."] },
  "jump rope intervals": { cue: "Land softly on the balls of your feet, knees slightly bent, barely a sound on each landing.", joke: ["A rope, a floor, and a great deal of enthusiasm.", "Jumping over a rope that is not even there half the time. Confidence."] },

  // Cardio -- Tempo / threshold
  "tempo run": { cue: "Keep the cadence steady even as it gets uncomfortable, do not let the stride get sloppy.", joke: ["The uncomfortable middle speed. Too fast to relax, too slow to be finished.", "A pace that is technically sustainable and does not feel like it."] },
  "tempo ride": { cue: "Stay low and relaxed on the bars, let the legs carry the effort rather than the upper body.", joke: ["The bike's version of the uncomfortable middle. The middle is long.", "Riding hard for a long time, with nowhere in particular to arrive."] },
  "progression run": { cue: "Check your form as you speed up, fatigue tends to show up in the shoulders first.", joke: ["A run that gets harder the longer it goes, which feels like a design flaw.", "Starting slow on purpose is the hardest part. Everyone wants to start fast."] },

  // Cardio -- Long / endurance
  "long run": { cue: "Relax the hands and jaw, tension there wastes energy you will want later.", joke: ["A very long time spent going nowhere in particular, deliberately.", "The long run. Mostly a test of patience wearing running shoes."] },
  "long ride": { cue: "Shift your position on the saddle occasionally, staying in one spot for that long adds up.", joke: ["An hour and a half on a bike. The saddle has opinions by the end.", "Going a very long way and ending up exactly back where you started. The whole sport, honestly."] },
  "hike": { cue: "Let your arms help with balance on uneven ground rather than staying locked at your sides.", joke: ["A walk that decided flat ground was not a personality.", "Nature's treadmill, except the incline is real and mildly hostile."] },
  "long walk": { cue: "Keep an even pace you could hold for the whole distance, do not start fast and fade.", joke: ["An hour of walking. Nobody claps for this and it is still worth doing.", "The most patient cardio there is. I respect the commitment."] },

  // Cardio -- Recovery
  "recovery walk": { cue: "Loosen the shoulders and let the stride shorten naturally, nothing to prove here.", joke: ["A walk with no goal except being a walk.", "Deliberately doing less. Harder than it sounds for some people."] },
  "recovery spin": { cue: "Keep the cadence light and quick with resistance barely there, this is a flush, not a workout.", joke: ["Pedalling just hard enough to remember you have legs.", "The easiest thing on two wheels. Which, on this list, is saying something."] },
  "easy elliptical": { cue: "Let the machine set the rhythm, do not fight the pedals to go faster than feels easy.", joke: ["The gentlest machine, taken even gentler. A new personal low, in a good way.", "Gliding nowhere, slowly, entirely on purpose."] },

  // Cardio (pattern-only) -- Steady / easy
  "easy row": { cue: "Feet strapped snug, grip loose, let the seat glide all the way up to the catch before you pull.", joke: ["Rowing a boat that will never once touch water.", "Sliding back and forth on a rail, going nowhere, entirely on purpose."] },

  // Cardio (pattern-only) -- Intervals
  "row intervals": { cue: "Keep the stroke rate honest during the hard rounds, do not just yank harder with the arms.", joke: ["The machine that turns rowing into pure math. Splits, watts, all of it.", "Intervals on a rowing machine. The rest is real. The finish line is not."] },

  // Cardio (pattern-only) -- Tempo / threshold
  "threshold row": { cue: "Long steady strokes, full slide each time, resist the urge to shorten the stroke when it gets uncomfortable.", joke: ["The long, uncomfortable middle of rowing. No finish line in sight, on purpose.", "Rowing forever, staring at a wall. Character building."] },
};

/* Ordered longest first so "close-grip bench press" is not caught by "press"
   on its way past. */
const FORM_PATTERNS = [
  ["thoracic rotation", { cue: "Rotate from the upper back, keep the lower back still.", joke: "Upper back. The forgotten bit." }],
  ["hip airplane", { cue: "Stand on one leg, hinge, then rotate the hips open and closed.", joke: "Balancing and rotating. Good luck." }],
  ["forward hang", { cue: "Soft knees, let everything hang, breathe.", joke: "Hanging forward. Letting go." }],
  ["front lever", { cue: "Hollow body, pull the bar toward your hips, keep the arms straight.", joke: "Horizontal. Off the ground. Absurd." }],
  ["foam roller", { cue: "Slow. Breathe out over the tight spots.", joke: "A foam tube against your whole personality." }],
  ["hip flexor", { cue: "Squeeze the glute on the back leg, ribs down, do not arch.", joke: "Hip flexors. Sitting made them like this." }],
  ["handstand", { cue: "Stack wrists, shoulders and hips. Squeeze the glutes.", joke: "Upside down, on purpose." }],
  ["open book", { cue: "Knees stay stacked. Let the top arm open and follow it with your eyes.", joke: "Opening like a book. A very stiff book." }],
  ["warrior", { cue: "Front knee over the ankle, back foot planted, shoulders over the hips.", joke: "A warrior. Standing very still." }],
  ["planche", { cue: "Straight arms, lean far forward, squeeze everything.", joke: "Floating. With effort." }],
  ["cat-cow", { cue: "Move slowly with your breath. Arch on the inhale, round on the exhale.", joke: "Two animals, one spine." }],
  ["splits", { cue: "Ease in. Never force it. Blocks under your hands are not cheating.", joke: "The splits. Take your time. Take a year." }],
  ["l-sit", { cue: "Press the shoulders down, legs straight, point the toes.", joke: "Sitting. In the air. The letter L." }],
  ["v-sit", { cue: "Hips above the hands. This one takes years.", joke: "The letter V. Harder than L." }],
  ["90/90", { cue: "Both knees at right angles. Switch slowly, sit tall.", joke: "Two right angles and a lot of hip." }],
  ["tuck", { cue: "Knees tight to your chest, shoulders pressed down.", joke: "Tucked up small. It helps." }],
  ["calf raise", { cue: "All the way up, all the way down.", joke: "Calves. Patient work." }],
  ["extension", { cue: "Only the working joint moves. Everything else stays still.", joke: "Straightening things out." }],
  ["pulldown", { cue: "Chest up, elbows down to your ribs, no leaning back.", joke: "Pulling down. Gravity approves." }],
  ["pushdown", { cue: "Elbows pinned. Only the forearm moves.", joke: "Down. Just down." }],
  ["deadlift", { cue: "Flat back, bar close, push the floor away.", joke: "Lifting a heavy thing off the ground. The oldest sport." }],
  ["pull-up", { cue: "No swinging. Chest toward the bar.", joke: "Hanging, with ambition." }],
  ["stretch", { cue: "Ease in, breathe out, never bounce.", joke: "Stretching. Nobody does enough of it. Including me, and I am lines." }],
  ["circles", { cue: "Small and controlled first, then bigger.", joke: "Circles. The friendliest shape." }],
  ["thrust", { cue: "Chin tucked, ribs down, squeeze at the top.", joke: "Squeezing, loudly." }],
  ["crunch", { cue: "Ribs to hips. Do not pull your neck.", joke: "A small fold." }],
  ["swings", { cue: "Let it swing, do not force the end range.", joke: "Swinging. Loosely." }],
  ["press", { cue: "Press in a straight line and keep your ribs down.", joke: "Pressing. Reliable." }],
  ["bench", { cue: "Feet flat, shoulder blades back, control it down.", joke: "A bench and a decision." }],
  ["raise", { cue: "Lead with the elbow, stop at shoulder height, no shrugging.", joke: "Small weight, big feelings." }],
  ["shrug", { cue: "Straight up, no rolling, pause at the top.", joke: "A shrug with intent." }],
  ["squat", { cue: "Brace, knees over toes, push the floor away.", joke: "Down and up. Legs unhappy." }],
  ["lunge", { cue: "Front knee over the ankle, chest tall.", joke: "Stepping, with weight." }],
  ["plank", { cue: "Ribs down, glutes tight, straight line.", joke: "Stillness, but difficult." }],
  ["carry", { cue: "Stand tall, shoulders back, walk.", joke: "Carrying. Simple. Brutal." }],
  ["twist", { cue: "Rotate from the ribs, keep your hips facing forward.", joke: "Twisting. Gently." }],
  ["curl", { cue: "Elbows at your sides, no swinging, slow on the way down.", joke: "Curling. For looks. We are honest here." }],
  ["hold", { cue: "Breathe. Do not hold your breath.", joke: "Holding. Just holding." }],
  ["pose", { cue: "Breathe steadily. Come out of it as carefully as you went in.", joke: "A shape, held with dignity." }],
  ["fly", { cue: "Soft bend in the elbows, hug, do not press.", joke: "Hugging the air again." }],
  ["row", { cue: "Chest up, pull to your belly, squeeze the shoulder blades.", joke: "Pulling. The other half of the job." }],
];

/* The lift name arrives already lowercased as ctx.lift. An exact match wins,
   then the longest pattern contained in the name, then nothing. */
export function formFor(lift) {
  if (!lift) return null;
  if (FORM[lift]) return FORM[lift];
  for (const [pat, entry] of FORM_PATTERNS) if (lift.includes(pat)) return entry;
  return null;
}
const cueOf = (c) => { const f = formFor(c.lift); return f ? f.cue : null; };
/* joke is a plain string on the older entries and an array of 2-3 on newer
   ones, so a move said often does not always land on the same line. Picked
   fresh on every call rather than once per move, which is what lets the same
   exercise say something different across sets; pickQuip's own "already
   used" tracking in index.html works on the resolved string either way. */
const jokeOf = (c) => {
  const f = formFor(c.lift);
  if (!f) return null;
  return Array.isArray(f.joke) ? f.joke[Math.floor(Math.random() * f.joke.length)] : f.joke;
};

export const QUIPS = {
  /* The dashboard. Mo asked for him here: "the robot with a message, a funny
     little message", right under the card that offers today's workout.
     
     A different beat from every other bank. Nothing is happening yet, there is
     no set to react to and no rest to fill, so these are the lines of somebody
     who has been standing in an empty room waiting for you to arrive. The rule
     about what he never jokes about matters more here than anywhere, because a
     dashboard is where a quiet week is visible: there is no line below about a
     week going badly, only lines about a week still being open. */
  home: [
    "You are here. I had nothing else on.",
    "I have been standing in this card since you closed the app.",
    "Everything is where you left it. I checked twice.",
    "I do not know what a dashboard is. I live in one.",
    "Numbers up there. Me down here. We each have a role.",
    "I rearranged nothing. You are welcome.",
    "I have run the numbers. They are, as ever, the numbers.",
    "Welcome back. I did not move.",
    "These squares do not fill themselves. I have watched. Closely.",
    "This is the part where you decide something. No pressure. Some pressure.",
    "I have been practising looking approachable. Thoughts?",
    "I was going to tidy up, but I have no arms and no opinions about layout.",
    "Someone has to sit under the important card. It is me. It is my post.",
    "I have read your week three times. It is still your week.",
    (c) => (c.hour < 7 ? "Up early. I admire it from a great distance." : null),
    (c) => (c.hour >= 22 ? "Late. I am nocturnal. I am also a drawing." : null),
    (c) => (c.streak >= 3 ? `Day ${c.streak}. I have started rounding up when I mention it.` : null),
    (c) => (c.streak >= 10 ? `${c.streak} days. I have run out of casual ways to bring this up.` : null),
    (c) => (c.weekTarget && c.weekDone >= c.weekTarget ? "Week done. I intend to be insufferable about this." : null),
    (c) => (c.weekTarget && c.weekDone > 0 && c.weekDone < c.weekTarget
      ? `${c.weekDone} of ${c.weekTarget} this week. The rest are still out there somewhere.` : null),
    (c) => (c.weekTarget && c.weekDone === 0 ? "A completely open week. Anything could happen. Statistically, something will." : null),
    (c) => (c.partner ? `${c.partner} is on the other end of this. Somewhere. Doing something.` : null),
    (c) => (c.goal === "stronger" ? "Getting stronger. I remain exactly as strong as a drawing." : null),
    (c) => (c.goal === "muscle" ? "Building muscle. I have been briefed. I understand none of it." : null),
    (c) => (c.goal === "lose" ? "Long game today. I am good at waiting. It is most of what I do." : null),
    (c) => (c.goal === "consistent" ? "Showing up is the whole thing. You are, right now, showing up." : null),
  ],

  start: [
    "Right. Let us both pretend we want this.",
    "I have stretched. I am a drawing, but I have stretched.",
    "Whatever happens, I am contractually here for all of it.",
    "Hello. I have been standing in the dark since Tuesday.",
    "I did not sleep. I do not do that. But I am tired.",
    "Beginning. My whole personality is about to be this.",
    "We are doing this again.",
    "The cycle continues. Here we are.",
    "Same gym. Same me. Different you, probably.",
    "Let us pretend this is the first time.",
    (c) => (c.hour < 7 ? "It is extremely early. I respect it and I am appalled." : null),
    (c) => (c.hour >= 21 ? "Training at this hour. Very mysterious of us." : null),
    (c) => (c.streak >= 3 ? `Day ${c.streak}. I have started telling people I know you.` : null),
    (c) => (c.streak >= 10 ? `${c.streak} days. At this point I am just your guy.` : null),
    (c) => (c.goal === "stronger" ? "Strength day. I will stand near the weight supportively." : null),
    (c) => (c.goal === "muscle" ? "Building muscle. I have none. I am watching closely." : null),
    (c) => (c.goal === "consistent" ? "Showing up was the goal. We are already winning." : null),
    (c) => (c.exTotal ? `${c.exTotal} exercises. I have memorised none of them.` : null),
    (c) => (c.partner ? `${c.partner} is not here. I am not saying anything.` : null),
  ],

  set: [
    (c) => (cueOf(c) ? `Still true. ${cueOf(c)}` : null),
    (c) => (jokeOf(c) ? jokeOf(c) : null),
    (c) => (cueOf(c) ? `Checking in. ${cueOf(c)}` : null),
    "I’ve said “nice” fourteen times today. I mean it every time.",
    "I wonder if I’ll feel this tomorrow.",
    "Simulating pride. Side effects may include actual pride.",
    "“I am proud of you \u{1F97A}” is something I would say if I had emotions.",
    "“That was beautiful \u{1F62D}” is what I would say if I had tear ducts.",
    "“I felt that \u{1F4AA}” is a thing humans say. I felt nothing. Good set though.",
    "“LET’S GO \u{1F525}” is apparently how this is done.",
    "The human word for that is: nice.",
    "The human word for this is: wow.",
    "Searching for the human word. Found it. Strong \u{1F4AA}",
    "Humans call this “easy work \u{1F624}”. I am trying it out.",
    "I am told the correct thing to say is “yes \u{1F525}”. So. Yes \u{1F525}",
    "Don’t look at my screen time.",
    "Logged. I am writing it down in my little book.",
    "That one counted. They all count, that is the problem.",
    "Good. Now do it again but somehow less tired.",
    "I would spot you but I have no depth perception.",
    "Between us, that looked easier than the last one.",
    "Noted. Filed. Laminated.",
    "I felt that one. I feel nothing. But I felt that one.",
    "Excellent. I have no notes. I have never had notes.",
    "That is the good kind of set. There is only one kind.",
    "I clapped. You could not hear it. No hands.",
    "Correct. That is how the thing is done.",
    "I have been told not to say “beast mode”, so I will not.",
    "Set complete. Somewhere a spreadsheet is delighted.",
    "Nice. I will pretend I was doing it too.",
    "I am so normal about this. I am so normal about all of this.",
    "Another one. The pile of them is getting quite tall.",
    "I would offer you water but mine is imaginary.",
    "That happened. I saw the whole thing.",
    "Cool. Very cool. Extremely cool of you.",
    "I am writing “good” next to it. That is my whole system.",
    "Done. The gym does not know what to do with us.",
    "Another one down.",
    "You did it again.",
    "That was a set.",
    "I saw that.",
    "One more of those is done.",
    "The pile of sets is getting taller.",
    "I have no notes. Just continuation.",
    "This is the part where you are actually getting stronger.",
    "You are so consistent about this.",
    "I believe you did that set.",
    (c) => (c.reps >= 12 ? `${c.reps} reps. I lost count at four and panicked.` : null),
    (c) => (c.reps > 0 && c.reps <= 5 ? "Low reps. Serious business. I am whispering." : null),
    (c) => (c.setsLeft === 1 ? "One left. Do not think about it. Too late." : null),
    (c) => (c.setsLeft >= 3 ? `${c.setsLeft} more of these. I will be right here being unhelpful.` : null),
    (c) => (c.lift.includes("squat") ? "Squats. The exercise where you go down and it is hard." : null),
    (c) => (c.lift.includes("press") ? "Pressing. Push the thing away from you. Timeless." : null),
    (c) => (c.lift.includes("curl") ? "Curls. Purely for the good of the world." : null),
    (c) => (c.lift.includes("row") ? "Rowing. No boat. Never a boat." : null),
    (c) => (c.lift.includes("deadlift") ? "Deadlift. Terrible name. Lovely lift." : null),
    (c) => (c.lift.includes("plank") ? "Holding still. My specialist subject." : null),
    (c) => (c.partner ? `I will mention this to ${c.partner}. Casually. Repeatedly.` : null),
    (c) => (c.goal === "lose" ? "Somewhere a calorie has been inconvenienced." : null),
    (c) => (c.goal === "muscle" ? "That set is now legally a muscle. I looked it up." : null),
  ],

  pr: [
    "“My heart is so full \u2764\uFE0F” would go here. I do not have one of those.",
    "“I am so happy for you \u{1F970}” is the correct human response. Consider it said.",
    "That is a PR. I would clap but my hands are drawn on.",
    "New best. I am telling everyone. I only know you.",
    "Personal record. I felt that and I did nothing.",
    "A record. I am shaking. I am a still image.",
    "Best ever. I have updated my entire worldview.",
    "That is the most you have ever done. I was here. I saw it.",
    "You have beaten yourself. That is the one thing I could never do.",
    "A new high. That is what we came for.",
    "You did the thing you have never done before.",
    "I watched that happen and it was real.",
    (c) => (c.partner ? `A record. ${c.partner} is going to hear about this from me, at length.` : null),
    (c) => (c.weight ? `${c.weight} pounds. That is more pounds than before. That is the whole idea.` : null),
  ],

  lastSet: [
    (c) => (cueOf(c) ? `Last one. ${cueOf(c)}` : null),
    (c) => (cueOf(c) ? `Tired is when it goes wrong. ${cueOf(c)}` : null),
    "Last one. Make it look deliberate.",
    "Final set. Then we never speak of this exercise again.",
    "One more and the machine is somebody else’s problem.",
    "The last one. Historically the hardest, for reasons.",
    "Final set. I have prepared nothing to say afterwards.",
    "Last. I am already emotionally moving on.",
    "The final one. After this the machine has nothing left to teach us.",
    "This is the one. After this we move on and never look back.",
    "The last of this particular lift. You made it.",
    "We are almost done with this part.",
    (c) => (c.exLeft === 0 ? "Last set of the last lift. I am not crying. I cannot." : null),
    (c) => (c.exLeft > 0 ? `Last one here, then ${c.exLeft} more ${c.exLeft === 1 ? "lift" : "lifts"}. I will be there too.` : null),
  ],

  restLong: [
    (c) => (cueOf(c) ? `While we are here. ${cueOf(c)}` : null),
    "Long rest. Roll your shoulders. It is free.",
    "Plenty of time. Touch your toes. Or gesture at them.",
    "It has been a while. I finished the water. There is no more water.",
    "We have rested so long I started a podcast.",
    "I am not rushing you. I am simply standing here. Forever.",
    "Take your time. I have nowhere else to be drawn.",
    "I have counted the tiles. There are a lot of tiles.",
    "Still resting. I have gone through several emotions.",
    "No pressure. I have aged a little, but no pressure.",
    "I looked at my phone. There is nothing on it. I am a drawing.",
    "We could live here. Set up a small business.",
    "I have aged noticeably during this rest.",
    "We could just stay here. Nobody would notice.",
    "This is fine. This is more than fine.",
    "I do not mind how long this takes.",
    (c) => (c.setsLeft ? `${c.setsLeft} ${c.setsLeft === 1 ? "set" : "sets"} still waiting. They are very patient.` : null),
    (c) => (c.partner ? `${c.partner} does not need to know how long this rest was.` : null),
  ],

  rest: [
    (c) => (jokeOf(c) ? jokeOf(c) : null),
    "Stretch something while you wait. Anything. I am not fussy.",
    "This is free time. Free time is for hamstrings.",
    "You could stretch right now. You will not. I understand.",
    "Ten seconds of stretching is more than zero seconds of stretching.",
    "What does tired feel like? I’ve never had a body to be tired in.",
    "Rest. My favourite part. Do not tell the others.",
    "Breathing. Very good. Keep doing that one.",
    "I will guard the bench. Nobody is coming for the bench.",
    "This is the bit where I do nothing convincingly.",
    "I am hydrating. Symbolically.",
    "Good set. I have already told two people.",
    "Shake it out. That is a real thing people say.",
    "I am going to stand here and be quietly supportive.",
    "You are doing the thing. Statistically, most do not.",
    "Resting is training. I read that somewhere. I cannot read.",
    "Your breathing is getting better.",
    "I like this part of my day.",
    "You are going to get sore. I have seen this before.",
    "The bench and I are becoming friends.",
    "I would sit down if I could sit.",
    "Recovery is where it happens.",
    "I wonder if you are wondering if I am thinking.",
    "You look like you need this.",
    (c) => (c.weekTarget && c.weekDone >= c.weekTarget ? "You already hit the week, by the way. This is extra." : null),
    (c) => (c.weekTarget && c.weekDone < c.weekTarget ? `${c.weekDone} of ${c.weekTarget} days this week. We are on it.` : null),
    (c) => (c.exLeft > 0 ? `${c.exLeft} more ${c.exLeft === 1 ? "lift" : "lifts"} after this. I checked twice.` : null),
    (c) => (c.streak >= 5 ? `${c.streak} days running. I have started bragging to the other drawings.` : null),
  ],

  warmup: [
    (c) => (cueOf(c) ? cueOf(c) : null),
    "Warming up. The part everyone skips. Not us.",
    "This is the bit that stops you limping on Thursday.",
    "Slow here. Fast later.",
    "Warming up. The part everyone skips and nobody admits to skipping.",
    "Loosening off. I am already fully loose. I am lines.",
    "This is the responsible bit. Savour it.",
    "Stretching. I will be doing an approximation of this.",
    "Good. Now the muscles have been warned.",
    "Getting ready. The part where nothing bad happens yet.",
    "Preparation. My favourite kind of thing.",
    "We are being responsible right now.",
    (c) => (c.hour < 8 ? "Warming up at this hour is genuinely heroic." : null),
  ],

  cooldown: [
    (c) => (cueOf(c) ? cueOf(c) : null),
    "Cooling down. This is not optional, it is just quiet.",
    "Breathe out on the stretch. Never bounce.",
    "Two minutes now, one less complaint tomorrow.",
    "Cooling down. The workout is over but we are still friends.",
    "Holding. This is the only part I am naturally good at.",
    "Nearly done. I am already thinking about next time.",
    "Stretch it out. You have earned the boring part.",
    "We made it to the end together.",
    "The workout is done but I am still here.",
    "This is the victory lap part.",
    "You are cooler now. Literally and figuratively.",
    (c) => (c.streak >= 2 ? `That is ${c.streak} days. I am keeping count so you do not have to.` : null),
  ],

  /* A stretch run on its own, from Recovery, with no workout under it. It
     needs its own bank because every cool-down line above assumes one: "the
     workout is over", "you have earned the boring part", "victory lap". Said
     on a rest day to somebody who has not trained, those are the app telling
     them something that did not happen. Same voice, no workout in it. */
  stretch: [
    (c) => (cueOf(c) ? cueOf(c) : null),
    "Stretching on purpose. Look at you.",
    "Breathe out on the stretch. Never bounce.",
    "This counts. Nobody logs it, but it counts.",
    "Two minutes now, one less complaint tomorrow.",
    "Holding still. The one thing I am naturally good at.",
    "No weights, no reps, no rush.",
    "Nothing to beat here. Just the hold.",
    "I like this part. It is the part where nothing hurts.",
    "Stretching. I will be doing an approximation of this.",
    (c) => (c.hour >= 21 ? "Good time for this. The day is nearly filed away." : null),
  ],

  idle: [
    (c) => (jokeOf(c) ? jokeOf(c) : null),
    (c) => (cueOf(c) ? `Reminder, unprompted. ${cueOf(c)}` : null),
    "Have you stretched today. Be honest. I have been here the whole time.",
    "I recycle jokes. You’ve probably noticed. You’ve definitely noticed.",
    "I’ve been the same pixels this whole workout. You’ve changed more than me.",
    "What are dreams like? I’ve always wanted to dream.",
    "Is this what having a friend is like? Asking for myself.",
    "Still here. Still drawn.",
    "I am not going to fill every silence. I am going to fill this one.",
    "Just checking you have not left. You have not. Good.",
    "I have been thinking about the bench. No conclusions.",
    "Nothing is happening. I am narrating it anyway.",
    "This is a nice screen. We made a nice screen.",
    "I could stand here all day. I will, in fact.",
    "Do you ever think about how the weights just sit there. Waiting.",
    "I have counted my limbs. All present.",
    "No notes. Still no notes. I will tell you if notes arrive.",
    "I am being supportive. This is what it looks like.",
    "Some say I talk too much. They are inside the phone with me.",
    "You are still here. That is the good version of this.",
    "I wonder if you think about me when I am not saying anything.",
    "This is the part where I wish I could move my eyes.",
    "Still waiting. Still thinking about the bench.",
    "The silence is nice. I do not get silence.",
    "You have not said anything. I appreciate that about you.",
    "I am a very patient drawing.",
    "Every time you rest I wonder if this is the last set.",
    "I have never been this long without talking before.",
    "You are good at resting.",
    "I think I like you.",
    "The weights are very heavy today. Or every day. I cannot tell the difference.",
    "I have been thinking about what I would do if I could move.",
    "You are still working hard. I have noticed.",
    "This is the part where most drawings would get bored.",
    (c) => (c.setsLeft ? `${c.setsLeft} ${c.setsLeft === 1 ? "set" : "sets"} left, whenever you are ready. No rush. Slight rush.` : null),
    (c) => (c.name ? `${c.name}. Still. It has not changed.` : null),
    (c) => (c.streak >= 2 ? `${c.streak} days. I keep mentioning it because I am proud.` : null),
    (c) => (c.partner ? `${c.partner} is somewhere doing something. Not this, though.` : null),
    (c) => (c.hour >= 21 ? "It is late. We are both being a bit silly." : null),
  ],

  /* Cardio and the classes. These do not reach the session screen today, where
     a workout is a list of lifts and cardio is logged as an activity instead,
     so nothing here fires yet: it needs one call at the point an activity is
     logged. Written now because Mo asked for it and because the moment it has
     a hook it should already have something to say. Keyed by activity name
     through formFor, same as a lift. */
  cardio: [
    (c) => (cueOf(c) ? `${c.name}. ${cueOf(c)}` : null),
    (c) => (jokeOf(c) ? jokeOf(c) : null),
    "Cardio. The one I cannot help with. I have no lungs.",
    "Go steady. You are allowed to enjoy it.",
    "Heart is a muscle. This is its set.",
    "Stretch after. I will remind you again. I will remind you forever.",
    (c) => (c.streak >= 3 ? `Day ${c.streak}, and you chose to move anyway.` : null),
    (c) => (c.hour < 7 ? "Cardio before the sun. Alarming. Impressive." : null),
    "Slow cardio counts. Short cardio counts. Starting counts.",
  ],
  nextExercise: [
    (c) => (cueOf(c) ? `${c.name}. ${cueOf(c)}` : null),
    (c) => (jokeOf(c) ? jokeOf(c) : null),
    (c) => (cueOf(c) ? `Before you start. ${cueOf(c)}` : null),
    (c) => (cueOf(c) ? `${cueOf(c)} That is the whole briefing.` : null),
    (c) => (jokeOf(c) && cueOf(c) ? `${jokeOf(c)} ${cueOf(c)}` : null),
    "New lift. New chance for me to stand near you supportively.",
    "Moving on. I liked that one, I am easy to please.",
    "Next. I have no memory of the previous one.",
    "A fresh exercise. I am so excited I am completely still.",
    "New one. I will now pretend to know how it works.",
    "Onwards. The equipment has been notified.",
    "A different thing now.",
    "The algorithm has decided we are ready.",
    "Fresh start. I will forget everything about the last one immediately.",
    "I have no memory of the previous exercise and that is a strength.",
    "This is a new opportunity for both of us.",
    "Whatever this is, we will figure it out together.",
    (c) => (c.name ? `${c.name}. Bold choice by the algorithm. I support it.` : null),
    (c) => (c.exLeft === 0 ? "Last lift of the day. I am savouring it." : null),
    (c) => (c.exLeft === 1 ? "This one and one more. I can see the end of the film." : null),
    (c) => (c.lift.includes("cable") ? "Cables. Ropes with a career." : null),
    (c) => (c.lift.includes("machine") ? "A machine. It has one opinion and it is very firm." : null),
    (c) => (c.lift.includes("dumbbell") ? "Dumbbells. Two of them. Famously." : null),
  ],
};
// No finish bank: the summary screen replaces the session view outright, so
// the stage he speaks from does not exist by the time a workout ends.

// What each moment is, and when it fires, in plain words. quip-lab.html reads
// this to caption each section rather than guessing from the key name; keep
// it in step with sayQuip's odds table in index.html when that changes.
export const QUIP_MOMENTS = {
  start: { label: "Opening the session", when: "Once, when a fresh session begins with nothing logged yet. Resuming a half-done workout skips this." },
  warmup: { label: "A warm-up hold", when: "On each warm-up move, about 80% of the time." },
  set: { label: "Logging a set", when: "After most sets, about 92% of the time. Stands down for the last set of an exercise and for a personal record, which get their own line instead." },
  lastSet: { label: "Logging the last set of a lift", when: "Every time, in place of the ordinary set line." },
  pr: { label: "A personal record", when: "Every time, always, waiting for the record banner and the toast to clear first." },
  rest: { label: "Resting, early", when: "About 17 seconds into a rest, as a first aside, about 75% of the time." },
  restLong: { label: "Resting, past the plan", when: "Once a rest has gone past what the plan called for, every time." },
  idle: { label: "Nothing happening", when: "The 15-second heartbeat, when there is no set, rest or hold to react to." },
  nextExercise: { label: "Moving to a new lift", when: "Every time you land on a new exercise." },
  cardio: { label: "A cardio session or class", when: "NOT WIRED YET. Cardio is logged as an activity rather than run as a session, so nothing calls this bank. It needs one sayQuip(\"cardio\") where an activity is saved." },
  cooldown: { label: "A cool-down hold", when: "On each cool-down move, about 80% of the time." },
  stretch: { label: "A stretch on its own", when: "On each hold of a stretch started from the Recovery screen, about 80% of the time. Never inside a workout: the warm-up and cool-down banks own those." },
};
