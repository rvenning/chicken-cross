// Chicken Cross service worker.
// Strategy: network-first with cache fallback (same approach as WordVoyage).
// Online players always get the newest deploy; offline players get the last
// version they loaded. All game data lives in localStorage, so offline play
// loses nothing.

const CACHE = "chickencross-v1";

// App shell precached at install so the game works offline from the first visit.
const SHELL = [
  "./",
  "index.html",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Only same-origin GETs; anything else passes through untouched.
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        // Keep the cache fresh with every successful response.
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches.match(req, { ignoreSearch: true }).then(
          // Offline navigation falls back to the cached app shell.
          (hit) => hit || (req.mode === "navigate" ? caches.match("index.html") : Response.error())
        )
      )
  );
});
