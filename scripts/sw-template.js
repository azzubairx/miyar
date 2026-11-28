/* Miyar service worker template. The build injects the precache list and version. */
const PRECACHE = self.__MIYAR_PRECACHE__ || [];
const VERSION = self.__MIYAR_VERSION__ || 'dev';
const SHELL_CACHE = `miyar-shell-${VERSION}`;
const RUNTIME_CACHE = `miyar-runtime-${VERSION}`;

const RUNTIME_PATHS = ['/assets/', '/fonts/', '/ocr/'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      await Promise.allSettled(
        PRECACHE.map(async (url) => {
          try {
            await cache.add(new Request(url, { cache: 'reload' }));
          } catch {
            /* A single missing asset must not block the whole install. */
          }
        }),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== SHELL_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      );
      await self.clients.claim();
    })(),
  );
});

function isRuntimeAsset(url) {
  return RUNTIME_PATHS.some((path) => url.pathname.includes(path));
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          const fallback = await caches.match(new URL('./index.html', self.registration.scope).href);
          return fallback || Response.error();
        }
      })(),
    );
    return;
  }

  if (!isRuntimeAsset(url)) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response.ok) {
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(request, response.clone());
        }
        return response;
      } catch {
        return new Response(
          'هذا الملف غير متوفر دون اتصال بعد. اتصل بالإنترنت مرة واحدة لتنزيل محرك OCR.',
          { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
        );
      }
    })(),
  );
});
