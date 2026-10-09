import WidgetKit
import SwiftUI

// The Home Screen families draw "Today, together" (TodayTogether.swift): both
// of you in your rings, the streak, and what today still needs. Everything is
// whatever the app last handed over through the App Group, because a widget
// cannot ask the web view anything.
//
// Lock Screen families are drawn monochrome by the system, so blue and coral
// cannot tell the two of you apart there. Those layouts use position and
// labels instead, and only the Home Screen families use the ring colours.

private let appGroup = "group.com.creativelab1.fittogether"
private let payloadKey = "fitTogetherSnapshot"

func readSnapshot() -> Snapshot {
    guard
        let defaults = UserDefaults(suiteName: appGroup),
        let json = defaults.string(forKey: payloadKey),
        let data = json.data(using: .utf8),
        let decoded = try? JSONDecoder().decode(Snapshot.self, from: data)
    else { return .empty }
    return decoded
}

struct Entry: TimelineEntry {
    let date: Date
    let snapshot: Snapshot
}

struct Provider: TimelineProvider {
    func placeholder(in context: Context) -> Entry {
        Entry(date: Date(), snapshot: .empty)
    }

    func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
        completion(Entry(date: Date(), snapshot: readSnapshot()))
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
        // The app calls reloadAllTimelines whenever a number moves. The one
        // change nobody reloads for is midnight: "Both done today" is about
        // yesterday from then on. So the timeline carries a second entry at the
        // start of tomorrow, which TodayModel rolls forward, and asks again
        // once it has been shown.
        let now = Date()
        let snapshot = readSnapshot()
        let midnight = Calendar.current.nextDate(
            after: now, matching: DateComponents(hour: 0, minute: 0, second: 5),
            matchingPolicy: .nextTime) ?? now.addingTimeInterval(3600)
        completion(Timeline(entries: [Entry(date: now, snapshot: snapshot),
                                      Entry(date: midnight, snapshot: snapshot)],
                            policy: .atEnd))
    }
}

// containerBackground arrived in iOS 17 and is required there for a widget to
// be laid out correctly, but the target reaches back to 16.1.
extension View {
    @ViewBuilder
    func widgetBackground(_ color: Color) -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { color }
        } else {
            // iOS 17 adds the system's content margins for us; 16 lays the
            // card out the same way on the phones that do not.
            padding(16).background(color)
        }
    }
}

struct FitTogetherWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: Entry

    var body: some View {
        switch family {
        case .accessoryCircular:   CircularView(snapshot: entry.snapshot)
        case .accessoryRectangular: RectangularView(snapshot: entry.snapshot)
        case .accessoryInline:     InlineView(snapshot: entry.snapshot)
        default:                   homeView
        }
    }

    private var homeView: some View {
        let model = TodayModel(entry.snapshot, at: entry.date)
        return Group {
            if family == .systemMedium { TodayMedium(model: model) }
            else { TodaySmall(model: model) }
        }
        .environment(\.colorScheme, .dark)
        .widgetBackground(Unio.ground)
    }
}

// MARK: - Lock Screen

/// Your week as the ring, with your partner's progress as an inner arc. Two
/// concentric arcs survive monochrome rendering where two colours do not.
private struct CircularView: View {
    let snapshot: Snapshot

    var body: some View {
        ZStack {
            // Two arcs split left and right, the way the icon does, then filled
            // by how far each of you is through the week. Colour cannot carry
            // it here, so the split and the two radii do.
            Circle().trim(from: 0.5, to: 1.0)
                .stroke(.tertiary, style: StrokeStyle(lineWidth: 5, lineCap: .round))
            Circle().trim(from: 0.0, to: 0.5)
                .stroke(.tertiary, style: StrokeStyle(lineWidth: 5, lineCap: .round))
            Circle()
                .trim(from: 0, to: snapshot.myFraction)
                .stroke(.primary, style: StrokeStyle(lineWidth: 5, lineCap: .round))
                .rotationEffect(.degrees(-90))

            if snapshot.partnerName != nil {
                Circle()
                    .trim(from: 0, to: snapshot.theirFraction)
                    .stroke(.secondary, style: StrokeStyle(lineWidth: 3, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .padding(7)
            }

            Text("\(snapshot.myDays)")
                .font(.system(size: 15, weight: .bold, design: .rounded))
        }
        .widgetAccessoryBackground()
    }
}

/// Both weeks as two labelled bars. The only accessory family with room to name
/// who is who, which is what makes the pair legible without colour.
private struct RectangularView: View {
    let snapshot: Snapshot

    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            personRow(name: snapshot.myName,
                      done: snapshot.myDays, target: snapshot.myTarget,
                      fraction: snapshot.myFraction, bold: true)
            if let partner = snapshot.partnerName {
                personRow(name: partner,
                          done: snapshot.theirDays, target: snapshot.theirTarget,
                          fraction: snapshot.theirFraction, bold: false)
            } else if !snapshot.streakText.isEmpty || snapshot.streak > 0 {
                // streakLabel is the badge's stacked caption on Home, so on
                // its own it read "4 Your streak". streakText is the sentence.
                Text(snapshot.streakText.isEmpty ? "\(snapshot.streak) \(snapshot.streakLabel)" : snapshot.streakText)
                    .font(.system(size: 12))
                    .foregroundStyle(.secondary)
            }
        }
        .widgetAccessoryBackground()
    }

    private func personRow(name: String, done: Int, target: Int,
                           fraction: Double, bold: Bool) -> some View {
        HStack(spacing: 5) {
            Text(name)
                .font(.system(size: 13, weight: bold ? .bold : .medium))
                .lineLimit(1)
                .layoutPriority(1)
            ProgressView(value: fraction)
                .progressViewStyle(.linear)
                .opacity(bold ? 1 : 0.65)
            Text("\(done)/\(max(target, 0))")
                .font(.system(size: 12, weight: .medium))
                .monospacedDigit()
                .foregroundStyle(.secondary)
        }
    }
}

/// One line beside the clock. Inline has no room for anything but the numbers.
private struct InlineView: View {
    let snapshot: Snapshot

    var body: some View {
        if let partner = snapshot.partnerName {
            Text("\(snapshot.myDays)/\(snapshot.myTarget) · \(partner) \(snapshot.theirDays)/\(snapshot.theirTarget)")
        } else {
            Text("\(snapshot.myDays) of \(snapshot.myTarget) this week")
        }
    }
}

private extension View {
    /// Accessory widgets sit on the wallpaper, so the container background has
    /// to be empty rather than a colour, but iOS 17 still demands it be set.
    @ViewBuilder
    func widgetAccessoryBackground() -> some View {
        if #available(iOS 17.0, *) {
            containerBackground(for: .widget) { Color.clear }
        } else {
            self
        }
    }
}

struct FitTogetherWidget: Widget {
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: "FitTogetherWidget", provider: Provider()) { entry in
            FitTogetherWidgetView(entry: entry)
        }
        .configurationDisplayName("Unio")
        .description("You and your partner: today, and the week so far.")
        .supportedFamilies([
            .systemSmall, .systemMedium,
            .accessoryCircular, .accessoryRectangular, .accessoryInline,
        ])
    }
}
