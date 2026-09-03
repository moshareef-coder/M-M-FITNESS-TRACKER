# Muscle glossary

Every skeletal muscle relevant to strength/fitness training, organized by region, each mapped
to which of the app's existing 14 broad `MUSCLE_GROUPS` it currently rolls up into. This is
general anatomical fact -- muscle names and their groupings are standard scientific
terminology, not owned by anyone, the same way bone names or the periodic table aren't.

**Purpose**: the input for two things -- (1) individual clickable regions on the detailed
body-diagram drill-down (the "click Back, see every muscle in it" idea), and (2) eventually,
finer exercise-tagging than the current 14 broad groups, if/when that gets built into the
exercise library. This is a proposal and a shared reference, not a change to the app's live
`MUSCLE_GROUPS` keys or to Jawa's exercise-library data -- those stay exactly as they are
unless a deliberate follow-up decides to expand them.

**Scope note**: this covers muscles actually relevant to training (what a lift, pose, or
stretch can meaningfully target), not the full ~600-muscle medical count -- no facial muscles,
no tiny intrinsic hand/foot muscles, nothing that never shows up in a workout context.

---

## Neck & traps → `traps`

- Sternocleidomastoid
- Upper trapezius
- Middle trapezius
- Lower trapezius

## Shoulders → `shoulders`

- Anterior deltoid
- Lateral deltoid
- Posterior deltoid
- Supraspinatus *(rotator cuff)*
- Infraspinatus *(rotator cuff)*
- Teres minor *(rotator cuff)*
- Subscapularis *(rotator cuff)*

## Chest → `chest`

- Pectoralis major, clavicular head (upper chest)
- Pectoralis major, sternal head (mid/lower chest)
- Pectoralis minor
- Serratus anterior

## Back → `lats` / `traps`

- Latissimus dorsi → `lats`
- Teres major → `lats`
- Rhomboid major → `traps`
- Rhomboid minor → `traps`

## Lower back → `lowerback`

- Erector spinae (iliocostalis, longissimus, spinalis -- usually trained and referenced as one group)
- Multifidus *(deep spinal stabilizer)*
- Quadratus lumborum

## Biceps → `biceps`

- Biceps brachii, long head
- Biceps brachii, short head
- Brachialis

## Triceps → `triceps`

- Triceps brachii, long head
- Triceps brachii, lateral head
- Triceps brachii, medial head

## Forearms → `forearms`

- Brachioradialis
- Wrist flexors (flexor carpi radialis, flexor carpi ulnaris, palmaris longus -- grouped)
- Wrist extensors (extensor carpi radialis, extensor carpi ulnaris -- grouped)
- Pronator teres
- Supinator

## Abs → `abs`

- Rectus abdominis
- Transverse abdominis

## Obliques → `obliques`

- External oblique
- Internal oblique

## Glutes → `glutes`

- Gluteus maximus
- Gluteus medius
- Gluteus minimus
- Tensor fasciae latae (TFL)
- Piriformis

## Hip flexors → `quads` *(closest current rollup; not a perfect fit)*

- Iliopsoas (psoas major + iliacus)
- Rectus femoris *(also a quad head, listed again below -- it crosses both the hip and knee)*

## Quads → `quads`

- Rectus femoris
- Vastus lateralis
- Vastus medialis
- Vastus intermedius

## Hamstrings → `hamstrings`

- Biceps femoris
- Semitendinosus
- Semimembranosus

## Adductors (inner thigh) → `quads` *(closest current rollup; not a perfect fit)*

- Adductor longus
- Adductor magnus
- Adductor brevis
- Gracilis
- Pectineus

## Calves → `calves`

- Gastrocnemius, medial head
- Gastrocnemius, lateral head
- Soleus
- Tibialis anterior
- Tibialis posterior
- Peroneus longus / brevis (fibularis)

---

## Count

**62 entries** across 14 regions (some are grouped, e.g. "wrist flexors" stands in for three
individual muscles that are never trained or discussed separately in a fitness context). Two rollups (hip flexors, adductors) don't map
cleanly onto an existing broad group -- worth deciding, if the taxonomy ever actually expands,
whether they become their own `MUSCLE_GROUPS` entries or stay folded into `quads` as they are
today. Flagging now rather than guessing silently.

## Next step

This list is what the detailed body-diagram drill-down should be built against -- each region
(Chest, Back, Shoulders, Arms, Legs, Core, Glutes) expands into its muscles from this glossary,
each shown hit or missing based on logged training. Whether the exercise library itself ever
gets tagged at this granularity (so "missing" is backed by real data, not just a static list)
is a separate decision -- worth Jawa's input before committing to it, since her exercise-tagging
work is what would actually have to support it.
