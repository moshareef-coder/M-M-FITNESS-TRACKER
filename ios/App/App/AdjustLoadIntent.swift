import AppIntents
import ActivityKit
import WidgetKit

// Changing the weight or the reps for the next set, from the expanded Dynamic
// Island.
//
// It lives there rather than on the Lock Screen card deliberately: the card is
// at 147 points of a 160 point budget, and four more tap targets would cost the
// header or his line. The island is already a long press, which is a decision
// rather than a glance, and it has the room.
//
// Same shape as LogSetIntent. The tap moves the card immediately and leaves the
// change in the App Group for the app to apply when it is next in front, because
// the workout lives in the web view and this runs with the app asleep.
@available(iOS 17.0, *)
struct AdjustLoadIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Adjust load"
    static var description = IntentDescription("Changes the weight or reps for the next set.")
    static var openAppWhenRun: Bool = false

    /// "weight" or "reps".
    @Parameter(title: "Field")
    var field: String

    /// Signed. Weight moves in pounds, reps one at a time.
    @Parameter(title: "Delta")
    var delta: Int

    init() {}

    init(field: String, delta: Int) {
        self.field = field
        self.delta = delta
    }

    private static let appGroup = "group.com.creativelab1.fittogether"
    private static let pendingEditsKey = "pendingLoadEdits"
    private static let ownerKey = "sessionOwner"

    func perform() async throws -> some IntentResult {
        queueForTheApp()
        await applyToCard()
        return .result()
    }

    /// Stamped with an owner for the same reason a logged set is: an unowned
    /// edit has no workout to belong to, and replaying one into whatever opens
    /// next would silently change somebody's numbers.
    private func queueForTheApp() {
        guard let defaults = UserDefaults(suiteName: Self.appGroup),
              let owner = defaults.string(forKey: Self.ownerKey), !owner.isEmpty else { return }
        var pending = defaults.array(forKey: Self.pendingEditsKey) as? [[String: Any]] ?? []
        pending.append([
            "at": Date().timeIntervalSince1970,
            "owner": owner,
            "field": field,
            "delta": delta,
        ])
        defaults.set(pending, forKey: Self.pendingEditsKey)
    }

    /// Optimistic, like the set button: the island moves now and the app
    /// reconciles later, because the app owns the workout.
    private func applyToCard() async {
        guard let activity = WorkoutAttributes.live else { return }
        let now = activity.content.state

        var weight = now.weight
        var reps = now.reps
        if field == "reps" {
            // Never below a single rep: zero reps is not a set.
            reps = String(max(1, (Int(now.reps) ?? 0) + delta))
        } else {
            // Bodyweight is a real answer, so this floors at zero rather than
            // refusing to go there.
            weight = String(max(0, (Int(Double(now.weight) ?? 0) ) + delta))
        }

        let next = WorkoutAttributes.ContentState(
            exercise: now.exercise,
            detail: now.detail,
            done: now.done,
            total: now.total,
            restEndsAt: nil,
            paused: now.paused,
            restSeconds: now.restSeconds,
            celebrating: now.celebrating,
            quip: now.quip,
            nextExercise: now.nextExercise,
            nextTotal: now.nextTotal,
            restStartedAt: now.restStartedAt,
            weight: weight,
            reps: reps
        )
        await activity.update(ActivityContent(state: next, staleDate: nil))
    }
}
