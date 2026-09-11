# Warming up and cooling down

The engine ships a timed dynamic warm-up before every session and a timed static cool-down
after it (`engine/mobility.mjs`, 2026-09-10). It picks moves by muscle group coverage
alone, which means a squat day and a bench day get warm-ups chosen by the same rule and, in
practice, nearly the same moves. Mo asked two things: give people the stretching that suits
the workout they are actually about to do, and tell him honestly how long the block should
be, because his instinct says ten to thirty minutes.

This file is the evidence for both. Roughly forty searches and fetches on 2026-09-11,
mostly PubMed and the primary journals. The short version is at the bottom of section 6 and
in section 9.

## What I found by running the current engine

Before the research, the actual output. `pickBlock` run against the six day types in
`plan.mjs` SLOTS, beginner, no pain, no missing kit:

| Day | Warm-up | Moves |
|---|---|---|
| fullBody | 260s | Toy Soldier Kicks, Prone Press-Up, Hip Circles, Cross-Body Arm Swings, Straight-Arm Band Pulldown, Lateral Leg Swings |
| push | 165s | Arm Circles, Elbow Circles, Cross-Body Arm Swings, Shoulder Rolls, Wrist Circles, Band Pull-Apart |
| pull | 180s | Wall Slides, Elbow Circles, Wrist Circles, Shoulder Rolls, Arm Circles, Band Pull-Apart |
| legs | 270s | Toy Soldier Kicks, Hip Circles, Prone Press-Up, Ankle Circles, Lateral Leg Swings, **Elbow Circles** |
| upper | 180s | Wall Slides, Elbow Circles, Arm Circles, Cross-Body Arm Swings, Shoulder Rolls, Wrist Circles |
| lower | 270s | Squat to Stand, Hip Circles, Torso Twists, Ankle Circles, Lateral Leg Swings, **Elbow Circles** |

Five things are wrong here and they are all structural, not bad luck:

1. **Leg day ends with elbow circles.** Once every target group is covered the picker keeps
   spending budget on "the next best move", and the next best move for a day with no groups
   left to cover is whichever cheap thing sorts first. Elbow circles before a squat is noise
   wearing the costume of a warm-up.
2. **Push, pull and upper are the same warm-up.** Arm circles, shoulder rolls, wrist
   circles, in a different order. That is Mo's complaint, reproduced exactly.
3. **Half the budget goes unused on upper-body days** (165 to 180s of a 300s budget) while
   leg days get 270s, because the upper library's moves are short and coverage stops early.
4. **The leg-day cool-down leaves the glutes out.** Figure Four is 40s per side, so 80s. By
   the time the picker reaches it there are 65s left, it does not fit, it is skipped, and
   Knees-to-Chest (35s, for a group the day did not even work) is taken instead. The rule
   "skip what does not fit, then pad with what does" trades the right move for the wrong one
   on purpose.
5. **Nothing in either block is the first lift.** The single best-evidenced element of a
   lifting warm-up is a light set of the thing you are about to do, and the engine has no
   way to express it. Section 5.

A parallel change landing while I wrote this has added a `prepares` field to the stretching
library and a `patterns` argument to `pickBlock`. That is the right fix and section 4 is the
table it needs. Notes on the tagging at the end of section 4.

## 1. Does warming up do anything

Two questions get run together and have different answers.

### Performance: yes, and the mechanism is temperature

Fradkin, Zazryn and Smoliga (2010, *J Strength Cond Res* 24(1):140-148) reviewed 32 studies
of good methodological quality and found warm-up improved performance in **79% of the
outcomes examined**. No study found harm from a reasonable warm-up.

The mechanism is narrower than the claim usually made for it. Wilson, Nunes and Blazevich
(2025, *J Sport Health Sci*), a meta-analysis with meta-regression over 33 studies and 921
participants, separated what warming up changes from what it does not:

- **Rate of force development rises about 3.7% per degree C** of muscle temperature for
  voluntary contractions (ES 0.28, p<0.001) and 3.2% per degree C for evoked ones (ES 0.65).
- **Peak force does not move at all**: -0.2% per degree C voluntary, not significant.
- **Passive heating worked as well as active warm-up.** The temperature is doing the work,
  not the movement.

So warming up makes you *quicker*, not *stronger*. Bishop (2003, *Sports Med* 33(6)) gives
the underlying physiology: Q10 for maximal muscle power is about 2.0 between 31 and 37
degrees C but 6.9 between 22 and 26, so the colder you are the more a warm-up buys. Reduced
muscle stiffness, faster nerve conduction, shorter electromechanical delay, higher baseline
oxygen consumption.

*Confidence: high that warming up helps performance. High that the effect runs through
temperature and rate of force development rather than through maximum strength.*

A practical consequence the app should absorb: the coldest, stiffest user gets the most out
of the block, and the person who cycled to the gym needs less of it than the person who
came off a sofa.

### Injury prevention: yes for warm-up programmes, no for stretching

This is where the folklore is.

- **Lauersen, Bertelsen and Andersen (2014, *Br J Sports Med* 48(11):871-877)**, 25 RCTs,
  26,610 people, 3,464 injuries. Every category of exercise intervention produced favourable
  estimates **except stretching**. Strength training was the strongest.
- **FIFA 11+**, the best-studied warm-up programme in the world, cuts overall injury
  incidence by roughly 30 to 46% depending on the review, hamstring injuries by around 66%
  and ankle injuries by 33%. It contains running, strength, plyometrics and balance. It
  contains essentially no static stretching.
