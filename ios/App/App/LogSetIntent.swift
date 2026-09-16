import AppIntents
import ActivityKit
import WidgetKit

// The Lock Screen button that logs a set.
//
// This runs in the widget process, which cannot reach the web view where the
// workout actually lives. So it does two things: it moves the Live Activity
// forward straight away, so the tap feels instant, and it leaves a mark in the
// App Group that the app collects the next time it is in front.
//
// Interactive widgets are iOS 17 and up. Below that the button is simply not
// drawn, and the Lock Screen stays read-only.
/// LiveActivityIntent, not AppIntent.
///
/// A button inside a Live Activity needs this specific protocol. With a plain
/// AppIntent the button draws, highlights, and then does nothing at all: there
/// is no error and nothing in the log, because the system never routes the tap.
/// Home Screen widgets accept a plain AppIntent, which is what made this look
/// like it should already work.
@available(iOS 17.0, *)
struct LogSetIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Log set"
    static var description = IntentDescription("Marks the set you just finished and starts the rest.")
    // Logging a set should not pull anyone into the app mid-workout.
    static var openAppWhenRun: Bool = false

    /// "log", "start" or "next". One button in three states, because the same
    /// place on the card means a different thing depending on where you are:
    /// finishing a set, coming back off a rest, or moving to the next lift.
    /// They were all doing the log, so Start set 2 logged set 2 the moment it
    /// was meant to begin it.
    @Parameter(title: "Action")
    var action: String

    init() { self.action = "log" }

    init(action: String) { self.action = action }

    private static let appGroup = "group.com.creativelab1.fittogether"
    private static let pendingSetsKey = "pendingSetLogs"
    // Written by LiveWorkout when the app starts or updates the activity.
    private static let quipPoolKey = "quipPool"
    // Also written by LiveWorkout: who this Lock Screen is working for. Cleared
    // the moment the workout ends, which is what makes a later tap worth
    // nothing instead of worth a set in somebody else's workout.
    private static let ownerKey = "sessionOwner"

    func perform() async throws -> some IntentResult {
        switch action {
        case "start":
            // Ending a rest is not an event worth a green card: you are simply
            // picking the bar back up. It just clears the clock.
            await endTheRest()
        case "next":
            queueForTheApp(kind: "next")
            await rollToNextLift()
        default:
            queueForTheApp(kind: "set")
            // He says something new every time, the way he does in the app,
            // rather than repeating the line already sitting there.
            let line = nextLine()
            // Confirm the tap, hold it long enough to read, then settle into
            // the rest with him typing the new line out.
            await advanceTheActivity(celebrating: true, quip: "")
            try? await Task.sleep(nanoseconds: 1_400_000_000)
            await typeOut(line)
        }
        return .result()
    }

    /// Back to working: the clock stops and the card stops saying Resting.
    private func endTheRest() async {
        guard let activity = WorkoutAttributes.live else { return }
        await activity.update(ActivityContent(state: mutate(activity.content.state) {
            $0.restStartedAt = nil
        }, staleDate: nil))
    }

    /// The next lift, with its own set count, and nothing logged by doing it.
    private func rollToNextLift() async {
        guard let activity = WorkoutAttributes.live else { return }
        let now = activity.content.state
        guard !now.nextExercise.isEmpty else { return }
        await activity.update(ActivityContent(state: mutate(now) {
            $0.exercise = now.nextExercise
            $0.total = now.nextTotal
            $0.done = 0
            $0.restStartedAt = nil
            // The app sends the real next lift on its next update; guessing
            // further ahead here would chain the whole workout blind.
            $0.nextExercise = ""
            $0.nextTotal = 0
        }, staleDate: nil))
    }

    private func mutate(_ state: WorkoutAttributes.ContentState,
                        _ change: (inout WorkoutAttributes.ContentState) -> Void)
        -> WorkoutAttributes.ContentState {
        var copy = state
        change(&copy)
        return copy
    }

    /// One of the lines the app left in the App Group, avoiding the one already
    /// on screen so a tap never looks like it did nothing.
    private func nextLine() -> String {
        guard let defaults = UserDefaults(suiteName: Self.appGroup),
              let pool = defaults.stringArray(forKey: Self.quipPoolKey), !pool.isEmpty
        else { return "" }
        let showing = currentState()?.quip
        return pool.filter { $0 != showing }.randomElement() ?? pool.randomElement() ?? ""
    }

    /// The app types at 17ms a character. A Live Activity cannot be updated
    /// forty times for one sentence, so this reveals it in a handful of steps:
    /// the same gesture at a rate the system will actually deliver.
    private func typeOut(_ line: String) async {
        guard !line.isEmpty else {
            await advanceTheActivity(celebrating: false, alreadyAdvanced: true, quip: "")
            return
        }
        let steps = 5
        for step in 1...steps {
            let upTo = max(1, line.count * step / steps)
            let shown = String(line.prefix(upTo))
            await advanceTheActivity(celebrating: false, alreadyAdvanced: true, quip: shown)
            if step < steps { try? await Task.sleep(nanoseconds: 130_000_000) }
        }
    }

    private func currentState() -> WorkoutAttributes.ContentState? {
        WorkoutAttributes.live?.content.state
    }

    /// One tap, stamped with who it is for and when it happened.
    ///
    /// A bare timestamp in a shared queue belongs to nobody, and the app had no
    /// way to tell a tap from this workout apart from a tap made yesterday, or
    /// one made by the person who had the phone before this one signed in. Both
    /// were replayed as real sets into whatever workout was open next.
    ///
    /// No owner means no workout is running, so there is nothing for a tap to
    /// be a set of and it is not queued at all.
    private func queueForTheApp(kind: String) {
        guard let defaults = UserDefaults(suiteName: Self.appGroup),
              let owner = defaults.string(forKey: Self.ownerKey), !owner.isEmpty else { return }
        // A queue written by an older build holds bare doubles, which will not
        // cast, so it is replaced rather than appended to. Unowned taps are
        // exactly what this is here to throw away.
        var pending = defaults.array(forKey: Self.pendingSetsKey) as? [[String: Any]] ?? []
        pending.append(["at": Date().timeIntervalSince1970, "owner": owner, "kind": kind])
        defaults.set(pending, forKey: Self.pendingSetsKey)
    }

    /// Optimistic: the Lock Screen moves now, and the app reconciles later. If
    /// the two ever disagree, the app wins, because it owns the workout.
    ///
    /// `alreadyAdvanced` is for the settling update, which must not count the
    /// same set a second time.
    private func advanceTheActivity(celebrating: Bool, alreadyAdvanced: Bool = false,
                                    quip: String? = nil) async {
        guard let activity = WorkoutAttributes.live else { return }
        let now = activity.content.state
        // A logged set is the end of the rest before it and the start of the
        // next one, which is the same rule toggleSet() follows in the app.
        let rested = max(0, now.restSeconds)
        let done = alreadyAdvanced ? now.done : min(now.done + 1, now.total)
        // The last set of a lift rolls straight on to the next one, the way you
        // would in the app, rather than parking on a finished exercise with a
        // button that can no longer do anything.
        let finishedLift = false
        let next = WorkoutAttributes.ContentState(
            exercise: finishedLift ? now.nextExercise : now.exercise,
            detail: now.detail,
            done: finishedLift ? 0 : done,
            total: finishedLift ? now.nextTotal : now.total,
            restEndsAt: nil,
            paused: now.paused,
            restSeconds: rested,
            celebrating: celebrating,
            quip: quip ?? now.quip,
            // Cleared on the roll: the app sends the real next lift on its next
            // update, and guessing here would chain the whole workout blind.
            nextExercise: finishedLift ? "" : now.nextExercise,
            nextTotal: finishedLift ? 0 : now.nextTotal,
            /* Rest begins the moment a set lands, and the card reads
               restStartedAt now that it counts up. This was still setting
               restEndsAt, which nothing looks at any more, so logging a set
               started a rest the Lock Screen could not see and the card just
               asked for the next set. Left alone on the settling update so the
               clock does not restart when the card stops celebrating. */
            restStartedAt: alreadyAdvanced ? now.restStartedAt : Date(),
            weight: now.weight,
            reps: now.reps
        )
        await activity.update(ActivityContent(state: next, staleDate: nil))
    }
}
