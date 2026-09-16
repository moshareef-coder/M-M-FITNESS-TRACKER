import WidgetKit
import SwiftUI

// The widget draws the same two rings the home screen leads with: you and your
// partner, days trained against this week's target. It renders whatever the app
// last handed over through the App Group, because a widget cannot ask the web
// view anything.
//
// Lock Screen families are drawn monochrome by the system, so blue and coral
// cannot tell the two of you apart there. Those layouts use position and
// labels instead, and only the Home Screen families use the ring colours.

private let appGroup = "group.com.creativelab1.fittogether"
private let payloadKey = "fitTogetherSnapshot"

struct Snapshot: Codable {
    var myName: String
    var myDays: Int
    var myTarget: Int
    var partnerName: String?
    var theirDays: Int
    var theirTarget: Int
    var streak: Int
    var streakLabel: String
    // Decoded with a default so an older payload written before he spoke on
    // this surface still parses instead of blanking the whole widget.
    var quip: String = ""

    // What a phone shows before the app has ever been opened, or if the blob
    // is unreadable. Zeroes are honest here: nothing is known yet.
    static let empty = Snapshot(
        myName: "You", myDays: 0, myTarget: 0,
        partnerName: nil, theirDays: 0, theirTarget: 0,
        streak: 0, streakLabel: "", quip: ""
    )

    var myFraction: Double {
        guard myTarget > 0 else { return 0 }
        return min(1, Double(myDays) / Double(myTarget))
    }

    var theirFraction: Double {
        guard theirTarget > 0 else { return 0 }
        return min(1, Double(theirDays) / Double(theirTarget))
    }
}

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
        // The app calls reloadAllTimelines whenever a number moves, so this
        // hourly entry is only a backstop for a week rolling over untouched.
        let entry = Entry(date: Date(), snapshot: readSnapshot())
        let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date().addingTimeInterval(3600)
        completion(Timeline(entries: [entry], policy: .after(next)))
    }
}

private let meColor = Unio.me
private let partnerColor = Unio.partner

struct Ring: View {
    let done: Int
    let target: Int
    let color: Color
    let label: String
    var diameter: CGFloat = 54

    private var fraction: Double {
        guard target > 0 else { return 0 }
        return min(1, Double(done) / Double(target))
    }

    var body: some View {
        VStack(spacing: 5) {
            ZStack {
                Circle().stroke(color.opacity(0.22), lineWidth: 8)
                Circle()
                    .trim(from: 0, to: fraction)
                    .stroke(color, style: StrokeStyle(lineWidth: 8, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                Text("\(done)")
                    .font(.system(size: 19, weight: .bold, design: .rounded))
                    .minimumScaleFactor(0.6)
            }
            .frame(width: diameter, height: diameter)

            Text(label)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .lineLimit(1)
                .minimumScaleFactor(0.7)
        }
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
            background(color)
        }
    }
}

struct FitTogetherWidgetView: View {
    @Environment(\.widgetFamily) private var family
    let entry: Entry

    private var subtitle: String {
        let s = entry.snapshot
        if s.myTarget == 0 { return "Open the app to set a goal" }
        if s.streak > 0 { return "\(s.streak) \(s.streakLabel)" }
        return "\(s.myDays) of \(s.myTarget) this week"
    }

    var body: some View {
        switch family {
        case .accessoryCircular:   CircularView(snapshot: entry.snapshot)
        case .accessoryRectangular: RectangularView(snapshot: entry.snapshot)
        case .accessoryInline:     InlineView(snapshot: entry.snapshot)
        default:                   homeView
        }
    }

    private var homeView: some View {
        let s = entry.snapshot
        return VStack(spacing: family == .systemSmall ? 7 : 9) {
            HStack(spacing: family == .systemSmall ? 12 : 24) {
                Ring(done: s.myDays, target: s.myTarget, color: meColor,
                     label: s.myName, diameter: family == .systemSmall ? 46 : 54)
                if let partner = s.partnerName {
                    Ring(done: s.theirDays, target: s.theirTarget, color: partnerColor,
                         label: partner, diameter: family == .systemSmall ? 46 : 54)
                }
            }

            // He carries the line when there is one, and the mark stands in for
            // him when there is not, so the row never collapses.
            HStack(spacing: 6) {
                if s.quip.isEmpty {
                    UnioMark(size: 15)
                    Text(subtitle)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.75)
                } else {
                    BotFace(size: 17)
                    Text(s.quip)
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(.secondary)
                        .lineLimit(family == .systemSmall ? 2 : 1)
                        .minimumScaleFactor(0.75)
                        .multilineTextAlignment(.leading)
                }
            }
            .frame(maxWidth: .infinity, alignment: .center)
        }
        .padding(family == .systemSmall ? 10 : 14)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .widgetBackground(Color(.systemBackground))
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
            } else if snapshot.streak > 0 {
                Text("\(snapshot.streak) \(snapshot.streakLabel)")
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
        .description("You and your partner, this week.")
        .supportedFamilies([
            .systemSmall, .systemMedium,
            .accessoryCircular, .accessoryRectangular, .accessoryInline,
        ])
    }
}