- **Andersson, Bahr, Clarsen and Myklebust (2017, *Br J Sports Med* 51(14):1073-1080)**, a
  cluster-randomised trial in 660 elite handball players across 45 teams. A shoulder
  programme of internal rotation range, external rotation strength, scapular strength and
  thoracic mobility, delivered as part of the warm-up three times a week, cut shoulder
  problems by 28% (OR 0.72). Again: strength and range work, not held stretches.
- **Behm, Blazevich, Kay and McHugh (2016, *Appl Physiol Nutr Metab* 41(1):1-11)** state it
  directly: static stretching and PNF had **no clear effect on all-cause or overuse
  injuries**, and no data exist at all for dynamic stretching.

The honest framing for us: the injury-protective ingredient is the loading, not the
lengthening. Our users get the loading from the programme itself. The warm-up's job is
performance on the first set and getting the joints through the range the session is about
to demand, and we should not sell it as injury prevention.

*Confidence: high. This is the most consistent finding in the whole file.*

## 2. Static stretching before lifting: how real is the deficit

Our engine puts dynamic before and static after. That call is correct in direction and much
weaker in magnitude than we assumed.

The literature, oldest to newest:

| Source | Scope | Finding |
|---|---|---|
| Kay and Blazevich (2012) | Review of acute static stretch and maximal performance | No meaningful strength decrease below 30s, or at 30 to 45s. Deficits appear past 60s |
| Simic, Sarabon and Markovic (2013, *Scand J Med Sci Sports*) | 104 studies, 61 strength / 12 power / 57 explosive data points | Pooled effects of **-0.10 strength, -0.04 power, -0.03 explosive**. Statistically significant, practically tiny |
| Behm, Blazevich, Kay, McHugh (2016) | Systematic review, 125+ studies | Static **-3.7%**, dynamic **+1.3%**, PNF **-4.4%**. Dose response: **-4.6% at 60s or more** per muscle group vs **-1.1% under 60s**. Static gave a **+2.2% benefit at long muscle lengths**. Effects measured 3 to 5 minutes after stretching, usually with nothing in between; **when dynamic activity followed the stretch, no clear effect remained** |
| Warneke and Lohmann (2024, *J Sport Health Sci*) | 83 studies, 2,012 participants, 400+ effect sizes | Pooled **ES -0.21**. Under 60s per bout: ES -0.13 to -0.18, mostly non-significant. **60s or more: ES -0.84**. Jumping, sprinting and throwing showed no impairment at all. Their words: "rigorous avoidance of any type of stretching before performance seems to be without evidence" |
| Konrad et al. (2021, *Int J Environ Res Public Health*) | 8 studies, 165 subjects, hip flexors specifically | **Up to 120s of hip flexor stretching has no effect or a positive one.** Only 270 to 480s produced impairment (-3.59%) |

Read together this says something more useful than "static bad, dynamic good":

1. **The variable that matters is seconds per muscle, not the word static.** The cliff is at
   about 60s in a single bout. Everything our library holds is 25 to 45s.
2. **Dynamic work afterwards erases what is left of it.** Behm's review is explicit, and it
   is the reason a real warm-up is a sequence rather than a menu.
3. **Not every muscle behaves the same.** The plantar flexors are where the deficit is
   reliably found. The hip flexors, the tissue most in need of lengthening before a squat or
   a lunge in a desk-bound population, tolerate up to two minutes with no cost.
4. The remaining honest caution is **maximum strength testing**, which is the one place the
   deficit is consistent. A one-rep-max attempt should not be preceded by long static holds.

**What this changes for us.** The dynamic-before, static-after rule is a safe default and I
would keep it as the default. But treating the static pool as forbidden before training is
over-reading the evidence, and it costs us the one thing a pattern-specific warm-up most
needs: a 30 to 40 second hip flexor stretch before a squat or lunge day, a short pec stretch
before a press. The rule to encode is not "no statics before" but **"no single hold longer
than 45s before training, and always dynamic work after the last hold."**

*Confidence: high on the duration threshold, which four independent reviews agree on.
Medium-high on the claim that short pre-training statics are free, because it rests on the
subgroup analyses rather than on trials designed to test it. Low on any claim that a
specific static stretch improves the lift that follows it: nobody has tested that.*

## 3. The structure: RAMP

Ian Jeffreys, *Warm-up revisited: the RAMP method of optimising performance preparation*,
UKSCA *Professional Strength and Conditioning* issue 6 (2007), pp 12-18, later the book *The
Warm-Up* (Human Kinetics, 2019). It is the UKSCA's standard and appears in NSCA material.
McGowan, Pyne, Thompson and Rattray (2015, *Sports Med* 45(11):1523-1546) adopt it in their
review of warm-up strategies, collapsing it to three stages by merging Activate and Mobilise.

The four phases, in order, with what each is for:

1. **Raise.** Lift muscle and core temperature, heart rate, blood flow, joint fluid
   viscosity. Low-intensity continuous movement. This is the phase with the actual mechanism
   behind it (section 1) and the phase our engine does not have at all.
2. **Activate.** Wake the muscles the session depends on and which usually sleep: glutes,
   scapular stabilisers, rotator cuff, deep core. Low load, high intent, not fatiguing.
3. **Mobilise.** Take the specific joints through the specific ranges the session needs.
   This is dynamic mobility, not held stretching, and it is the phase our engine actually
   implements.
4. **Potentiate.** Progressive, increasingly specific, increasingly intense work leading
   into the first working set. For a lifter this is the ramp-up sets. Section 5.

Activate and Mobilise are usually interleaved rather than sequential, which is why McGowan
writes it as R, AM, P.

