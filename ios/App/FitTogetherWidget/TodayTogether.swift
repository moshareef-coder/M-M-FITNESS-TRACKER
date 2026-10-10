import SwiftUI

// "Today, together": the Home Screen widget Mo picked on 2026-10-08, after
// calling the two plain rings it replaces horrendous.
//
// Both of you in your rings with your initials inside, the way Home draws you,
// the streak you share above them, and one line under them that says what
// today still needs. Medium adds the week as two dots a day.
//
// Nothing in here imports WidgetKit, on purpose: it is plain SwiftUI over a
// decoded snapshot, so the same views can be rendered to a PNG on a Mac to be
// looked at without a phone. The widget plumbing lives in
// FitTogetherWidget.swift.

/// What the app last handed over. Written by pushWidgetSnapshot() in
/// index.html, which is where every line and number here is decided, so the
/// widget and the app cannot disagree about whether somebody trained today.
struct Snapshot: Decodable {
    var myName = "You"
    var myDays = 0
    var myTarget = 0
    var partnerName: String?
    var theirDays = 0
    var theirTarget = 0
    var streak = 0
    var streakLabel = ""
    var quip = ""

    // ---- added for "Today, together" ----
    var myInitials = ""
    var partnerInitials = ""
    /// "4 days together", or "4 days" when training alone. Empty means no
    /// streak, which is a real state and not a missing one.
    var streakText = ""
    /// Whether the streak is still standing at midnight on what is logged
    /// now. The app decides it; the widget only needs it for the night it
    /// redraws without the app having been opened.
    var streakHolds = false
    /// The local date the snapshot was taken, yyyy-MM-dd. Lets the widget tell
    /// that "Both done today" was about yesterday.
    var day = ""
    /// Monday is 0.
    var todayIndex = -1
    var myWeek: [Bool] = []
    var partnerWeek: [Bool]?
    var stateLine = ""

    init() {}

    /// Every key is optional, written out by hand because Swift's synthesized
    /// decoding ignores a property's default and throws on a missing key. A
    /// payload from a build before any of these fields existed would then fail
    /// whole and the widget would draw the empty state over a real week.
    init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: Keys.self)
        func get<T: Decodable>(_ key: Keys, _ fallback: T) -> T {
            ((try? c.decodeIfPresent(T.self, forKey: key)) ?? nil) ?? fallback
        }
        myName = get(.myName, "You")
        myDays = get(.myDays, 0)
        myTarget = get(.myTarget, 0)
        partnerName = get(.partnerName, nil as String?)
        theirDays = get(.theirDays, 0)
        theirTarget = get(.theirTarget, 0)
        streak = get(.streak, 0)
        streakLabel = get(.streakLabel, "")
        quip = get(.quip, "")
        myInitials = get(.myInitials, "")
        partnerInitials = get(.partnerInitials, "")
        streakText = get(.streakText, "")
        streakHolds = get(.streakHolds, false)
        day = get(.day, "")
        todayIndex = get(.todayIndex, -1)
        myWeek = get(.myWeek, [])
        partnerWeek = get(.partnerWeek, nil as [Bool]?)
        stateLine = get(.stateLine, "")
    }

    private enum Keys: String, CodingKey {
        case myName, myDays, myTarget, partnerName, theirDays, theirTarget
        case streak, streakLabel, quip
        case myInitials, partnerInitials, streakText, streakHolds, day
        case todayIndex, myWeek, partnerWeek, stateLine
    }

    /// What a phone shows before the app has ever been opened, or if the blob
    /// is unreadable. Zeroes are honest here: nothing is known yet.
    static let empty = Snapshot()

    var myFraction: Double {
        guard myTarget > 0 else { return 0 }
        return min(1, Double(myDays) / Double(myTarget))
    }

    var theirFraction: Double {
        guard theirTarget > 0 else { return 0 }
        return min(1, Double(theirDays) / Double(theirTarget))
    }
}

/// The same rule as initials() in index.html, for a payload that predates the
/// app sending them.
func unioInitials(_ name: String) -> String {
    let words = name.split(whereSeparator: { $0.isWhitespace })
    if words.count > 1, let a = words[0].first, let b = words[1].first {
        return "\(a)\(b)".uppercased()
    }
    return String(name.trimmingCharacters(in: .whitespaces).prefix(2)).uppercased()
}

