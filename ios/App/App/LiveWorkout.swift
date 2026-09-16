import Foundation
import Capacitor
import ActivityKit

// Starts, updates and ends the Lock Screen / Dynamic Island activity for a
// workout. The session itself lives in the web view, so every change has to be
// handed across; the one thing that does not is the rest countdown, which the
// Lock Screen runs itself from an end date.
//
// The app's deployment target is iOS 14 and ActivityKit needs 16.1, so every
// entry point is guarded and simply resolves on older phones rather than
// failing the call.
@objc(LiveWorkout)
public class LiveWorkout: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "LiveWorkout"
    public let jsName = "LiveWorkout"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "start", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "update", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "end", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "isSupported", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.com.creativelab1.fittogether"
    /// Lines the Lock Screen button can pick from. The quip bank is JavaScript
    /// and the button runs in another process, so the app leaves a handful of
    /// candidates behind for it.
    static let quipPoolKey = "quipPool"
    /// Who the Lock Screen is currently working for: one opaque string naming
    /// the account and the workout. The button stamps it onto every tap so the
    /// app can tell its own sets from somebody else's, or from yesterday's.
    static let ownerKey = "sessionOwner"
    /// A card still up this long after the workout began is not a workout any
    /// more, it is a leftover, and nobody is coming back to end it.
    static let staleAfter: TimeInterval = 12 * 3600

    private func stashQuipPool(_ call: CAPPluginCall) {
        guard let pool = call.getArray("quipPool") as? [String], !pool.isEmpty,
              let defaults = UserDefaults(suiteName: LiveWorkout.appGroup) else { return }
        defaults.set(pool, forKey: LiveWorkout.quipPoolKey)
    }

    /// Recorded on every start and update, so the owner cannot go stale while a
    /// workout is still running.
    private func stashOwner(_ call: CAPPluginCall) {
        guard let owner = call.getString("owner"), !owner.isEmpty,
              let defaults = UserDefaults(suiteName: LiveWorkout.appGroup) else { return }
        defaults.set(owner, forKey: LiveWorkout.ownerKey)
    }

    /// Clearing this is what makes a Lock Screen tap after the workout worth
    /// nothing: the button has nobody to log for, so it queues nothing.
    static func clearOwner() {
        UserDefaults(suiteName: appGroup)?.removeObject(forKey: ownerKey)
    }

    /// Called on every launch and every return to the front. A card from a run
    /// that was force quit half a day ago has no owner left in the app and no
    /// way to be ended by the person looking at it.
    public static func sweepStaleActivities() {
        guard #available(iOS 16.1, *) else { return }
        let cutoff = Date().addingTimeInterval(-staleAfter)
        let stale = WorkoutAttributes.allLive.filter { $0.attributes.startedAt < cutoff }
        guard !stale.isEmpty else { return }
        Task {
            for activity in stale { await activity.end(dismissalPolicy: .immediate) }
        }
    }

    @objc func isSupported(_ call: CAPPluginCall) {
        if #available(iOS 16.1, *) {
            call.resolve(["supported": ActivityAuthorizationInfo().areActivitiesEnabled])
        } else {
            call.resolve(["supported": false])
        }
    }

    @available(iOS 16.1, *)
    private func stateFrom(_ call: CAPPluginCall) -> WorkoutAttributes.ContentState {
        var restEndsAt: Date?
        // Seconds remaining is what the web side knows; an end date is what the
        // Lock Screen can count down without being told again.
        if let rest = call.getDouble("restSeconds"), rest > 0 {
            restEndsAt = Date().addingTimeInterval(rest)
        }
        return WorkoutAttributes.ContentState(
            exercise: call.getString("exercise") ?? "Workout",
            detail: call.getString("detail") ?? "",
            done: call.getInt("done") ?? 0,
            total: call.getInt("total") ?? 0,
            restEndsAt: restEndsAt,
            paused: call.getBool("paused") ?? false,
            // The full length of a rest, not what is left of this one.
            restSeconds: call.getInt("restTarget") ?? 90,
            quip: call.getString("quip") ?? "",
            nextExercise: call.getString("nextExercise") ?? "",
            nextTotal: call.getInt("nextTotal") ?? 0
        )
    }

    @objc func start(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else { call.resolve(); return }
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            call.resolve(["started": false, "why": "Live Activities are off for this app"])
            return
        }
        stashQuipPool(call)
        stashOwner(call)
        // What the system already has beats what this process remembers. After
        // a force quit the app comes back with nothing and the card is still
        // there, and asking for a second one is how you end up with a dead one
        // on screen that the Lock Screen button then drives.
        let existing = WorkoutAttributes.allLive
        if let keep = existing.last {
            // More than one can only mean an earlier run left a card behind.
            // Only the newest can be the workout in front of us.
            let dead = existing.dropLast()
            let next = stateFrom(call)
            Task {
                for old in dead { await old.end(dismissalPolicy: .immediate) }
                await keep.update(using: next)
                call.resolve(["started": true, "adopted": true])
            }
            return
        }
        do {
            _ = try Activity<WorkoutAttributes>.request(
                attributes: WorkoutAttributes(startedAt: Date()),
                contentState: stateFrom(call),
                pushType: nil
            )
            call.resolve(["started": true])
        } catch {
            call.reject("could not start the live activity: \(error.localizedDescription)")
        }
    }

    @objc func update(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else { call.resolve(); return }
        guard let current = WorkoutAttributes.live else {
            call.resolve(["started": false])
            return
        }
        stashQuipPool(call)
        stashOwner(call)
        let next = stateFrom(call)
        Task {
            await current.update(using: next)
            call.resolve(["started": true])
        }
    }

    /// Ends every card, not the one this process happens to be holding. That
    /// distinction is the whole bug: the variable goes with the process and the
    /// card does not, so trusting it strands exactly the cards nobody can
    /// otherwise reach.
    ///
    /// Safe to call when nothing is running, which is what lets every exit path
    /// call it without first knowing whether there is anything to end.
    @objc func end(_ call: CAPPluginCall) {
        guard #available(iOS 16.1, *) else { call.resolve(); return }
        LiveWorkout.clearOwner()
        let all = WorkoutAttributes.allLive
        guard !all.isEmpty else { call.resolve(["ended": 0]); return }
        Task {
            for activity in all { await activity.end(dismissalPolicy: .immediate) }
            call.resolve(["ended": all.count])
        }
    }
}