I looked for a better-supported structure and there is not one. What exists is a 2024
quasi-experimental study in competitive male footballers showing RAMP improved speed, agility
and endurance versus a conventional warm-up, plus broad practitioner adoption. There is no
trial isolating the ordering itself.

*Confidence: medium on RAMP as a validated framework. High that this ordering beats a
shuffled list, because each phase individually has support and each phase's output is the
next phase's input: you cannot mobilise a cold joint and you cannot potentiate an unmobilised
one.*

The engine-relevant part: **the block is ordered, and the order is not cosmetic.** Today
`pickBlock` returns moves ranked by coverage, which means the deepest, slowest move can land
first, cold. A phase tag on each entry fixes that.

## 4. What should precede each day type

This is the core section. Below: per movement pattern, then per day type.

A caveat I want on the record before the table. Sections 1, 2, 7 and 8 rest on
meta-analyses. **This section does not.** There is no randomised trial showing that ankle
mobilisation before squats improves squats. What exists is:

- Descriptive biomechanics. Macrum et al. (2012, *J Sport Rehabil*) restricted ankle
  dorsiflexion during a double-leg squat and produced increased knee valgus and medial knee
  displacement, decreased quadriceps activation and increased soleus activation. Dill et al.
  (2014, *J Athl Train*) found altered knee and ankle kinematics during squatting in people
  with limited weight-bearing-lunge dorsiflexion. Ankle dorsiflexion range is associated with
  squat depth in both sexes.
- Acute-range evidence that stretching and mobilising do increase joint range, lasting
  **under 30 minutes** (Behm 2016), which is exactly the window a warm-up needs.
- The Andersson 2017 shoulder trial, which is a real RCT and which is built out of exactly
  this logic: identify the restriction the movement demands, train it in the warm-up.
- Coaching consensus, which is broad and consistent but is consensus.

So the chain "this joint limits this pattern" is well supported, "mobilising it opens the
joint for half an hour" is well supported, and "therefore the lift goes better" is inference.
It is cheap, plausible inference with no downside, and it is a far better selection rule than
muscle-group coverage, which has no support of any kind. But I am not going to dress it up.

*Confidence: high on the joint-to-pattern mapping. Medium on the move choices. Low that any
of it measurably improves the lift.*

### By movement pattern

**squat** (back squat, goblet squat, leg press, hack squat)
- Joints and tissues: ankle dorsiflexion (talocrural, restricted by soleus and by the joint
  capsule), hip flexion with external rotation (glute max eccentric length, adductors), hip
  flexor length so the torso can stay upright, thoracic extension to hold a bar on the back,
  knee flexion under load.
- Have: Knee-to-Wall Ankle Rock, Ankle Circles, Deep Squat Hold, Squat to Stand, Hip
  Circles, Lateral Leg Swings, 90/90 Hip Switch, Cossack Squat, Half-Kneeling Hip Flexor Rock.
- Should add: **Adductor Rock Back** (quadruped, knees wide, rock to the heels) for the groin
  restriction that stops depth in wide stances. **Goblet Squat Hold with pry**, which is Deep
  Squat Hold with a load and is the single best all-in-one squat prep move if any weight is
  available.
- The minimum viable squat prep: ankles, then hips, then a bodyweight squat pattern. In that
  order.

**hinge** (deadlift, Romanian deadlift, good morning, hip thrust)
- Joints and tissues: hamstring extensibility measured at the hip with a neutral lumbar
  spine (the limiter is almost never the hamstring belly, it is tolerance plus the ability to
  keep the spine out of it), glute readiness, lat tension to keep the bar close, thoracic
  extension, lumbar segmental control.
- Have: Wall Hip Hinge Drill, Leg Swings, Toy Soldier Kicks, Inchworm Walkout, Squat to
  Stand, Standing Forward Hang, Standing Hip Airplane.
- Should add: **Glute Bridge** (the activate move for the hinge, and its absence from the
  library is the biggest single hole), **Bird Dog** (contralateral lumbar control under a
  neutral spine), **Cat-Cow** (segmental lumbar and thoracic warm, thirty seconds, near zero
  cost).
- Note: hamstring *static* stretching before a hinge is the one case where the classic
  warning has teeth, because the hamstrings are a two-joint muscle carrying eccentric load at
  long lengths. Keep hinge-day hamstring work dynamic. Save Standing Hamstring Stretch for
  the cool-down.

**horizontalPush** (bench press, dumbbell press, push-up, dip)
- Joints and tissues: pec major and pec minor length, scapular retraction and protraction
  control (serratus anterior, mid trap, rhomboid), shoulder external rotation and posterior
  cuff, thoracic extension to set the upper back, wrist extension under load, and for a bench
  press the hip flexors, because leg drive is a hinge at the hip.
- Have: Scapular Push-Up, Band Pull-Apart, Band Shoulder External Rotation, Cross-Body Arm
  Swings, Open Book Thoracic Rotation, Foam Roller Thoracic Extension, Quadruped Wrist Rocks,
  Arm Circles.
- Should add: **Prone T Raise** (we have Prone Y, and Y and T load different parts of the
  lower trap), **Wall Angel** is essentially Wall Slides and we have it.
- The minimum: thoracic extension, scapular control, cuff. Three moves, ninety seconds. This
  is also the Andersson 2017 recipe, which is the closest thing in this section to real
  evidence.

**verticalPush** (overhead press, push press, dumbbell shoulder press)
- Joints and tissues: shoulder flexion to roughly 170 to 180 degrees, thoracic extension
  (practitioner consensus is about 15 degrees of thoracic extension is needed to get a
  barbell truly overhead), latissimus and pec minor length, because both pull the arm out of
  overhead, scapular upward rotation, cervical clearance for the bar path, and anti-extension
  core control so the ribs do not flare and turn the press into a standing back bend.
