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

**Scope note**: medically there are ~639 skeletal muscles total, but that count includes facial
expression muscles, eye muscles, inner-ear muscles, and other things no workout app would ever
show. The figure that actually matters here -- confirmed by how fitness sources themselves
describe it -- is that programs group training into roughly 12 major muscle groups OR **around
100 individual muscles people actively train**. This list targets that same practical range: 75
entries, every one independently referenced in strength/mobility/fitness contexts, none of the
purely medical filler.

---

## Neck & traps → `traps`

- Sternocleidomastoid
- Upper trapezius
- Middle trapezius
- Lower trapezius
- Levator scapulae

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

- Iliocostalis *(erector spinae)*
- Longissimus *(erector spinae)*
- Spinalis *(erector spinae)*
- Multifidus *(deep spinal stabilizer)*
- Quadratus lumborum

## Biceps → `biceps`

- Biceps brachii, long head
- Biceps brachii, short head
- Brachialis
- Coracobrachialis

## Triceps → `triceps`

- Triceps brachii, long head
- Triceps brachii, lateral head
- Triceps brachii, medial head
- Anconeus

## Forearms → `forearms`

- Brachioradialis
- Flexor carpi radialis
- Flexor carpi ulnaris
- Palmaris longus
- Extensor carpi radialis longus
- Extensor carpi radialis brevis
- Extensor carpi ulnaris
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
- Sartorius *(crosses hip and knee; also a hip-flexor synergist)*
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
- Popliteus *(deep knee stabilizer, hamstring-adjacent)*

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
- Plantaris
- Tibialis anterior
- Tibialis posterior
- Peroneus longus *(fibularis longus)*
- Peroneus brevis *(fibularis brevis)*

---

## Count

**75 entries** across 14 regions, every muscle listed individually rather than bundled (biceps
and triceps broken out by head, wrist flexors/extensors named individually, erector spinae
split into its three components, etc.) -- lands right in the ~100-muscle range fitness sources
themselves use as "what people actually train," not the full 639-muscle medical count. Two
rollups (hip flexors, adductors) don't map cleanly onto an existing broad group -- worth
deciding, if the taxonomy ever actually expands, whether they become their own `MUSCLE_GROUPS`
entries or stay folded into `quads` as they are today. Flagging now rather than guessing silently.

## Next step

This list is what the detailed body-diagram drill-down should be built against -- each region
(Chest, Back, Shoulders, Arms, Legs, Core, Glutes) expands into its muscles from this glossary,
each shown hit or missing based on logged training. Whether the exercise library itself ever
gets tagged at this granularity (so "missing" is backed by real data, not just a static list)
is a separate decision -- worth Jawa's input before committing to it, since her exercise-tagging
work is what would actually have to support it.
