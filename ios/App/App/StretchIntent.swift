import AppIntents
import ActivityKit
import WidgetKit

// The two buttons on the Lock Screen while you are stretching.
//
// Separate from LogSetIntent rather than a third and fourth case on it. That
// intent already carries three meanings on one button and its whole job is
// sets; a stretch logs nothing, writes nothing and belongs to a different
// phase of the session. Folding these in would mean an intent whose name was
// a lie about half of what it does.
//
// LiveActivityIntent, not AppIntent. A button inside a Live Activity needs this
// exact protocol: with a plain AppIntent it draws, it highlights, and then
// nothing happens at all, with no error and nothing in the log.
@available(iOS 17.0, *)
struct StretchIntent: LiveActivityIntent {
    static var title: LocalizedStringResource = "Stretch"
    static var description = IntentDescription("Moves through the warm-up or cool-down.")
    static var openAppWhenRun: Bool = false

    /// "next" moves to the next hold, "skip" leaves the whole block.
    @Parameter(title: "Action")
    var action: String

    init() { self.action = "next" }

    init(action: String) { self.action = action }

    private static let appGroup = "group.com.creativelab1.fittogether"
    private static let pendingKey = "pendingStretchActions"
    private static let ownerKey = "sessionOwner"

    func perform() async throws -> some IntentResult {
        queueForTheApp()
        if action == "skip" {
            await leaveTheBlock()
        } else {
            await rollToNextHold()
        }
        return .result()
    }

    /// Stamped with an owner for the same reason a logged set is: an unowned
    /// tap has no session to belong to, and replaying one into whatever opens
    /// next would move somebody else's workout.
    private func queueForTheApp() {
        guard let defaults = UserDefaults(suiteName: Self.appGroup),
              let owner = defaults.string(forKey: Self.ownerKey), !owner.isEmpty else { return }
        var pending = defaults.array(forKey: Self.pendingKey) as? [[String: Any]] ?? []
        pending.append([
            "at": Date().timeIntervalSince1970,
            "owner": owner,
            "kind": action,
        ])
        defaults.set(pending, forKey: Self.pendingKey)
    }

    /// The next hold, optimistically, so the tap lands now rather than when the
    /// app next wakes. The app owns the session and reconciles on the way back
    /// in; if the two ever disagree, the app wins.
    ///
    /// Deliberately not clever about sides. The widget cannot see whether a
    /// hold is per side, so it advances the index and lets the app correct it,
    /// which is a fraction of a second of being slightly ahead rather than a
    /// second copy of the session's rules living out here and drifting.
    private func rollToNextHold() async {
        guard let activity = WorkoutAttributes.live else { return }
        let now = activity.content.state
        var next = now
        next.stretchIndex = min(now.stretchIndex + 1, max(now.stretchCount - 1, 0))
        next.stretchSide = now.stretchSide > 0 ? 1 : 0
        // The name is the app's to supply and this cannot know the next one, so
        // it is cleared rather than left showing the hold you just left, which
        // would be actively wrong for the second or two until the app answers.
        next.stretchName = ""
        next.stretchEndsAt = nil
        await activity.update(ActivityContent(state: next, staleDate: nil))
    }

    /// Out of the block entirely. The card goes back to the lifting look, which
    /// is what the app will confirm a moment later.
    private func leaveTheBlock() async {
        guard let activity = WorkoutAttributes.live else { return }
        var next = activity.content.state
        next.phase = "lift"
        next.stretchName = ""
        next.stretchEndsAt = nil
        next.stretchIndex = 0
        next.stretchCount = 0
        next.stretchSide = 0
        await activity.update(ActivityContent(state: next, staleDate: nil))
    }
}
