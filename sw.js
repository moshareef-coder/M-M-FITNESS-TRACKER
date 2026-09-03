/* Fit Together service worker.
   Deliberately network-first for the app shell so a deploy is never masked by
   a stale cached page, and cache-first only for static icons. */
const CACHE = "fit-together-2026.09.03.2";
const STATIC_ASSETS = [
  "/icon-192.png",
  "/icon-512.png",
  "/icon-maskable-512.png",
  "/manifest.webmanifest",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(STATIC_ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Never intercept Supabase: auth, data and signed photo URLs must stay live.
  if (url.origin !== self.location.origin) return;

  const isStatic = STATIC_ASSETS.some((p) => url.pathname === p);
  if (isStatic) {
    event.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  // App shell: network first, fall back to cache only when offline.
  event.respondWith(
    fetch(req)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(req, copy));
        return resp;
      })
      .catch(() => caches.match(req)),
  );
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