- Have: Foam Roller Thoracic Extension, Wall Slides, Prone Y Raise, Chin Tucks, Band
  Shoulder External Rotation, Kneeling Lat Stretch, Arm Circles.
- Should add: **Broomstick Pass-Through** (the standard overhead range screen and drill),
  **Dead Hang** (30s, opens shoulder flexion and decompresses, needs a bar).
- Chin Tucks genuinely belongs here, which is not obvious: the bar has to pass the head and a
  forward head position is what makes people press around it.

**horizontalPull** (barbell row, dumbbell row, cable row, inverted row)
- Joints and tissues: scapular retraction and protraction through full range, thoracic
  extension and rotation, lat length, and for any bent-over row the hip hinge and the lumbar
  position that holds it.
- Have: Band Pull-Apart, Open Book Thoracic Rotation, Quadruped Thoracic Rotation, Torso
  Twists, Straight-Arm Band Pulldown, Wall Hip Hinge Drill.
- The hinge component is the part people miss. A barbell row is a hinge held isometrically
  for the length of a set, so a row day wants the hinge prep, not only the shoulder prep.

**verticalPull** (pull-up, chin-up, lat pulldown)
- Joints and tissues: shoulder flexion overhead (same restriction as vertical push), lat and
  teres major length, scapular depression and downward rotation control, thoracic extension,
  elbow and grip endurance, and the forearm flexors, which is where a set of pull-ups
  actually ends for most beginners.
- Have: Straight-Arm Band Pulldown, Wall Slides, Foam Roller Thoracic Extension, Prone Y
  Raise, Kneeling Lat Stretch, Wrist Circles, Shoulder Rolls.
- Should add: **Scapular Pull-Up** (hang, depress the shoulder blades without bending the
  elbows), which is to the pull-up what the Scapular Push-Up is to the bench and is the
  obvious missing twin. **Dead Hang** again.

**lunge** (split squat, walking lunge, step-up, Bulgarian split squat)
- Joints and tissues: hip flexor and rectus femoris length on the trailing leg, which is the
  limiter for almost every desk worker, frontal-plane hip control (glute medius), single-leg
  balance and ankle stability on the front leg, front-leg dorsiflexion, knee tolerance.
- Have: Half-Kneeling Hip Flexor Rock, World's Greatest Stretch, Walking Lunge with Twist,
  Hip Circles, Knee-to-Wall Ankle Rock, Standing Hip Airplane, Cossack Squat, Prone Scorpion
  Stretch.
- Should add: **Lateral Band Walk** or a banded monster walk, the standard glute medius
  activation move and the only frontal-plane preparation in a library that is entirely
  sagittal. **Half-Kneeling Balance Hold** for the balance component.
- The Konrad 2021 hip flexor finding means the static Kneeling Hip Flexor Stretch is safe
  before a lunge day at up to two minutes. This is the clearest case in the whole file where
  our static-after-only rule is costing us the right move.

**core**
- Depends entirely on what the core slot contains. Anti-extension (plank, dead bug),
  anti-rotation (Pallof), rotation (Russian twist), flexion (crunch) want different prep.
- Joints and tissues: lumbar segmental motion, thoracic rotation, the ability to find a
  neutral pelvis at all.
- Have: Pelvic Tilts, Torso Twists, Quadruped Thoracic Rotation, Inchworm Walkout, Scapular
  Push-Up.
- Should add: **Dead Bug** and **Cat-Cow**. Both are prep and exercise at once.
- Honest note: the core slot is an accessory at the end of the session. By then the person is
  warm. Core prep in the warm-up is close to pointless and should be the first thing dropped
  when the budget is tight.

**isolation** (curls, extensions, raises, calf raises, shrugs)
- Joints and tissues: whichever single joint is involved, and nothing else.
- Have: Elbow Circles, Wrist Circles, Quadruped Wrist Rocks for arms; Ankle Circles and
  Knee-to-Wall for calves; Band Pull-Apart and Band Shoulder External Rotation for delts.
- **The real answer is that isolation work needs no warm-up block at all, only one light set
  of the exercise.** This matters more as an exclusion than an inclusion: on a push day with
  three isolation slots, the isolation pattern should not be allowed to pull three moves into
  a five-minute block. Weight patterns by slot role, not by slot count. Section 9.

### By day type

Taking `SLOTS` from `plan.mjs` and collapsing the above. Ordered by priority, so a picker
under a time budget takes from the top.

