import ActivityKit
import WidgetKit
import SwiftUI
import AppIntents

// One number as big as the surface allows, the Unio mark carrying identity, and
// him in the corner saying one line for the length of the rest.
//
// The countdown is never pushed. It is handed an end date once and
// Text(timerInterval:) runs it down on the Lock Screen with the app suspended.
//
// Height matters here: Apple cap the Lock Screen presentation at roughly 160
// points and clip past it without a word. An earlier layout came to 174 and the
// set pips simply vanished. The budget below is about 143, which leaves room
// for SF's wider numerals.

private func progress(_ s: WorkoutAttributes.ContentState) -> Double {
    guard s.total > 0 else { return 0 }
    return min(1, Double(s.done) / Double(s.total))
}

/// Rest counts UP against a plan here, matching restState() on the session
/// screen, so this is the window to count from rather than down to.
///
/// Ranges are built forwards on purpose. `Date.now...ends` traps when ends is
/// in the past, and that is what crashed the widget and blanked the card the
/// moment a countdown reached zero.
func restWindow(_ state: WorkoutAttributes.ContentState) -> ClosedRange<Date>? {
    guard let began = state.restStartedAt, !state.paused else { return nil }
    return began...began.addingTimeInterval(3600)
}

/// True once the rest has run past what the plan asked for.
func restIsDone(_ state: WorkoutAttributes.ContentState) -> Bool {
    guard let began = state.restStartedAt else { return false }
    return Date().timeIntervalSince(began) >= Double(state.restSeconds)
}

/// Still resting at all, which is what decides the whole card's state.
func isResting(_ state: WorkoutAttributes.ContentState) -> Bool {
    state.restStartedAt != nil && !state.paused
}

/// The working state: sets done, and what that number counts.
private struct HeroNumber: View {
    let state: WorkoutAttributes.ContentState
    var size: CGFloat = 34

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                Text("\(state.done)")
                    .font(.system(size: size, weight: .bold, design: .rounded))
                    .foregroundStyle(Unio.ink)
                Text("of \(state.total)")
                    .font(.system(size: size * 0.44, weight: .semibold))
                    .foregroundStyle(.secondary)
            }
            Text(state.paused ? "PAUSED" : "SETS COMPLETED")
                .font(.system(size: 9.5, weight: .heavy))
                .tracking(0.9)
                .foregroundStyle(.tertiary)
                .lineLimit(1)
        }
    }
}

/// Set segments. A bar says "some"; blocks say "one more", which is the question
/// actually being asked between sets.
private struct SetPips: View {
    let done: Int
    let total: Int

    var body: some View {
        HStack(spacing: 3) {
            ForEach(0..<max(total, 1), id: \.self) { i in
                Capsule()
                    .fill(i < done ? Unio.lime : Unio.ink.opacity(0.16))
                    .frame(height: 5)
                    .shadow(color: i < done ? Unio.lime.opacity(0.55) : .clear, radius: 3)
            }
        }
    }
}

@available(iOS 17.0, *)
private struct LogSetButton: View {
    // The app's own words. Resting, the same tap means "I am going again", and
    // the session screen calls that Start set N, so this does too.
    var resting: Bool = false
    var label: String = "Log set"

    var body: some View {
        Button(intent: LogSetIntent()) {
            HStack(spacing: 5) {
                Text(label)
                    .font(.system(size: 13.5, weight: .bold))
                    .lineLimit(1)
                    .fixedSize()
                Image(systemName: "chevron.right").font(.system(size: 11, weight: .bold))
            }
            .padding(.horizontal, 15).padding(.vertical, 8)
            .background(Capsule().fill(Unio.lime))
            .foregroundStyle(.black)
            .shadow(color: Unio.lime.opacity(0.45), radius: 6)
        }
        .buttonStyle(.plain)
    }
}

