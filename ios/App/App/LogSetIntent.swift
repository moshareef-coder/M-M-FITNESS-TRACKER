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
@available(iOS 17.0, *)
struct LogSetIntent: AppIntent {
    static var title: LocalizedStringResource = "Log set"
    static var description = IntentDescription("Marks the set you just finished and starts the rest.")
    // Logging a set should not pull anyone into the app mid-workout.
    static var openAppWhenRun: Bool = false

    private static let appGroup = "group.com.creativelab1.fittogether"
    private static let pendingSetsKey = "pendingSetLogs"
    // Written by LiveWorkout when the app starts or updates the activity.
    private static let quipPoolKey = "quipPool"
    // Also written by LiveWorkout: who this Lock Screen is working for. Cleared
    // the moment the workout ends, which is what makes a later tap worth
    // nothing instead of worth a set in somebody else's workout.
    private static let ownerKey = "sessionOwner"

    func perform() async throws -> some IntentResult {
        queueForTheApp()
        // He says something new every time, the way he does in the app, rather
        // than repeating the line that was already sitting there.
        let line = nextLine()
        // Confirm the tap, hold it long enough to read, then settle into the
        // rest with him typing the new line out.
        await advanceTheActivity(celebrating: true, quip: "")
        try? await Task.sleep(nanoseconds: 1_400_000_000)
        await typeOut(line)
        return .result()
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
    private func queueForTheApp() {
        guard let defaults = UserDefaults(suiteName: Self.appGroup),
              let owner = defaults.string(forKey: Self.ownerKey), !owner.isEmpty else { return }
        // A queue written by an older build holds bare doubles, which will not
        // cast, so it is replaced rather than appended to. Unowned taps are
        // exactly what this is here to throw away.
        var pending = defaults.array(forKey: Self.pendingSetsKey) as? [[String: Any]] ?? []
        pending.append(["at": Date().timeIntervalSince1970, "owner": owner])
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
        let next = WorkoutAttributes.ContentState(
            exercise: now.exercise,
            detail: now.total > 0
                ? "Set \(min(done + 1, now.total)) of \(now.total)"
                : now.detail,
            done: done,
            total: now.total,
            // The rest clock starts on the first update and is left alone by the
            // second, so the countdown does not jump back when the card settles.
            restEndsAt: alreadyAdvanced
                ? now.restEndsAt
                : (rested > 0 ? Date().addingTimeInterval(Double(rested)) : nil),
            paused: now.paused,
            restSeconds: rested,
            celebrating: celebrating,
            quip: quip ?? now.quip
        )
        await activity.update(ActivityContent(state: next, staleDate: nil))
    }
}
