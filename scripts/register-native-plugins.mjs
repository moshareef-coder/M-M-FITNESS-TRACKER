// Registers this app's own Swift plugins with Capacitor.
//
// Capacitor 7 builds its plugin registry solely from `packageClassList` in the
// synced capacitor.config.json, and it fills that list by scanning node_modules.
// There is no runtime scan for CAPPlugin subclasses, so a plugin that lives in
// the app target rather than in a package is never registered, and the JS side
// silently sees `window.Capacitor.Plugins.X` as undefined. That is exactly how
// the Live Activity failed: no error, no log, nothing at all.
//
// `npx cap sync` rewrites that list every time and discards anything added to
// the root config, so this has to run after it. package.json chains it onto
// cap:sync for that reason.

import { readFileSync, writeFileSync } from "node:fs";

const CONFIG = "ios/App/App/capacitor.config.json";

// Each name is the @objc(...) name on the Swift class, which is what
// NSClassFromString resolves against.
const LOCAL_PLUGINS = ["LiveWorkout", "WidgetBridge", "PushEnvironment"];

const config = JSON.parse(readFileSync(CONFIG, "utf8"));
const list = config.packageClassList ?? [];
const missing = LOCAL_PLUGINS.filter((name) => !list.includes(name));

if (!missing.length) {
  console.log(`native plugins already registered (${list.length} total)`);
} else {
  config.packageClassList = [...list, ...missing];
  writeFileSync(CONFIG, JSON.stringify(config, null, 2) + "\n");
  console.log(`registered ${missing.join(", ")} (${config.packageClassList.length} total)`);
}
