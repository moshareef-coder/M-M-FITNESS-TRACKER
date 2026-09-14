// Fit Together: what the figure says during a session.
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
// When in doubt he is the idiot in the scene, never you. He also never gives
// form or medical advice, because a joke that is also wrong instruction is
// worse than no joke.
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
export const QUIPS = {
  start: [
    "Right. Let us both pretend we want this.",
    "I have stretched. I am a drawing, but I have stretched.",
    "Whatever happens, I am contractually here for all of it.",
    "Hello. I have been standing in the dark since Tuesday.",
    "I did not sleep. I do not do that. But I am tired.",
    "Beginning. My whole personality is about to be this.",
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
    "Don&rsquo;t look at my screen time.",
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
    "I have been told not to say &ldquo;beast mode&rdquo;, so I will not.",
    "Set complete. Somewhere a spreadsheet is delighted.",
    "Nice. I will pretend I was doing it too.",
    "I am so normal about this. I am so normal about all of this.",
    "Another one. The pile of them is getting quite tall.",
    "I would offer you water but mine is imaginary.",
    "That happened. I saw the whole thing.",
    "Cool. Very cool. Extremely cool of you.",
    "I am writing &ldquo;good&rdquo; next to it. That is my whole system.",
    "Done. The gym does not know what to do with us.",
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
    "That is a PR. I would clap but my hands are drawn on.",
    "New best. I am telling everyone. I only know you.",
    "Personal record. I felt that and I did nothing.",
    "A record. I am shaking. I am a still image.",
    "Best ever. I have updated my entire worldview.",
    "That is the most you have ever done. I was here. I saw it.",
    (c) => (c.partner ? `A record. ${c.partner} is going to hear about this from me, at length.` : null),
    (c) => (c.weight ? `${c.weight} pounds. That is more pounds than before. That is the whole idea.` : null),
  ],

  lastSet: [
    "Last one. Make it look deliberate.",
    "Final set. Then we never speak of this exercise again.",
    "One more and the machine is somebody else&rsquo;s problem.",
    "The last one. Historically the hardest, for reasons.",
    "Final set. I have prepared nothing to say afterwards.",
    "Last. I am already emotionally moving on.",
    (c) => (c.exLeft === 0 ? "Last set of the last lift. I am not crying. I cannot." : null),
    (c) => (c.exLeft > 0 ? `Last one here, then ${c.exLeft} more ${c.exLeft === 1 ? "lift" : "lifts"}. I will be there too.` : null),
  ],

  restLong: [
    "It has been a while. I finished the water. There is no more water.",
    "We have rested so long I started a podcast.",
    "I am not rushing you. I am simply standing here. Forever.",
    "Take your time. I have nowhere else to be drawn.",
    "I have counted the tiles. There are a lot of tiles.",
    "Still resting. I have gone through several emotions.",
    "No pressure. I have aged a little, but no pressure.",
    "I looked at my phone. There is nothing on it. I am a drawing.",
    "We could live here. Set up a small business.",
    (c) => (c.setsLeft ? `${c.setsLeft} ${c.setsLeft === 1 ? "set" : "sets"} still waiting. They are very patient.` : null),
    (c) => (c.partner ? `${c.partner} does not need to know how long this rest was.` : null),
  ],

  rest: [
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
    (c) => (c.weekTarget && c.weekDone >= c.weekTarget ? "You already hit the week, by the way. This is extra." : null),
    (c) => (c.weekTarget && c.weekDone < c.weekTarget ? `${c.weekDone} of ${c.weekTarget} days this week. We are on it.` : null),
    (c) => (c.exLeft > 0 ? `${c.exLeft} more ${c.exLeft === 1 ? "lift" : "lifts"} after this. I checked twice.` : null),
    (c) => (c.streak >= 5 ? `${c.streak} days running. I have started bragging to the other drawings.` : null),
  ],

  warmup: [
    "Warming up. The part everyone skips and nobody admits to skipping.",
    "Loosening off. I am already fully loose. I am lines.",
    "This is the responsible bit. Savour it.",
    "Stretching. I will be doing an approximation of this.",
    "Good. Now the muscles have been warned.",
    (c) => (c.hour < 8 ? "Warming up at this hour is genuinely heroic." : null),
  ],

  cooldown: [
    "Cooling down. The workout is over but we are still friends.",
    "Holding. This is the only part I am naturally good at.",
    "Nearly done. I am already thinking about next time.",
    "Stretch it out. You have earned the boring part.",
    (c) => (c.streak >= 2 ? `That is ${c.streak} days. I am keeping count so you do not have to.` : null),
  ],

  idle: [
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
    (c) => (c.setsLeft ? `${c.setsLeft} ${c.setsLeft === 1 ? "set" : "sets"} left, whenever you are ready. No rush. Slight rush.` : null),
    (c) => (c.name ? `${c.name}. Still. It has not changed.` : null),
    (c) => (c.streak >= 2 ? `${c.streak} days. I keep mentioning it because I am proud.` : null),
    (c) => (c.partner ? `${c.partner} is somewhere doing something. Not this, though.` : null),
    (c) => (c.hour >= 21 ? "It is late. We are both being a bit silly." : null),
  ],

  nextExercise: [
    "New lift. New chance for me to stand near you supportively.",
    "Moving on. I liked that one, I am easy to please.",
    "Next. I have no memory of the previous one.",
    "A fresh exercise. I am so excited I am completely still.",
    "New one. I will now pretend to know how it works.",
    "Onwards. The equipment has been notified.",
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
  cooldown: { label: "A cool-down hold", when: "On each cool-down move, about 80% of the time." },
};