@available(iOS 16.1, *)
struct FitTogetherWidgetLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: WorkoutAttributes.self) { context in
            Group {
                if context.state.celebrating {
                    CelebrationView(state: context.state)
                } else {
                    LockScreenView(state: context.state)
                }
            }
            .activityBackgroundTint(Color.black.opacity(0.62))
                .activitySystemActionForegroundColor(.white)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 7) {
                        UnioMark(size: 22)
                        Text(context.state.exercise)
                            .font(.system(size: 14, weight: .bold))
                            .lineLimit(1)
                    }
                    .padding(.leading, 4)
                }
                DynamicIslandExpandedRegion(.trailing) {
                    Text(context.state.detail)
                        .font(.system(size: 13, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .padding(.trailing, 4)
                }
                DynamicIslandExpandedRegion(.bottom) {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack(alignment: .center) {
                            if context.state.celebrating {
                                HStack(spacing: 9) {
                                    BotFace(size: 30, happy: true)
                                    Text("Set logged")
                                        .font(.system(size: 20, weight: .bold, design: .rounded))
                                }
                            } else {
                                HeroNumber(state: context.state)
                            }
                            Spacer(minLength: 8)
                            if #available(iOS 17.0, *), !context.state.celebrating { LogSetButton() }
                        }
                        if !context.state.quip.isEmpty {
                            HStack(alignment: .center, spacing: 7) {
                                BotFace(size: 21)
                                Text(context.state.quip)
                                    .font(.system(size: 12, weight: .medium))
                                    .foregroundStyle(.secondary)
                                    .lineLimit(1)
                            }
                        }
                        SetPips(done: context.state.done, total: context.state.total)
                    }
                    .padding(.horizontal, 4)
                }
            } compactLeading: {
                UnioMark(size: 18)
            } compactTrailing: {
                // Same trap as the Lock Screen: an expired range is fatal, and
                // this one would take the Dynamic Island down with it.
                if let window = restWindow(context.state) {
                    Text(timerInterval: window, countsDown: false)
                        .monospacedDigit()
                        .frame(maxWidth: 44)
                        .foregroundStyle(Unio.lime)
                } else {
                    Text("\(context.state.done)/\(context.state.total)")
                        .monospacedDigit()
                        .foregroundStyle(.secondary)
                }
            } minimal: {
                UnioMark(size: 18)
            }
        }
    }
}

/// What the card becomes the moment a set is logged from the Lock Screen. The
/// whole surface answers, rather than a number quietly changing.
@available(iOS 16.1, *)
private struct CelebrationView: View {
    let state: WorkoutAttributes.ContentState

    var body: some View {
        HStack(spacing: 14) {
            ZStack {
                Circle().fill(Unio.lime.opacity(0.20)).frame(width: 52, height: 52)
                BotFace(size: 46, happy: true)
            }
            /* Two different things happen on this button and they deserve
               different words: one more set done, or a whole lift finished and
               the next one already on screen. */
            VStack(alignment: .leading, spacing: 3) {
                Text(state.done == 0 ? "Lift done" : "Set logged")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(Unio.ink)
                Text(state.done == 0
                     ? "Up next: \(state.exercise)"
                     : "\(state.done) of \(state.total) · \(state.exercise)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
            }
            Spacer(minLength: 0)
            UnioMark(size: 30)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            // The green wash is the confirmation. It reads before any word does.
            LinearGradient(colors: [Unio.lime.opacity(0.26), Unio.lime.opacity(0.06)],
                           startPoint: .leading, endPoint: .trailing)
        )
    }
}

@available(iOS 16.1, *)
private struct LockScreenView: View {
    let state: WorkoutAttributes.ContentState

    private var resting: Bool { isResting(state) }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // The logo, the lift, and which lift it is. The chip carries the
            // position because the hero already counts sets.
            HStack(spacing: 10) {
                UnioMark(size: 24)
                Text(state.exercise)
                    .font(.system(size: 16, weight: .bold))
                    .lineLimit(1)
                    .minimumScaleFactor(0.85)
                Spacer(minLength: 6)
                Text(state.detail)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .fixedSize()
                    .padding(.horizontal, 10).padding(.vertical, 5)
                    .background(Capsule().fill(Unio.ink.opacity(0.10)))
            }

