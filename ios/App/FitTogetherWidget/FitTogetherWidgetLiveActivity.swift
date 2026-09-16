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

private struct HeroNumber: View {
    let state: WorkoutAttributes.ContentState
    var size: CGFloat = 40

    var body: some View {
        HStack(alignment: .lastTextBaseline, spacing: 5) {
            if let ends = state.restEndsAt, !state.paused {
                Text(timerInterval: Date.now...ends, countsDown: true)
                    .font(.system(size: size, weight: .bold, design: .rounded))
                    .monospacedDigit()
                    .foregroundStyle(Unio.lime)
                    .fixedSize()
                Text("REST")
                    .font(.system(size: 11, weight: .heavy))
                    .tracking(0.6)
                    .foregroundStyle(.secondary)
            } else {
                Text("\(state.done)")
                    .font(.system(size: size, weight: .bold, design: .rounded))
                    .foregroundStyle(Unio.ink)
                Text(state.paused ? "PAUSED" : "of \(state.total)")
                    .font(.system(size: state.paused ? 11 : 14, weight: state.paused ? .heavy : .semibold))
                    .foregroundStyle(.secondary)
            }
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
                    .fill(i < done ? Unio.lime : Unio.ink.opacity(0.18))
                    .frame(height: 4)
            }
        }
    }
}

@available(iOS 17.0, *)
private struct LogSetButton: View {
    var body: some View {
        Button(intent: LogSetIntent()) {
            Text("Log set")
                .font(.system(size: 13, weight: .bold))
                .padding(.horizontal, 14).padding(.vertical, 7)
                .background(Capsule().fill(Unio.lime))
                .foregroundStyle(.black)
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
                if let ends = context.state.restEndsAt, !context.state.paused {
                    Text(timerInterval: Date.now...ends, countsDown: true)
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
        // Nine-point gaps and a 40-point number, so the whole card lands near
        // 143 and nothing is cut off at the bottom.
        VStack(alignment: .leading, spacing: 9) {
            HStack(spacing: 9) {
                UnioMark(size: 24)
                Text(state.exercise)
                    .font(.system(size: 15, weight: .bold))
                    .lineLimit(1)
                Spacer(minLength: 8)
                Text(state.detail)
                    .font(.system(size: 12.5, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .layoutPriority(1)
            }

            HStack(alignment: .center, spacing: 12) {
                HeroNumber(state: state)
                Spacer(minLength: 6)
                if #available(iOS 17.0, *) { LogSetButton() }
            }

            // One line, not two. The second line was what pushed this card past
            // the cap, and a Lock Screen glance does not read two anyway.
            if !state.quip.isEmpty {
                HStack(alignment: .center, spacing: 7) {
                    BotFace(size: 22)
                    Text(state.quip)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .truncationMode(.tail)
                }
            }

            SetPips(done: state.done, total: state.total)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 13)
    }
}