/// The snapshot as it reads at a particular moment.
///
/// A widget redraws on its own schedule, and the app is the only thing that
/// can recompute anything. So when the clock has moved past the day the app
/// last wrote, this rolls the snapshot forward with the little it can be sure
/// of: a new day has nobody trained in it yet, a new week starts empty, and a
/// streak that needed today to survive is no longer quoted. The app corrects
/// all of it the moment it is opened.
struct TodayModel {
    let together: Bool
    let myInitials: String
    let partnerInitials: String
    let myFraction: Double
    let theirFraction: Double
    let streakText: String
    let line: String
    let todayIndex: Int
    let myWeek: [Bool]
    let partnerWeek: [Bool]?
    /// Nothing has ever been handed over, so there is nobody to draw.
    let blank: Bool
    /// An older payload carries no days at all. Seven empty dots would say
    /// nobody trained this week, so the strip is left out instead.
    let hasWeek: Bool

    init(_ s: Snapshot, at date: Date = Date(), calendar: Calendar = .current) {
        together = s.partnerName != nil
        hasWeek = s.myWeek.count == 7
        blank = s.myTarget == 0 && s.day.isEmpty && s.myName == "You"
        myInitials = blank ? "" : (s.myInitials.isEmpty ? unioInitials(s.myName) : s.myInitials)
        partnerInitials = s.partnerInitials.isEmpty ? unioInitials(s.partnerName ?? "") : s.partnerInitials

        let week = { (flags: [Bool]?) -> [Bool]? in
            guard let flags else { return nil }
            return flags.count == 7 ? flags : Array(repeating: false, count: 7)
        }
        var myWeek = week(s.myWeek) ?? Array(repeating: false, count: 7)
        var partnerWeek = together ? (week(s.partnerWeek) ?? Array(repeating: false, count: 7)) : nil
        var myDays = s.myDays, theirDays = s.theirDays
        var todayIndex = s.todayIndex
        var streakText = s.streakText
        var line = s.stateLine

        // Days between the snapshot and now, in the phone's own calendar.
        let passed: Int = {
            guard let taken = TodayModel.parse(s.day, calendar) else { return 0 }
            let from = calendar.startOfDay(for: taken), to = calendar.startOfDay(for: date)
            return max(0, calendar.dateComponents([.day], from: from, to: to).day ?? 0)
        }()

        if passed > 0 {
            let rolled = todayIndex + passed
            if todayIndex < 0 || rolled > 6 {
                // A new week. Every ring starts empty on a Monday, whatever
                // happened last week.
                myWeek = Array(repeating: false, count: 7)
                partnerWeek = partnerWeek.map { _ in Array(repeating: false, count: 7) }
                myDays = 0
                theirDays = 0
                todayIndex = (calendar.component(.weekday, from: date) + 5) % 7
            } else {
                todayIndex = rolled
            }
            // One night is the only gap the app's answer covers. Past that,
            // a number is a guess, and a wrong streak is worse than none.
            if passed > 1 || !s.streakHolds { streakText = "" }
            line = together ? "Nobody's trained yet today." : "\(myDays) of \(s.myTarget) this week."
        }

        if line.isEmpty {
            // A payload from before the state line existed, or the empty one.
            if blank { line = "Open Unio to get started." }
            else if s.myTarget == 0 { line = "Open Unio to set a goal." }
            else if let partner = s.partnerName {
                line = "You \(myDays), \(partner) \(theirDays) this week."
            } else { line = "\(myDays) of \(s.myTarget) this week." }
        }
        if streakText.isEmpty && passed == 0 && s.day.isEmpty && s.streak > 0 {
            // Older payloads only had the number and a label meant for Home.
            streakText = "\(s.streak) day\(s.streak == 1 ? "" : "s")\(together ? " together" : "")"
        }

        self.myWeek = myWeek
        self.partnerWeek = partnerWeek
        self.todayIndex = todayIndex
        self.streakText = streakText
        self.line = line
        self.myFraction = s.myTarget > 0 ? min(1, Double(myDays) / Double(s.myTarget)) : 0
        self.theirFraction = s.theirTarget > 0 ? min(1, Double(theirDays) / Double(s.theirTarget)) : 0
    }

    static func parse(_ day: String, _ calendar: Calendar) -> Date? {
        let parts = day.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return calendar.date(from: DateComponents(year: parts[0], month: parts[1], day: parts[2]))
    }
}

