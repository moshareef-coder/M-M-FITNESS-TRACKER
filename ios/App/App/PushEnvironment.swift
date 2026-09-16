import Foundation
import Capacitor

// Which APNs gateway minted this device's token.
//
// The web layer cannot know this. JavaScript has no idea how the binary around
// it was signed, and the app shipped with the answer hardcoded to "development"
// because that is what the checked-in entitlements file said. It is not what a
// distribution build does: APNs mints a PRODUCTION token for anything signed
// for TestFlight or the App Store, the sender then aimed at the sandbox
// gateway, and Apple answered BadDeviceToken. A cable install kept working
// throughout, which is how it survived all the way to a submission.
//
// The truth is the aps-environment entitlement baked into the signature, and it
// arrives in the bundle as embedded.mobileprovision. That covers every case the
// build configuration cannot: a Release build on a development profile, a debug
// build signed for ad hoc, an entitlements file nobody remembered to change.
@objc(PushEnvironment)
public class PushEnvironment: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "PushEnvironment"
    public let jsName = "PushEnvironment"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "get", returnType: CAPPluginReturnPromise),
    ]

    @objc func get(_ call: CAPPluginCall) {
        let signed = PushEnvironment.fromProvisioningProfile()
        call.resolve([
            "environment": signed ?? PushEnvironment.buildDefault,
            // Reported so a wrong token in the table can be traced to the thing
            // that decided it, rather than guessed at from a phone we do not
            // have in front of us.
            "source": signed == nil ? "build-config" : "provisioning-profile",
        ])
    }

    /// Only reached when there is no profile to read, which in practice means
    /// the simulator. A device build always has one.
    static var buildDefault: String {
        #if DEBUG
        return "development"
        #else
        return "production"
        #endif
    }

    /// embedded.mobileprovision is a CMS envelope with an XML plist inside it.
    /// Nothing in the SDK will open it, and pulling in a CMS parser to read one
    /// string would be the wrong trade, so the plist is cut out by its own
    /// delimiters. Latin-1 because the envelope is binary and every byte has to
    /// survive the round trip.
    static func fromProvisioningProfile() -> String? {
        guard let url = Bundle.main.url(forResource: "embedded", withExtension: "mobileprovision"),
              let data = try? Data(contentsOf: url),
              let text = String(data: data, encoding: .isoLatin1),
              let start = text.range(of: "<?xml"),
              let end = text.range(of: "</plist>"),
              let xml = String(text[start.lowerBound..<end.upperBound]).data(using: .isoLatin1),
              let plist = try? PropertyListSerialization.propertyList(from: xml, options: [], format: nil),
              let root = plist as? [String: Any],
              let entitlements = root["Entitlements"] as? [String: Any],
              let aps = entitlements["aps-environment"] as? String
        else { return nil }
        // Apple only ever write these two. Anything else is treated as the
        // sandbox, because guessing production for an unknown value would put
        // a token we cannot reach into the table and call it healthy.
        return aps == "production" ? "production" : "development"
    }
}
