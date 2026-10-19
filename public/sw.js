// Ssewasswa School ERP — Service Worker
// Cache-first for static assets, network-first for HTML (so updates are picked up)

const CACHE_NAME = "ssewasswa-erp-v21";
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/ssewasswa-comforts-school-erp-mark.png",
  "/ssewasswa-comforts-technologies-logo.png",
  "/manifest.json",
  "/offline.html"
];

// Install: pre-cache critical static assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    ))
  );
  self.clients.claim();
});

// Fetch: network-first for HTML, cache-first for assets
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  // Skip cross-origin requests (Supabase, Cloudflare, etc.)
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Skip /api/ requests — they need fresh data
  if (url.pathname.startsWith("/api/")) return;

  // Network-first for HTML documents
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match("/offline.html")))
    );
    return;
  }

  // Cache-first for static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
      return res;
    }).catch(() => cached))
  );
});
