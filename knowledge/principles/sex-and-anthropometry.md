# Sex and anthropometric considerations

What actually differs by sex and body proportions is narrower than gym folklore
suggests. The goal here is to apply what's genuinely supported and avoid
baking in assumptions that aren't.

## What the evidence actually shows on sex differences

- **Hypertrophy response is equal.** A systematic review and meta-analysis
  (Roberts, Nuckols & Krieger, 2020) found no significant difference between
  males and females in muscle growth from the same training protocol (effect
  size 0.07, not significant). Muscle doesn't grow differently by sex when
  the stimulus is the same.
- **Relative upper-body strength gains actually favor females.** The same
  meta-analysis found a significant effect favoring females for relative
  upper-body strength gains — untrained women may have more room to improve
  relative upper-body strength than untrained men do. Lower-body strength
  gains showed no significant difference either way.
- **Some evidence of greater fatigue resistance in females**, at least
  within a session — a bench press fatigue study found women fatigued more
  slowly across multiple sets and recovered faster between sets than men,
  despite a comparable relative workload. This is acute-session evidence,
  not yet a settled finding about long-term training adaptation — a 16-week
  training study found sex differences in strength adaptation for bench
  press specifically, but not in fatigue-resistance adaptation over time.
  Treat this as a real but still-developing area, not a hard rule.
- **Menstrual cycle effects are plausible but inconsistent.** Some evidence
  suggests larger strength/muscle gains during the follicular phase and
  slower recovery during the luteal phase, but study quality and findings
  vary enough that this shouldn't be hard-coded into programming — better
  as optional self-logged context a user can factor in themselves.

## What anthropometry actually changes

- **Limb and torso proportions do influence squat and deadlift mechanics.**
  A longer femur relative to torso/tibia increases forward trunk lean and
  hip moment arm, making depth more mechanically demanding. A longer tibia
  allows a more upright torso. Longer arms favor conventional deadlift
  (shorter bar path); shorter arms favor sumo. Real biomechanics, not myth.
- **But it's commonly over-blamed.** A detailed review (Brookbush Institute)
  found that "long femurs" is frequently a misdiagnosis for what's actually
  a modifiable limiter — ankle dorsiflexion, motor control, or stance
  selection. Anthropometry sets a real range, but most people who think
  their bone structure is capping their squat depth are running into a
  fixable mobility or technique issue first.
- **Height changes perceived difficulty independent of "skill."** Taller
  lifters move the bar/torso through more absolute distance and generate
  more knee-extensor torque demand per rep — squats are mechanically harder
  for tall lifters at the same relative load, which is a real biomechanical
  fact, not a sign they're behind.
- **Bodyweight matters most for benchmarks and dosing**, not exercise
  selection — bodyweight-ratio strength standards (Cluster: get stronger)
  and calorie math (weight-loss-training.md, calorie-math.mjs) already
  handle this; it doesn't need a separate mechanism here.

## How this should shape a generated program

- Don't scale down volume or load targets for women by default — hypertrophy
  response is equal, and relative upper-body strength gains may run ahead of
  men's early on. Program from the same volume-landmarks.md and
  progressive-overload.md rules regardless of sex.
- Use self-reported limb/torso proportions (if collected) only as a starting
  suggestion for stance width or deadlift variant (sumo vs. conventional),
  never as a hard depth ceiling — logged comfort and performance should
  override the initial suggestion quickly.
- For taller users, don't flag slower squat progress or more forward lean as
  a fault — it's expected mechanics. Coach ankle mobility and stance before
  assuming anatomy is the limiter, per the research above.
- Menstrual cycle tracking, if ever added, should be opt-in context a user
  can view alongside their own logged performance — not a rule that
  auto-adjusts their programming, given how inconsistent the evidence is.
