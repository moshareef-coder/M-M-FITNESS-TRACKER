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

/// The rest countdown, but only while it is still running.
///
/// `Date.now...ends` is a fatal error when `ends` is in the past: a Swift range
/// traps if lowerBound is greater than upperBound. A locked phone suspends the
/// app, so nothing clears restEndsAt when the rest actually finishes, and the
/// moment the clock passed zero this crashed the widget process and the card
/// went blank. That is the blank card, not a layout problem.
func liveCountdown(_ state: WorkoutAttributes.ContentState) -> ClosedRange<Date>? {
    guard let ends = state.restEndsAt, !state.paused, ends > .now else { return nil }
    return Date.now...ends
}

/// The number, what it counts, and the label under it. Three sizes reading as
/// one block rather than two competing lines.
private struct HeroNumber: View {
    let state: WorkoutAttributes.ContentState
    var size: CGFloat = 34

    private var caption: String {
        if state.paused { return "PAUSED" }
        if state.restEndsAt != nil { return liveCountdown(state) != nil ? "UNTIL NEXT SET" : "REST DONE" }
        return "SETS COMPLETED"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 1) {
            HStack(alignment: .firstTextBaseline, spacing: 6) {
                if let window = liveCountdown(state) {
                    Text(timerInterval: window, countsDown: true)
                        .font(.system(size: size, weight: .bold, design: .rounded))
                        .monospacedDigit()
                        .foregroundStyle(Unio.lime)
                        .fixedSize()
                } else {
                    Text("\(state.done)")
                        .font(.system(size: size, weight: .bold, design: .rounded))
                        .foregroundStyle(state.restEndsAt != nil && !state.paused ? Unio.lime : Unio.ink)
                    Text("of \(state.total)")
                        .font(.system(size: size * 0.44, weight: .semibold))
                        .foregroundStyle(.secondary)
                }
            }
            Text(caption)
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
    var body: some View {
        Button(intent: LogSetIntent()) {
            HStack(spacing: 5) {
                Text("Log set").font(.system(size: 13.5, weight: .bold))
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
                if let window = liveCountdown(context.state) {
                    Text(timerInterval: window, countsDown: true)
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
            VStack(alignment: .leading, spacing: 3) {
                Text("Set logged")
                    .font(.system(size: 20, weight: .bold, design: .rounded))
                    .foregroundStyle(Unio.ink)
                Text(state.done >= state.total && state.total > 0
                     ? "\(state.exercise) done"
                     : "\(state.done) of \(state.total) · \(state.exercise)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Him in the mark, the lift, and the set as a chip rather than loose
            // grey text, so the row reads as three objects and not one sentence.
            HStack(spacing: 10) {
                UnioBotMark(size: 24)
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
                HeroNumber(state: state)
                Spacer(minLength: 6)
                if #available(iOS 17.0, *) { LogSetButton() }
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