            HStack(alignment: .center, spacing: 12) {
                if resting { RestHero(state: state) } else { HeroNumber(state: state) }
                Spacer(minLength: 6)
                if #available(iOS 17.0, *) {
                    LogSetButton(resting: resting,
                                 label: resting
                                    ? "Start set \(min(state.done + 1, max(state.total, 1)))"
                                    : "Log set")
                }
            }

            // A rule between him and what he says, so the line reads as speech
            // rather than a caption stuck to his head.
            if !state.quip.isEmpty {
                HStack(alignment: .center, spacing: 9) {
                    BotFace(size: 26)
                    Capsule()
                        .fill(Unio.ink.opacity(0.22))
                        .frame(width: 2, height: 17)
                    Text(state.quip)
                        .font(.system(size: 12.5, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
            }

            SetPips(done: state.done, total: state.total)
        }
        .padding(.horizontal, 15)
        .padding(.vertical, 12)
    }
}

/// Resting, in the same shape as the working state.
///
/// It counts up against the plan, matching restState() on the session screen,
/// rather than counting down to zero. The plan line says the same two things
/// the app says: what the plan asked for, and that you are past it.
///
/// The set count stays beside the clock on purpose. Text(timerInterval:) is the
/// one element the app cannot redraw once the phone is locked, and when it was
/// alone in this slot there was nothing left if it failed to draw.
private struct RestHero: View {
    let state: WorkoutAttributes.ContentState

    private var planned: String { mmss(state.restSeconds) }

    private func mmss(_ seconds: Int) -> String {
        String(format: "%d:%02d", seconds / 60, seconds % 60)
    }

    var body: some View {
        HStack(alignment: .center, spacing: 11) {
            VStack(alignment: .leading, spacing: 1) {
                if let window = restWindow(state) {
                    Text(timerInterval: window, countsDown: false)
                        .font(.system(size: 34, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(restIsDone(state) ? Unio.lime : Unio.ink)
                        .lineLimit(1)
                        .frame(minWidth: 74, alignment: .leading)
                }
                Text(restIsDone(state)
                     ? "PAST THE \(planned) PLAN"
                     : "PLAN SAYS \(planned)")
                    .font(.system(size: 9.5, weight: .heavy))
                    .tracking(0.9)
                    // Both branches concrete Colors: .tertiary is a ShapeStyle
                    // and cannot share a ternary with one.
                    .foregroundStyle(restIsDone(state) ? Unio.lime.opacity(0.8) : Unio.ink.opacity(0.45))
                    .lineLimit(1)
            }

            Capsule().fill(Unio.ink.opacity(0.18)).frame(width: 1.5, height: 26)

            VStack(alignment: .leading, spacing: 1) {
                Text(loadLine)
                    .font(.system(size: 15, weight: .bold, design: .rounded))
                    .foregroundStyle(Unio.ink)
                    .lineLimit(1)
                    .minimumScaleFactor(0.8)
                Text("UP NEXT")
                    .font(.system(size: 9, weight: .heavy))
                    .tracking(0.8)
                    .foregroundStyle(.tertiary)
            }
        }
    }

    /// What the next set is, in the app's own shorthand. Falls back to the set
    /// count when nothing is loaded, so the slot is never empty.
    private var loadLine: String {
        let w = state.weight.trimmingCharacters(in: .whitespaces)
        let r = state.reps.trimmingCharacters(in: .whitespaces)
        if !w.isEmpty, !r.isEmpty, w != "0" { return "\(w) lb × \(r)" }
        if !r.isEmpty { return "\(r) reps" }
        return "\(state.done) of \(state.total)"
    }
}