// MARK: - Drawing

/// Home's ring: the week's fill around the person's initials, in their colour.
struct InitialsRing: View {
    let initials: String
    let fraction: Double
    let color: Color
    let ink: Color
    var diameter: CGFloat = 54
    var lineWidth: CGFloat = 6

    var body: some View {
        ZStack {
            Circle().stroke(color.opacity(0.22), lineWidth: lineWidth)
            Circle()
                .trim(from: 0, to: fraction)
                .stroke(color, style: StrokeStyle(lineWidth: lineWidth, lineCap: .round))
                .rotationEffect(.degrees(-90))
            Text(initials)
                .font(.system(size: (diameter / 4.2).rounded(), weight: .bold, design: .rounded))
                .foregroundStyle(ink)
                .lineLimit(1)
                .minimumScaleFactor(0.6)
                .padding(lineWidth + 2)
        }
        .frame(width: diameter, height: diameter)
    }
}

/// The streak, with the lime flame Home uses. With no streak the row still
/// holds its place, so the rings do not jump up the card on the day one ends.
struct StreakRow: View {
    let text: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: "flame.fill")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(text.isEmpty ? Unio.muted : Unio.lime)
            Text(text.isEmpty ? "This week" : text)
                .font(.system(size: 12, weight: .bold))
                .foregroundStyle(text.isEmpty ? Unio.muted : Unio.text)
                .lineLimit(1)
                .minimumScaleFactor(0.8)
        }
    }
}

struct PairRings: View {
    let model: TodayModel
    let diameter: CGFloat
    let lineWidth: CGFloat
    let spacing: CGFloat

    var body: some View {
        HStack(spacing: spacing) {
            InitialsRing(initials: model.myInitials, fraction: model.myFraction,
                         color: Unio.me, ink: Unio.meInk,
                         diameter: diameter, lineWidth: lineWidth)
            if model.together {
                InitialsRing(initials: model.partnerInitials, fraction: model.theirFraction,
                             color: Unio.partner, ink: Unio.partnerInk,
                             diameter: diameter, lineWidth: lineWidth)
            }
        }
    }
}

/// Seven days, two dots each: you on top, your partner under you. One row
/// when you train alone, because an empty second row reads as somebody
/// missing.
struct WeekStrip: View {
    let model: TodayModel
    private static let letters = ["M", "T", "W", "T", "F", "S", "S"]

    var body: some View {
        HStack(spacing: 0) {
            ForEach(0..<7, id: \.self) { i in
                VStack(spacing: 3) {
                    Text(Self.letters[i])
                        .font(.system(size: 9, weight: i == model.todayIndex ? .bold : .medium))
                        .foregroundStyle(i == model.todayIndex ? Unio.text : Unio.muted)
                    dot(model.myWeek[i] ? Unio.me : Unio.dotOff)
                    if let theirs = model.partnerWeek {
                        dot(theirs[i] ? Unio.partner : Unio.dotOff)
                    }
                }
                .frame(maxWidth: .infinity)
            }
        }
    }

    private func dot(_ color: Color) -> some View {
        Circle().fill(color).frame(width: 9, height: 9)
    }
}

struct TodaySmall: View {
    let model: TodayModel

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            StreakRow(text: model.streakText)
            Spacer(minLength: 6)
            PairRings(model: model, diameter: 54, lineWidth: 6, spacing: 8)
            Spacer(minLength: 6)
            Text(model.line)
                .font(.system(size: 12.5, weight: .semibold))
                .foregroundStyle(Unio.text)
                .lineLimit(2)
                .minimumScaleFactor(0.85)
                .fixedSize(horizontal: false, vertical: true)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .leading)
    }
}

struct TodayMedium: View {
    let model: TodayModel

    var body: some View {
        HStack(spacing: 14) {
            PairRings(model: model, diameter: 62, lineWidth: 7, spacing: 12)
            VStack(alignment: .leading, spacing: 8) {
                StreakRow(text: model.streakText)
                Text(model.line)
                    .font(.system(size: 13.5, weight: .semibold))
                    .foregroundStyle(Unio.text)
                    .lineLimit(2)
                    .minimumScaleFactor(0.85)
                    .fixedSize(horizontal: false, vertical: true)
                if model.hasWeek { WeekStrip(model: model) }
            }
            .frame(maxWidth: .infinity, alignment: .leading)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