| Day | Patterns present | What it actually needs, in order |
|---|---|---|
| **legs** | squat, hinge, lunge, isolation(calves), core | 1. Ankles (Knee-to-Wall Ankle Rock). 2. Hips into flexion and rotation (Hip Circles, 90/90 Hip Switch). 3. Hip flexor length for the lunge and the upright squat (Half-Kneeling Hip Flexor Rock). 4. Hamstrings dynamically for the hinge (Leg Swings, Toy Soldier Kicks). 5. Glute activation (**Glute Bridge**, missing). 6. Pattern rehearsal (Squat to Stand). No arms. Ever. |
| **lower** | squat, hinge, lunge, isolation(calves), core(obliques) | Same as legs, and the oblique core slot earns Torso Twists or Quadruped Thoracic Rotation at the end, not the start |
| **push** | horizontalPush, verticalPush, isolation x3 | 1. Thoracic extension (Foam Roller Thoracic Extension, or Open Book without a roller). 2. Scapular control (Scapular Push-Up). 3. Cuff (Band Shoulder External Rotation). 4. Overhead range (Wall Slides). 5. Pecs opened dynamically (Cross-Body Arm Swings). 6. Wrists if there is any pressing on the hands (Quadruped Wrist Rocks). Note that vertical push needs the thoracic work more than horizontal push does, so its presence should raise that move's priority |
| **pull** | verticalPull, horizontalPull, isolation(biceps, traps, forearms) | 1. Lats and overhead range (Straight-Arm Band Pulldown, Wall Slides). 2. Thoracic extension and rotation (Foam Roller Thoracic Extension, Open Book). 3. Scapular retraction and depression (Band Pull-Apart, **Scapular Pull-Up**). 4. Elbows and grip, because that is where a pull day ends (Elbow Circles, Wrist Circles). Here the arm circles are earned |
| **upper** | horizontalPush, verticalPull, verticalPush, horizontalPull, isolation x2 | The hardest day to prepare in five minutes: it asks for push and pull in both planes. Thoracic extension and rotation serves four of the six slots, so it goes first and gets two moves. Then scapular control in both directions (Scapular Push-Up plus Band Pull-Apart). Then overhead range (Wall Slides). Then cuff. Drop the arm isolation prep entirely |
| **fullBody** | squat, horizontalPush, horizontalPull, hinge, core | The widest ask and the one where coverage fails worst. Do not try to cover all five. Cover the two mains that carry the most load, which are squat and hinge, then one upper move that serves both push and pull (Open Book Thoracic Rotation or Inchworm Walkout, which is a hinge, a plank and a push prep in one move), then stop. Inchworm Walkout and World's Greatest Stretch are the two highest-value moves in the library for this day because each covers three patterns |

### Notes on the `prepares` tagging now in the library

The parallel change has tagged all 38 dynamic and mobility entries. Reading it against the
above, four tags look wrong and one gap stands out:

- `Elbow Circles -> ["isolation", "horizontalPush"]`: the horizontalPush tag will let elbow
  circles back into bench-day warm-ups. It prepares elbow isolation work and nothing else.
- `Chin Tucks -> ["verticalPush"]` is right and worth keeping, for the reason above.
- `Prone Press-Up -> ["core", "verticalPush"]`: it is a lumbar extension move. The core tag
  is fair, the verticalPush tag is a stretch.
- `Wrist Circles -> ["horizontalPush", "verticalPush", "verticalPull"]`: correct but it means
  a cheap 25s move scores three patterns and will outrank real preparation on any day with
  two pressing slots. Weight by how central the move is, not only by how many tags it carries.
- Nothing in the library is tagged for frontal-plane hip control or for glute activation,
  because no such move exists yet. That is the gap, not a tagging error.

## 5. Potentiation, which for a lifter means ramp-up sets

Yes. The warm-up should contain light sets of the first lift, and this is the part of the
block with the strongest evidence for the very next set.

**The direct finding.** Oliva, Smoliga, Tóth and Buzgó (2026, *Eur J Transl Myol*
35(1):14653) is a small pilot, eight resistance-trained men, 146 kg mean back squat, but it
tests exactly our question. They compared a general mobility-based warm-up against a
low-intensity bodyweight movement-specific warm-up replicating squat biomechanics, matched
for duration at about six to seven minutes, then measured maximal isometric squat force.

- After the **general mobility warm-up**, peak force **fell 3.8%** (p=0.004, d=1.47).
- After the **movement-specific warm-up**, it was maintained (-1.9%, not significant).

Eight people is eight people and the between-protocol difference itself was not significant.
But the direction should worry us, because the general mobility warm-up in that study is a
close description of what our engine currently ships. *Confidence: low on the magnitude, but
this is the only study I found that tests our exact design against the alternative, and it
does not favour ours.*

**The review position.** Iversen, Norum, Schoenfeld and Fimland (2021, *Sports Med*
51(10):2079-2095), a narrative review written specifically for people short of time, put it
in their key points: "Restrict the warm-up to exercise-specific warm-ups. Only prioritize
stretching if the goal of training is to increase flexibility." Their reasoning:

- General warm-up evidence for strength training is thin. Ribeiro et al. found that neither
  a general warm-up (10 min on a bike) nor a specific one (10 reps at 50% of the test load)
  changed fatigue or total repetitions at 3 sets of 80% 1RM to failure.
- A specific warm-up produced greater peak power in the high pull than a general one, and
  combining both added nothing over specific alone.
- McCrary et al.'s systematic review found strong evidence for dynamic warm-ups performed at
  over 20% of maximal effort to enhance upper-body strength and power, and no literature at
  all on warm-up for injury prevention.
- Their nuance, which matters for our beginners: **the need for a specific warm-up scales
  with load.** Above about 80% 1RM it matters. In higher rep ranges, the first few reps of
  the working set already are the specific warm-up.

**PAPE.** Post-activation performance enhancement, the heavy conditioning activity before an
explosive effort, is a different thing and we should not build it. Zheng, Gao and Song (2026,
*BMC Sports Sci Med Rehabil* 18(1):346), 33 studies with 12 in the meta-analyses, found PAPE
added to a general warm-up improved countermovement jump by 2.41 cm (95% CI 1.20 to 3.61) and
possibly change of direction, with **no significant sprint effect**. That is for trained
competitive athletes doing heavy squats before jumps. Not our users, not our product.

**What this means for the app.** Today the warm-up is a screen of stretches and then the
session starts at the working weight. The fix is a prescribed ramp on the first main lift of
each day, generated from the working load the engine already computes:

