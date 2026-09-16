import SwiftUI

// The app's own mark, drawn rather than imported, so it stays crisp at 16 points
// and can be tinted where the system demands monochrome.
//
// Two arcs with a gap top and bottom, a dumbbell across the middle. An earlier
// version drew the arcs alone as a progress ring, which read as an anonymous
// circle: without the dumbbell there is nothing to recognise.

enum Unio {
    static let me = Color(red: 0.176, green: 0.420, blue: 1.0)      // #2d6bff
    static let partner = Color(red: 1.0, green: 0.420, blue: 0.290) // #ff6b4a
    static let lime = Color(red: 0.659, green: 1.0, blue: 0.0)      // #a8ff00
    static let ink = Color.white
}

/// Degrees, clockwise, zero at twelve o'clock, which is how the mark is
/// described rather than how SwiftUI numbers its trim.
struct Arc: Shape {
    var from: Double
    var to: Double

    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.addArc(
            center: CGPoint(x: rect.midX, y: rect.midY),
            radius: min(rect.width, rect.height) / 2,
            startAngle: .degrees(from - 90),
            endAngle: .degrees(to - 90),
            clockwise: false
        )
        return path
    }
}

/// The real artwork, lifted off its background and shipped in the asset
/// catalogue. Used anywhere colour survives, which is everywhere except the
/// Lock Screen accessory families.
struct UnioMark: View {
    var size: CGFloat = 26

    var body: some View {
        Image("UnioMark")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
    }
}

/// The drawn fallback, for surfaces the system renders monochrome. The image
/// would flatten to a white blob there; strokes keep the ring and the bar
/// distinguishable.
struct UnioMarkDrawn: View {
    var size: CGFloat = 26
    var monochrome: Bool = true

    private var stroke: CGFloat { max(2, size * 0.11) }
    // Below this the dumbbell is three muddy pixels and the ring reads better
    // on its own.
    private var showsBar: Bool { size >= 22 }

    var body: some View {
        ZStack {
            Arc(from: 190, to: 350)
                .stroke(monochrome ? Color.primary : Unio.me,
                        style: StrokeStyle(lineWidth: stroke, lineCap: .round))
            Arc(from: 10, to: 170)
                .stroke(monochrome ? Color.primary.opacity(0.55) : Unio.partner,
                        style: StrokeStyle(lineWidth: stroke, lineCap: .round))

            if showsBar {
                ZStack {
                    Capsule()
                        .fill(monochrome ? Color.primary : Unio.ink.opacity(0.92))
                        .frame(width: size * 0.40, height: size * 0.11)
                    HStack(spacing: size * 0.27) {
                        plate
                        plate
                    }
                }
            }
        }
        .frame(width: size, height: size)
    }

    private var plate: some View {
        RoundedRectangle(cornerRadius: size * 0.035)
            .fill(monochrome ? Color.primary : Unio.lime)
            .frame(width: size * 0.085, height: size * 0.27)
    }
}

/// The actual character, captured from the motion rig by
/// scripts/render-bot-faces.py rather than drawn here. An earlier hand-drawn
/// version was a circle with two dots and looked nothing like him.
///
/// Two moods, because those are the two states the widget has: getting on with
/// it, and reacting to a set you just logged.
struct BotFace: View {
    var size: CGFloat = 26
    var happy: Bool = false

    var body: some View {
        Image(happy ? "BotHappy" : "BotNeutral")
            .resizable()
            .aspectRatio(contentMode: .fit)
            .frame(width: size, height: size)
    }
}
