import Foundation
import Capacitor
import StoreKit
import UIKit

// Apple's own rating sheet, and nothing else.
//
// A screen of our own asking "do you love Unio?" first is exactly what App
// Store guideline 5.6.1 forbids, so the web side never draws one. It decides
// WHEN (a good moment, an account old enough to have an opinion, not asked
// lately) and this does the one thing JavaScript cannot: hand the request to
// StoreKit.
//
// There is no answer to send back. Apple decides on its own whether the sheet
// actually appears (at most three times in 365 days per person, never in
// TestFlight, always in a debug build), and StoreKit says nothing either way.
// So this resolves with `requested`, not with whether anybody saw anything,
// and the web side records the ask date regardless.
@objc(ReviewBridge)
public class ReviewBridge: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ReviewBridge"
    public let jsName = "ReviewBridge"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "requestReview", returnType: CAPPluginReturnPromise),
    ]

    @objc func requestReview(_ call: CAPPluginCall) {
        DispatchQueue.main.async {
            // The scene the web view lives in. Asking without one is the
            // deprecated call, and on a phone with the app in the background
            // there is no active scene to put a sheet on at all, which is the
            // right moment to do nothing.
            guard let scene = self.bridge?.viewController?.view.window?.windowScene
                ?? UIApplication.shared.connectedScenes
                    .compactMap({ $0 as? UIWindowScene })
                    .first(where: { $0.activationState == .foregroundActive })
            else {
                call.resolve(["requested": false, "reason": "no active scene"])
                return
            }
            // AppStore.requestReview is the current API from iOS 16; the
            // SKStoreReviewController form is deprecated there but is the only
            // one on the iOS 14 and 15 phones this target still installs on.
            if #available(iOS 16.0, *) {
                AppStore.requestReview(in: scene)
            } else {
                SKStoreReviewController.requestReview(in: scene)
            }
            call.resolve(["requested": true])
        }
    }
}