| Set | Load | Reps | Rest |
|---|---|---|---|
| 1 | Empty bar or the lightest available | 8 to 10 | 45s |
| 2 | ~50% of working weight | 5 | 45s |
| 3 | ~70% | 3 | 60s |
| 4 | ~85 to 90% | 1 to 2 | 60s, then work |

Rules: **three to four ramp sets for a main compound at or above 80% 1RM; one to two for a
second main; none for accessories and isolation.** Total cost about three to four minutes
for a main lift, and it replaces rather than adds to time, because it is the potentiate phase
of RAMP. Ramp sets carry no volume, so like the stretches they must not touch the weekly
ledger, `recovery.mjs` or `exercise_logs`.

The second lift of a session needs at most one ramp set. The body is warm by then and the
value of the ramp is mostly neural rehearsal of the specific movement.

*Confidence: high that ramp sets belong in the warm-up. Medium-high that they matter more
than the stretching does. High that they matter most on heavy, low-rep days and least on a
beginner doing sets of twelve, which is a lot of our users.*

## 6. How long, answered directly

**Dynamic warm-up: 5 to 8 minutes, default 6, plus 3 to 4 minutes of ramp sets on the first
lift.** Call it ten minutes of preparation total, of which six are in the app's timed block.

The evidence for that number:

- ACSM's guidelines: a warm-up of **at least 5 to 10 minutes** of light to moderate activity.
- Li et al. (2023, *BMC Sports Sci Med Rehabil*), a network meta-analysis of 35 studies:
  dynamic stretching ranked first for sprint (SUCRA 91.1%) and second for countermovement jump
  (83.5%), behind combined static plus dynamic (87.6%). Static stretching ranked **last on
  both** and below the control group. Their dose finding: **7 to 10 minutes of dynamic
  stretching produced the best explosive performance** (MD 2.90, 95% CI 1.07 to 4.73).
- McGowan, Pyne, Thompson and Rattray (2015): excessive warm-up duration hurts through
  accumulated fatigue and raised perceived exertion; **10 to 15 minutes is sufficient** and
  shorter warm-ups preserve energy for the session.
- Behm et al. (2016): the range gains from any acute stretching last **under 30 minutes**.
  So the warm-up has a shelf life, which argues for short and immediately before rather than
  long and thorough.

Note that the 7 to 10 minute figure is for maximising jump and sprint in athletes, not for
someone about to do three sets of eight. For a lifter, part of that time is better spent on
ramp sets, which is why I land on six minutes of block plus a ramp rather than ten minutes of
block.

**Static cool-down: 3 to 5 minutes, default 5.** Evidence in section 7, and the ceiling in
section 8: the flexibility literature's own plateau is about 10 minutes per week, and 5
minutes three or four times a week already clears it.

**Is 15 to 30 minutes right?**

No. Fifteen to thirty minutes of warm-up is roughly three to five times what the evidence
supports, it is long enough to cause the fatigue McGowan warns about, most of it would have
expired before the last working set, and on a 45-minute session it would be a third of the
training time spent not training. The number is **about six minutes before and five minutes
after**, plus three to four minutes of ramp-up sets that people will not experience as
stretching at all. The place where Mo's instinct is right is the flexibility and mobility
goal, where ten minutes a day is the plan itself and where the engine already goes to ten
(`MOBILITY_GOAL_SECONDS`).

One more argument against length, from our own research folder. `11-real-goals.md` cites the
2026 Frontiers analysis of 389,481 Fitbod users: median time to dropout 19 weeks, and the
strongest predictor of surviving the year was training frequency in the first 28 days, with
longer sessions helping adherence only in people who already trained often. A block that adds
twenty minutes to a beginner's session is not a neutral addition. It is a tax on the variable
that predicts whether they are still here in week five.

## 7. Does the cool-down do anything

Mostly not what people think, and we should say so rather than imply otherwise.

- **Herbert, de Noronha and Kamper (2011, Cochrane Review CD004577)**, 12 studies, 2,597
  participants. Stretching before, after, or before and after exercise does not produce
  clinically important reductions in delayed onset muscle soreness in healthy adults.
  Differences were small, precise and not worth having.
- **Afonso et al. (2021, *Front Physiol* 12:677581)**, 11 RCTs, 10 meta-analysed, n=229. No
  effect of post-exercise stretching on strength recovery versus passive rest (ES -0.08, CI
  -0.54 to 0.39). No effect on DOMS at 24, 48 or 72 hours (ES -0.09 to -0.24, all
  non-significant). Risk of bias high in about 70% of the studies. Their conclusion is
  unusually blunt: evidence-based recommendations on post-exercise stretching for recovery
  "should be avoided, as the (insufficient) data that is available does not support related
  claims."
- **Van Hooren and Peake (2018, *Sports Med* 48(7):1575-1595)**: active cool-downs are
  largely ineffective for same-day and next-day performance, do not appear to prevent
  injuries, and preliminary evidence suggests regular cool-downs do not blunt the long-term
  training adaptation either. Which is the one genuinely reassuring finding: cooling down
  does not cost anything.
- **Wiewelhove et al. (2019, *Front Physiol* 10:376)**, 21 studies on foam rolling. Post
  exercise it reduced **muscle pain perception by 6.0% (g=0.47)** and slightly attenuated
  strength and sprint decrements. Small but the largest post-exercise effect in this section,
  and their conclusion was that foam rolling is better justified as a warm-up activity than a
  recovery tool.

So the cool-down does not speed recovery, does not reduce soreness and does not prevent
injury. The three things it honestly does:

