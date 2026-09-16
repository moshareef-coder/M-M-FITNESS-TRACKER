import Foundation
import ActivityKit

// Shared between the app target, which starts and updates the activity, and the
// widget extension, which draws it. This file must belong to BOTH targets or
// one side will not compile.
// ActivityAttributes does not exist before 16.1, and the app target reaches
// back to iOS 14. Annotated so an older phone can never touch this metadata.
@available(iOS 16.1, *)
struct WorkoutAttributes: ActivityAttributes {
    struct ContentState: Codable, Hashable {
        var exercise: String
        var detail: String
        var done: Int
        var total: Int
        // Set while resting. The Lock Screen counts this down on its own with
        // Text(timerInterval:), so a rest timer costs no updates and keeps
        // ticking with the app closed.
        var restEndsAt: Date?
        var paused: Bool
        // How long a rest runs for this exercise. The Lock Screen button needs
        // it to start the next rest without asking the app, which is asleep.
        var restSeconds: Int
        // True for a couple of seconds after the Lock Screen button is tapped,
        // so the card can answer instead of just silently changing a number.
        var celebrating: Bool = false
        // Chosen once when rest begins. A locked phone suspends the app, so
        // nothing can change this until the next update, which is why he says
        // one thing per rest instead of chattering.
        var quip: String
        // What the Lock Screen rolls to when the last set of this lift lands.
        // The button runs with the app asleep and cannot ask it what is next.
        var nextExercise: String = ""
        var nextTotal: Int = 0
        // Rest counts UP in this app, against a plan, the way it does on the
        // session screen. An end date can only count down, so the start is what
        // the Lock Screen needs.
        var restStartedAt: Date? = nil
        // What is loaded for the next set, so the card shows the same numbers
        // the app does rather than making you open it to remember.
        var weight: String = ""
        var reps: String = ""
    }

    var startedAt: Date
}

@available(iOS 16.1, *)
extension WorkoutAttributes {
    /// Every live card for a workout, oldest first.
    ///
    /// The system's list is the only honest answer to "is one on screen". An
    /// instance variable is not: a force quit takes the variable and leaves the
    /// card, and the next run then has no way to reach what it can see.
    static var allLive: [Activity<WorkoutAttributes>] {
        Activity<WorkoutAttributes>.activities
            .sorted { $0.attributes.startedAt < $1.attributes.startedAt }
    }

    /// The one card that can be the workout in front of you. `activities` has
    /// no defined order, and a force quit can leave an older one behind, so
    /// `.first` is a coin toss between the live card and a dead one.
    static var live: Activity<WorkoutAttributes>? { allLive.last }
}
