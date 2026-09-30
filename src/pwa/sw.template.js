// OutreachXP service worker: keeps a copy of the app so it opens and works offline.
// Built by scripts/pwa.ts, which fills in the version and the list of files to save.
// Game data is not stored here; it lives in IndexedDB.

const VERSION = __VERSION__;
const FILES = __FILES__;
const CACHE = `outreachxp-${VERSION}`;

self.addEventListener('install', (event) => {
  // Save every file up front. A new version waits until the player chooses to reload.
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(FILES.map((f) => new URL(f, self.registration.scope)))));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('outreachxp-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;

  event.respondWith((async () => {
    // Saved files are looked up by address alone: the browser adds headers (like Origin)
    // that the saved copies were not fetched with.
    const cache = await caches.open(CACHE);
    if (request.mode === 'navigate') {
      // Pages come from the saved copy so the app and its files always match.
      const page = url.pathname === scope.pathname ? 'index.html' : url.pathname.slice(scope.pathname.length);
      const saved = await cache.match(new URL(page, scope), { ignoreVary: true }) ?? await cache.match(new URL('index.html', scope), { ignoreVary: true });
      if (saved) return saved;
    } else {
      const saved = await cache.match(request, { ignoreSearch: true, ignoreVary: true });
      if (saved) return saved;
    }
    return fetch(request);
  })());
});