1. **It is where the flexibility work fits.** Post-training is the only slot in a lifting
   session where a 40-second hold costs nothing, and section 8 shows those minutes accumulate
   into the one outcome stretching reliably produces.
2. **It ends the session.** A workout with a defined ending is a completed unit, and this app
   is built on `09-adherence-is-the-outcome.md`. Van Hooren and Peake found psychological
   effects were the least-studied part of the cool-down question. That is not evidence, it is
   an absence of evidence, and I would rather call it a product decision than dress it as
   science.
3. **It is the 48% bubble** from `11-real-goals.md` delivered to people who did not ask for
   it, at no cost to the session.

**Ship the honest five minutes.** If the app ever tells a user that the cool-down will make
them less sore tomorrow, it is saying something a Cochrane review and a meta-analysis both
contradict. The correct copy is closer to "five minutes on what you just worked, which is how
range of motion actually improves" than to anything about recovery.

*Confidence: high that post-exercise stretching does not aid recovery or soreness. High that
it does not harm. Medium that the session-closure effect is real, and I have no citation for
it.*

## 8. The flexibility and mobility goals, where stretching is the plan

`goal-tree.json` has `flexibility` ("Touch my toes") and `mobility` ("Loosen up"), both
carrying "5 to 10 min daily, hips and upper back". Here are the numbers behind that.

**The dose.** The best paper on this is the 2024 *Sports Medicine* systematic review,
meta-analysis and multivariate meta-regression on optimising the static stretching dose
(PMID 39614059), searched across seven databases to June 2024, adults 18 and over:

- **Flexibility gains are maximised at a cumulative 4 minutes per session (acute) and 10
  minutes per week (chronic).**
- **No additional benefit beyond those two figures.** The curve flattens.
- Acute static stretching had a moderate positive effect on flexibility; chronic had a large
  one.
- **Intensity, frequency, age, sex and training status did not moderate the result.** Only
  baseline flexibility did: the stiffer you start, the more you gain.

That last point is worth holding onto, because it is unusually permissive. It says frequency
does not matter as long as the weekly volume is there, so somebody who stretches twice a week
for five minutes is in the same place as somebody who does ninety seconds daily. It also says
we do not need to age-adjust or sex-adjust the flexibility plan, which contradicts what most
apps do.

**Hold duration.** Thomas, Bianco, Paoli and Palma (2018, *Int J Sports Med* 39(4):243-254),
23 articles in the quantitative synthesis: all stretching types improve range of motion over
the long term, and the static protocols showed the significant gains. Practical holds in the
literature cluster at 30 to 60 seconds. Below about 20 seconds there is little reason to
expect change. Our library's 25 to 45 second entries sit inside the range, but the 25-second
entries sit at the bottom of it.

**How long until a real change.** Acute range gains from a single session fade within 30
minutes (Behm 2016). Measurable chronic change typically appears at 3 to 4 weeks and
something the person notices at 6 to 8 weeks. The goal tree's "toes in 6 weeks" is consistent
with the literature and I would not change it. Splits stay undated, which it already does.

**The uncomfortable finding.** Afonso et al. (2021, *Healthcare* 9(4):427), a meta-analysis
of supervised RCTs, found **no difference between strength training and stretching for range
of motion** (ES -0.22, 95% CI -0.55 to 0.12, p=0.206), holding across risk-of-bias, active
versus passive range, and per-joint subgroups. Iversen's review makes the same point:
resistance training through a full range is itself flexibility training.

For a flexibility-goal user this is good news we should use rather than hide: the honest plan
for "touch my toes" is **10 minutes a week of static stretching on the limiting tissues, plus
lifting through a full range**, not thirty minutes a day of stretching. It also means the
`flexibility` and `mobility` goals should not produce a stretching-only plan. They should
produce a normal lifting plan with a full-range bias and a ten-minute daily block, which
`MOBILITY_GOAL_SECONDS` already delivers.

**Numbers for the engine:**

| Variable | Number | Source |
|---|---|---|
| Hold per set | 30 to 60s | Thomas 2018, practice consensus |
| Minimum hold worth doing | 30s | below that, nothing in the literature |
| Cumulative per session | up to 4 min, no benefit past it | Sports Med 2024 meta-regression |
| Cumulative per week | 10 min, no benefit past it | same |
| Frequency | does not matter at matched weekly volume | same |
| Time to measurable change | 3 to 4 weeks | chronic stretching literature |
| Time to a change they feel | 6 to 8 weeks | same, and goal-tree agrees |
| Acute range gain duration | under 30 min | Behm 2016 |

One caveat I could not resolve: the 4-minute and 10-minute figures are cumulative volume, and
I could not confirm from the abstract whether that is per muscle group or per session in
total. The surrounding literature usually means per muscle group. Open question 3.

*Confidence: high on the existence of a plateau and on the 6 to 8 week timeline.
Medium-high on the exact 4 and 10 minute figures, which come from one recent meta-regression.
High that full-range lifting substitutes for a good deal of stretching.*

## 9. What this means for the engine

Concrete, in the order I would build it.

1. **Tag every dynamic and mobility entry with the patterns it prepares**, not the muscles it
   touches. Already in flight. Use section 4 as the reference table and fix the four tags
   noted at the end of it. Static entries stay untagged: they run after, so what was worked
   is the right key for them.
2. **Pass the day's patterns into `pickBlock` and score patterns before muscles.** A leg day
   should be unable to select elbow circles because no leg pattern is tagged on them.
3. **Weight patterns by slot role, not slot count.** A push day has one horizontalPush main
   and three isolation accessories; if the three isolation slots outvote the main, the block
   prepares the curls and not the bench. Suggested weights: main 3, accessory 1, isolation
   0.5. And cap isolation at one move per block.
