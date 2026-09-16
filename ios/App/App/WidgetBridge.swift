import Foundation
import Capacitor
import WidgetKit

// The app is a web view and the widget is a separate SwiftUI process, so they
// share nothing by default. This is the one road between them: the web side
// hands over a small JSON blob, it lands in the App Group container both
// targets can see, and the widget is told to redraw.
//
// @capacitor/preferences cannot do this job. Its `group` option is only a key
// prefix on UserDefaults.standard, which the widget process cannot read.
@objc(WidgetBridge)
public class WidgetBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "WidgetBridge"
    public let jsName = "WidgetBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "save", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainPendingSets", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "drainPendingEdits", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "clear", returnType: CAPPluginReturnPromise),
    ]

    static let appGroup = "group.com.creativelab1.fittogether"
    static let payloadKey = "fitTogetherSnapshot"
    // Sets logged from the Lock Screen land here. The button runs in the widget
    // process and cannot reach the web view, so the app collects them when it
    // next comes to the front.
    static let pendingSetsKey = "pendingSetLogs"
    // Who the Lock Screen is logging for, written by LiveWorkout.
    static let ownerKey = "sessionOwner"
    static let quipPoolKey = "quipPool"
    // Weight and rep changes made from the expanded Dynamic Island.
    static let pendingEditsKey = "pendingLoadEdits"
    // Nothing queued survives half a day. Past that the workout it belonged to
    // is over whatever else the owner says.
    static let defaultMaxAge: Double = 12 * 3600

    /// Hands over the sets logged from the Lock Screen that belong to the
    /// workout asking for them, and empties the queue in the same step.
    ///
    /// Two rules, both of which used to be missing. A tap is only replayed for
    /// the owner it was stamped with, so one account's taps can never land in
    /// the next account's workout on the same phone; and a tap older than
    /// `maxAgeSeconds` is dropped, so yesterday's taps cannot arrive as phantom
    /// sets in today's session.
    ///
    /// The queue is cleared whole every time, matches and misses alike. A tap
    /// that is not owed to this workout is not owed to a later one either, and
    /// leaving it behind is how the queue became a place things accumulate.
    @objc func drainPendingSets(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: WidgetBridge.appGroup) else {
            call.resolve(["count": 0, "dropped": 0])
            return
        }
        let queued = defaults.array(forKey: WidgetBridge.pendingSetsKey) as? [[String: Any]] ?? []
        if defaults.object(forKey: WidgetBridge.pendingSetsKey) != nil {
            defaults.removeObject(forKey: WidgetBridge.pendingSetsKey)
        }
        let owner = call.getString("owner") ?? ""
        // No workout open. Everything queued is by definition somebody else's
        // or something else's, so the call is still worth making: it is what
        // takes the rubbish out.
        guard !owner.isEmpty else {
            call.resolve(["count": 0, "dropped": queued.count])
            return
        }
        let maxAge = call.getDouble("maxAgeSeconds") ?? WidgetBridge.defaultMaxAge
        let now = Date().timeIntervalSince1970
        let mine = queued.filter { entry in
            guard entry["owner"] as? String == owner, let at = entry["at"] as? Double else { return false }
            return now - at <= maxAge
        }
        /* Two kinds of tap live in this queue now and they are not
           interchangeable: replaying "move to the next lift" as a logged set
           would invent a set nobody did. Anything unlabelled came from a build
           before the split, when every tap was a set. */
        let sets = mine.filter { ($0["kind"] as? String ?? "set") == "set" }.count
        let advances = mine.filter { ($0["kind"] as? String) == "next" }.count
        call.resolve(["count": sets, "advances": advances,
                      "dropped": queued.count - mine.count])
    }

    /// Load changes made from the island, for the workout asking for them.
    ///
    /// Same two rules as the set queue: an edit is only replayed for the owner
    /// it was stamped with, and one older than maxAgeSeconds is dropped, so a
    /// change made yesterday cannot rewrite today's numbers. The queue is
    /// cleared whole, matches and misses alike.
    @objc func drainPendingEdits(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: WidgetBridge.appGroup) else {
            call.resolve(["edits": [], "dropped": 0])
            return
        }
        let queued = defaults.array(forKey: WidgetBridge.pendingEditsKey) as? [[String: Any]] ?? []
        if defaults.object(forKey: WidgetBridge.pendingEditsKey) != nil {
            defaults.removeObject(forKey: WidgetBridge.pendingEditsKey)
        }
        let owner = call.getString("owner") ?? ""
        guard !owner.isEmpty else {
            call.resolve(["edits": [], "dropped": queued.count])
            return
        }
        let maxAge = call.getDouble("maxAgeSeconds") ?? WidgetBridge.defaultMaxAge
        let now = Date().timeIntervalSince1970
        let mine = queued.filter { entry in
            guard entry["owner"] as? String == owner, let at = entry["at"] as? Double else { return false }
            return now - at <= maxAge
        }
        let edits = mine.compactMap { entry -> [String: Any]? in
            guard let field = entry["field"] as? String, let delta = entry["delta"] as? Int else { return nil }
            return ["field": field, "delta": delta]
        }
        call.resolve(["edits": edits, "dropped": queued.count - mine.count])
    }

    /// Everything this phone holds for the account that is leaving.
    ///
    /// The snapshot outlives the account without this: the widget went on
    /// drawing the previous person's name and counts after a sign-out, and the
    /// deleted person's after a deletion, because nothing had ever been asked
    /// to overwrite it. The App Group is not localStorage, so clearing the web
    /// side never touched it.
    @objc func clear(_ call: CAPPluginCall) {
        guard let defaults = UserDefaults(suiteName: WidgetBridge.appGroup) else {
            call.resolve()
            return
        }
        for key in [WidgetBridge.payloadKey, WidgetBridge.pendingSetsKey,
                    WidgetBridge.ownerKey, WidgetBridge.quipPoolKey,
                    WidgetBridge.pendingEditsKey] {
            defaults.removeObject(forKey: key)
        }
        // Back to the empty state, which is the right thing for a phone with
        // nobody signed in on it.
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }

    @objc func save(_ call: CAPPluginCall) {
        guard let json = call.getString("json") else {
            call.reject("json is required")
            return
        }
        guard let defaults = UserDefaults(suiteName: WidgetBridge.appGroup) else {
            // Returns nil when the App Group is missing from the entitlement,
            // which is a build configuration problem and not a runtime one.
            call.reject("App Group \(WidgetBridge.appGroup) is not available")
            return
        }
        defaults.set(json, forKey: WidgetBridge.payloadKey)
        WidgetCenter.shared.reloadAllTimelines()
        call.resolve()
    }
}
