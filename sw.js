/* Fit Together service worker.

   The app used to be network-first for everything it serves itself, which
   meant every launch re-downloaded the whole shell, the anatomy modules and a
   338 KB .riv before anything appeared. Now:

     immutable assets (/vendor, the .riv, icons)  cache first, they never change
     the anatomy and formula modules              cache first, refreshed behind you
     the app shell                                cache first, refreshed behind you

   A deploy is still never masked: it ships a new sw.js with a new cache name,
   which drops this cache on activate, and the page reloads itself when the new
   worker takes over. */
const CACHE = "fit-together-2026.09.04.37";
/* Version named or content named files live outside the versioned cache, so a
   deploy does not throw away the 2 MB Rive wasm and the .riv and make the next
   launch download them all over again. */
const ASSETS = "fit-together-assets-v1";
const KEEP = new Set([CACHE, ASSETS]);
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/manifest.webmanifest",
];
/* Named by version or by content, so a hit is always the right file. */
const IMMUTABLE = [/^\/vendor\//, /\.riv$/, /\.wasm$/, /^\/badges\//, /\.png$/];
const CODE = [/^\/knowledge\//];
const isShell = (url) => url.pathname === "/" || url.pathname === "/index.html";
const matches = (list, url) => list.some((re) => re.test(url.pathname));

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(ASSETS).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

/* Serve what we have, then quietly fetch a fresh copy for next time. A deploy
   still cannot be missed: it ships a new sw.js, whose cache name is different,
   so this cache is dropped on activate and the app reloads itself the moment
   the new worker takes over. */
async function staleWhileRevalidate(req) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((resp) => {
      if (resp && resp.ok) cache.put(req, resp.clone());
      return resp;
    })
    .catch(() => hit);
  return hit || fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never intercept Supabase: auth, data and signed photo URLs must stay live.
  if (url.origin !== self.location.origin) return;
  // The worker itself must always come from the network, or a deploy could
  // never replace the worker that is caching everything else.
  if (url.pathname === "/sw.js") return;

  if (STATIC_ASSETS.includes(url.pathname) || matches(IMMUTABLE, url)) {
    event.respondWith(caches.open(ASSETS).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const resp = await fetch(req);
      if (resp && resp.ok) c.put(req, resp.clone());
      return resp;
    }));
    return;
  }

  if (isShell(url) || matches(CODE, url)) {
    event.respondWith(staleWhileRevalidate(req));
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

/* Push groundwork. Wired now so the native/push step later only needs
   a subscription and a sender, not a service worker rewrite. */
self.addEventListener("push", (event) => {
  let payload = { title: "Fit Together", body: "Your partner just logged a workout." };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch { /* keep default */ }
  event.waitUntil(self.registration.showNotification(payload.title, {
    body: payload.body,
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: payload.url || "/" },
  }));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      const existing = list.find((c) => c.url.includes(self.location.origin));
      if (existing) return existing.focus();
      return self.clients.openWindow(target);
    }),
  );
});
