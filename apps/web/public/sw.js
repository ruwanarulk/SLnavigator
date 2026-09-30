// Offline support: network-first for pages and trip data, falling back to the
// last copy seen, so a saved itinerary still opens without signal.
const CACHE = "sln-v1";
const OFFLINE_API = [/^\/api\/trips/, /^\/api\/locations/, /^\/api\/itineraries/, /^\/api\/fx/];

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === "navigate";
  const isStatic = url.pathname.startsWith("/_next/static/");
  const isApi = OFFLINE_API.some((re) => re.test(url.pathname));
  if (!isPage && !isStatic && !isApi) return;

  if (isStatic) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
            return res;
          }),
      ),
    );
    return;
  }

  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || Response.error())),
  );
});
