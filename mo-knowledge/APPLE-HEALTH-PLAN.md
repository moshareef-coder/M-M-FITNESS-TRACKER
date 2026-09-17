# Apple Health

Written 2026-09-17. Nothing here is built yet. The decision was to ship 1.0
without HealthKit and land this as 1.0.1, so **no part of this goes into the
submitted build**: adding the entitlement widens the review surface at the one
moment a rejection is most expensive, and a later version gets a full review
anyway, so deferring costs nothing.

## The call on the plugin: we write our own

`capacitor-health@7.1.0` is the only maintained package that supports Capacitor 7.
Its whole API is `queryAggregated`, `queryWorkouts`, `queryRecords`. **It cannot
write.** Writing a finished session to Health is the most valuable of the four
flows, so the package fails on the main requirement and is not worth taking on
for the read half alone. `@perfood/capacitor-healthkit` peers on Capacitor 4 and
was last touched in early 2025.

So: `ios/App/App/HealthBridge.swift`, alongside `LiveWorkout`, `WidgetBridge`
and `PushEnvironment`, in the shape those three already use, plus its name in
`LOCAL_PLUGINS` in `scripts/register-native-plugins.mjs`. Capacitor 7 builds its
registry only from `packageClassList`, and a local plugin that is missing from
it reads as `undefined` in JS instead of throwing, so that line is not optional.

## The four flows

**1. Write a finished session as a workout.** The highest value piece: it puts
Unio sessions in the Fitness app and on the move and exercise rings, which is
what makes the app a citizen of the phone rather than a silo.

- `HKWorkoutBuilder`, not the `HKWorkout` initializer, which is deprecated from
  iOS 17.
- `.traditionalStrengthTraining` for a lifting session, `.functionalStrength
  Training` for a circuit, `.cooldown` for the stretch block if we write it
  separately.
- Start and end are already known: `SESSION.startedAt` with the pause-aware
  elapsed calculation at `index.html:21825`. Nothing needs persisting first,
  because the write happens at finish while both are still in memory. That also
  means **there is no backfill**: sessions logged before this ships never reach
  Health, and we should not pretend otherwise in the copy.
- Active energy comes from the MET estimate already at `index.html:12694`, and
  is written only when there is a logged bodyweight to base it on. A calorie
  figure with no bodyweight behind it is a guess, and Health will keep it
  forever.

**2. Read body weight.** A smart scale writes `HKQuantityTypeIdentifier.bodyMass`,
we read the most recent sample and fill the weigh-in instead of asking for it.
Convert to pounds: `fit_entries.weight` is lbs and `renderScaleCheck` at
`index.html:15528` assumes it. Fill the field, do not write the row silently.
The prefill already reads as a correction rather than a blank, so this slots in
without a redesign.

**3. Read steps and active energy.** `HKStatisticsCollectionQuery` with a daily
interval. This is the one that needs a new table, because it is shown next to a
partner's number and therefore has to leave the device.

**4. Read heart rate.** Samples inside the session window, reduced to average
and peak on the workout summary. Worth the least: it is empty for anyone not
wearing a watch, and we do not record a live session on the watch itself. Build
it last and let it be absent without comment when there is nothing there.

## Permissions, and the trap in them

HealthKit deliberately will not tell you whether a **read** was denied. Denied
and "no data recorded" are indistinguishable by design, so that an app cannot
infer a condition from a refusal. `authorizationStatus(for:)` answers honestly
for write types only.

So nothing may branch on read permission. Every read path handles an empty
result as the normal case, and no screen ever says "allow Health access to see
this", because we cannot know that is why it is empty. Offer
`openAppleHealthSettings` as a quiet way back in, and say "no data yet" rather
than accusing the user of having denied us.

This fits how the rest of this codebase already reports what it could not do,
in `dayNotes`, `meta.missing` and `volumeNotes`. Keep it.

## Privacy, which is the part that can get us rejected

Guideline 5.1.3 is specific and enforced:

- Health data may never be used for advertising, marketing, or sold on. We do
  neither, but the privacy policy has to say so in as many words.
- Health data may not be stored in iCloud. Our sync is Supabase, which is fine,
  but nothing may go into a CloudKit or iCloud-backed store.
- Usage strings must name the actual use. Not "to improve your experience".
  - `NSHealthShareUsageDescription`: "Unio reads your weight, steps, active
    energy and heart rate so your weigh-ins fill themselves in and your workout
    summary shows what your body actually did."
  - `NSHealthUpdateUsageDescription`: "Unio saves finished workouts to Health so
    they count toward your rings and appear in the Fitness app."
- The App Store privacy nutrition label needs a Health and Fitness entry, and
  the questionnaire changes answers we have already submitted.

**The partner question, which is ours not Apple's.** This app shows one person's
numbers to another, and steps and heart rate are a long way more personal than
a set of squats. The default is that nothing read from Health leaves the device,
and the existing share-details toggle (`shareDetailsToggle`, `index.html:6514`)
governs it, with its own line so that turning on workout detail does not quietly
turn on heart rate. Raw samples never go to the server under any setting: only a
daily total, and only for steps and active energy.

Proposed table, to be written as a migration and applied by Mo, not by a
session:

```
health_daily (email, day, steps int, active_kcal int, source text,
              updated_at, primary key (email, day))
```

RLS mirroring `fit_entries`, plus the share toggle on the partner read path. Per
the RLS column trap already in the repo: RLS guards rows, not columns, so if
visibility is ever decided by a column in this table it needs a BEFORE UPDATE
trigger pinning it, not a policy.

## Order of work, once 1.0 is approved

1. `HealthBridge.swift` with `isAvailable` and `requestAuthorization` only, plus
   the registry entry. Prove the plugin is actually registered at boot before
   writing a line of the rest. This is the failure mode that has cost the most
   time in this repo and it is silent.
2. Capability, entitlement in both `App.entitlements` and
   `AppRelease.entitlements`, and both usage strings. Verify the Release
   entitlements file too: it has been the one left behind before.
3. Write the workout. Finish a real session, then open Fitness and see it.
4. Read body weight into the weigh-in field.
5. `health_daily` migration, then steps and active energy, then the partner
   visibility line on the share toggle.
6. Heart rate on the workout summary.
7. Privacy policy update and the nutrition label, before submitting, not after.

## How to check it, at each step

- Plugin registered: the boot log already prints the plugin registry. It has to
  list `HealthBridge` on a device build. The simulator has HealthKit but no
  data, so an empty read there proves nothing.
- Workout written: Fitness app, then Health, Browse, Activity, Workouts. It
  should carry Unio as the source.
- Weight read: add a manual weight in Health, reopen the weigh-in, the field
  should already hold it.
- Denied path: revoke in Settings, Privacy, Health, Unio, and confirm every
  screen reads as empty rather than broken, and that nothing claims a denial.