4. **Add a `phase` field and order the block by it**: raise, activate, mobilise, potentiate.
   Sort the picked moves by phase before returning them, so the deepest move never lands
   first on a cold body.
5. **Add a raise phase.** It does not exist today and it is the phase with the real
   mechanism. Thirty to sixty seconds of continuous movement at the top of every block:
   marching on the spot, arm swings, easy bodyweight squats. One generic move, always first,
   never chosen by pattern.
6. **Replace "skip what does not fit, then pad" with "fit what matters."** The leg-day glute
   hole in the opening section is caused by that rule. Either reserve budget for uncovered
   high-priority targets, or allow a single-side version of a per-side move when only half
   the time is left, or simply stop rather than pad. Stopping at 240s with the right five
   moves beats filling 270s with six.
7. **Raise the minimum hold to 30 seconds for anything in the static pool.** The 25-second
   entries (Wrist Flexor, Wrist Extensor, Shoulder Rolls, Wrist Circles, Ankle Circles,
   Elbow Circles) are below the threshold where a static hold changes anything. Either lift
   them to 30 or accept that they are dynamic movements and keep them out of the cool-down.
8. **Allow short statics in the warm-up for the hip flexors specifically**, capped at 45
   seconds per hold, and only when a dynamic move follows. Konrad 2021 says up to 120s of hip
   flexor stretching is free, and the kneeling hip flexor stretch is the single most useful
   pre-lunge, pre-squat move for a desk-bound user. Keep hamstring and calf statics out of
   the warm-up, which is where the deficit literature is real.
9. **Generate ramp-up sets for the first main lift** from the working load already computed:
   3 to 4 ramp sets at roughly 0 / 50 / 70 / 88% for a main at 80% 1RM or above, 1 to 2 for
   a second main, none below that. Present them as part of the warm-up. Zero volume, zero
   ledger impact, same as the stretches.
10. **Set the budgets to `WARMUP_SECONDS = 360` and `COOLDOWN_SECONDS = 300`**, with the
    warm-up block explicitly not including the ramp sets. Leave `MOBILITY_GOAL_SECONDS` at
    600: that number is right and the research backs it.
11. **Vary the block across weeks.** `pickBlock` is deterministic, so the same day type
    yields the same six moves forever. Pass the week index as a tiebreak seed so the second
    and third choices rotate while the top-priority moves stay stable.
12. **Fix the copy.** The cool-down must not promise recovery or less soreness. It promises
    range of motion over time and the end of the session, because that is what it does.
13. **Add the missing moves.** In priority order: Glute Bridge, Bird Dog, Cat-Cow, Dead Bug,
    Scapular Pull-Up, Lateral Band Walk, Adductor Rock Back, Broomstick Pass-Through, Prone T
    Raise, Dead Hang. The first four are the biggest hole: the library has no glute
    activation and no lumbar control work at all, on a product that programmes hinges.

## 10. Open questions

1. **Does pattern-specific preparation actually improve the lift?** Nobody has tested it.
   The joint-limits-the-pattern chain is solid and the acute-range-opens chain is solid, but
   the link between them is inference. If we ever have enough logged sessions we could look at
   it ourselves, which would be a genuinely novel dataset.
2. **Does the warm-up block change adherence?** More important to us than whether it changes
   the squat. A six-minute preamble could be the thing that makes a session feel doable, or
   the thing people skip and then skip the session with. `skip_stretching` on the payload
   gives us the telemetry to answer this. Instrument it.
3. **Is the 10 min per week flexibility plateau per muscle group or in total?** I could not
   confirm from the abstract. It changes the mobility-goal block by a factor of several. Worth
   one full-text read of the 2024 *Sports Medicine* meta-regression before the number is
   hard-coded anywhere.
4. **What does the raise phase look like for a home user with no bike?** ACSM assumes
   equipment and the whole literature assumes a gym. Thirty seconds of marching on the spot
   is my answer and I am guessing.
5. **Should the block shrink for a user who arrives already warm?** The temperature finding
   in section 1 says someone who walked twenty minutes to the gym needs less raise. We have no
   way to know, and asking is against `07-inference-over-interrogation.md`. Possibly a single
   tap on the warm-up screen: "already warm, skip to the last two moves."
6. **The Oliva 2026 pilot is eight people.** If a general mobility warm-up really does cost
   3.8% of peak force, our current design is actively harmful before a heavy day and the fix
   is urgent. If it is noise from a tiny sample, it is a curiosity. I would not act on it
   alone, but it is the single finding in this file I would most want replicated.
7. **Does the cool-down have the session-closure effect I claim in section 7?** I have no
   citation. Van Hooren and Peake note the psychological side is the least studied part of the
   question. This is a product bet stated as one.
8. **Do ramp-up sets belong in the warm-up UI or in the exercise card?** Showing them in the
   warm-up matches RAMP. Showing them on the first lift matches how lifters think. This is a
   design question and I have no view worth the space.
9. **What happens on a bodyweight-only plan?** Ramp sets need load to ramp. For a push-up
   the ramp is an incline push-up, for a squat it is a box squat. The engine would need a
   regression ladder per pattern, which `calisthenics.mjs` may already contain.
10. **Age.** `02-age.md` says warm-up matters more with age, confidence medium, "widely
    recommended, less rigorously evidenced than the rest." Nothing I found this pass changes
    that, and the 2024 flexibility meta-regression explicitly found age did not moderate
    range-of-motion gains. So the age adjustment, if any, belongs to the ramp sets and not to
    the stretching.
