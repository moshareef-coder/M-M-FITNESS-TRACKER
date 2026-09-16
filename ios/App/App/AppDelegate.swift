import UIKit
import Capacitor
import UserNotifications

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        registerNotificationCategories()
        LiveWorkout.sweepStaleActivities()
        return true
    }

    /// The buttons on a nudge. @capacitor/push-notifications has no
    /// registerActionTypes (that belongs to the local-notifications plugin), so
    /// the categories named by the `category` field in each APNs payload have to
    /// be declared here or the notification arrives with no actions at all.
    ///
    /// Taps still reach the web layer through pushNotificationActionPerformed,
    /// which carries the identifier chosen below.
    private func registerNotificationCategories() {
        let evening = UNNotificationCategory(
            identifier: "EVENING_NUDGE",
            actions: [
                UNNotificationAction(identifier: "start", title: "Start workout", options: [.foreground]),
                // No .foreground: declining should not drag anyone into the app.
                UNNotificationAction(identifier: "later", title: "Not today", options: []),
            ],
            intentIdentifiers: [],
            options: []
        )
        // Your partner just started training. Cheering back is the whole
        // point of the moment, so it is a button rather than a trip into the app.
        let live = UNNotificationCategory(
            identifier: "PARTNER_LIVE",
            actions: [
                UNNotificationAction(identifier: "cheer", title: "Send a cheer", options: []),
                UNNotificationAction(identifier: "watch", title: "Watch", options: [.foreground]),
            ],
            intentIdentifiers: [],
            options: []
        )
        let digest = UNNotificationCategory(
            identifier: "COACH_DIGEST",
            actions: [
                UNNotificationAction(identifier: "open", title: "Open group", options: [.foreground]),
            ],
            intentIdentifiers: [],
            options: []
        )
        UNUserNotificationCenter.current().setNotificationCategories([evening, live, digest])
    }

    func applicationWillResignActive(_ application: UIApplication) {
        // Sent when the application is about to move from active to inactive state. This can occur for certain types of temporary interruptions (such as an incoming phone call or SMS message) or when the user quits the application and it begins the transition to the background state.
        // Use this method to pause ongoing tasks, disable timers, and invalidate graphics rendering callbacks. Games should use this method to pause the game.
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        // Use this method to release shared resources, save user data, invalidate timers, and store enough application state information to restore your application to its current state in case it is terminated later.
        // If your application supports background execution, this method is called instead of applicationWillTerminate: when the user quits.
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        // Called as part of the transition from the background to the active state; here you can undo many of the changes made on entering the background.
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // Restart any tasks that were paused (or not yet started) while the application was inactive. If the application was previously in the background, optionally refresh the user interface.
        // A Live Activity outlives the process that started it, so a force quit
        // leaves a card on the Lock Screen that nothing in the app was ever
        // looking for. The web layer ends the ones it knows about; this is the
        // backstop for the ones it cannot know about.
        LiveWorkout.sweepStaleActivities()
    }

    func applicationWillTerminate(_ application: UIApplication) {
        // Called when the application is about to terminate. Save data if appropriate. See also applicationDidEnterBackground:.
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        // Called when the app was launched with a url. Feel free to add additional processing here,
        // but if you want the App API to support tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        // Called when the app was launched with an activity, including Universal Links.
        // Feel free to add additional processing here, but if you want the App API to support
        // tracking app url opens, make sure to keep this call
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

}
