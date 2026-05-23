const CACHE_NAME = 'fintrack-cache-v4';
const APP_SHELL = [
  '/',
  '/index.html',
  '/auth',
  '/manifest.webmanifest',
  '/fintrack-logo.svg',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

function isStaticAsset(requestUrl) {
  return (
    requestUrl.origin === self.location.origin &&
    (requestUrl.pathname.startsWith('/assets/') ||
      requestUrl.pathname.endsWith('.js') ||
      requestUrl.pathname.endsWith('.css') ||
      requestUrl.pathname.endsWith('.svg') ||
      requestUrl.pathname.endsWith('.png') ||
      requestUrl.pathname.endsWith('.webmanifest'))
  );
}

function getAssetPathsFromHtml(html) {
  return [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => match[1])
    .filter((path) => path.startsWith('/'))
    .filter(
      (path) =>
        path.startsWith('/assets/') ||
        path.endsWith('.js') ||
        path.endsWith('.css') ||
        path.endsWith('.svg') ||
        path.endsWith('.png') ||
        path.endsWith('.webmanifest')
    );
}

async function cacheAssetsFromHtml(response) {
  try {
    const html = await response.clone().text();
    const assetPaths = [...new Set(getAssetPathsFromHtml(html))];

    if (!assetPaths.length) {
      return;
    }

    const cache = await caches.open(CACHE_NAME);
    await Promise.all(
      assetPaths.map(async (path) => {
        try {
          const assetResponse = await fetch(path, { cache: 'no-cache' });
          if (assetResponse.ok) {
            await cache.put(path, assetResponse);
          }
        } catch {
          // Ignore asset fetch failures so the app shell can still load.
        }
      })
    );
  } catch {
    // Ignore HTML parsing failures and keep the app shell available.
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }

  const requestUrl = new URL(event.request.url);

  if (!requestUrl.protocol.startsWith('http')) {
    return;
  }

  if (isNavigationRequest(event.request)) {
    event.respondWith(
      fetch(event.request)
        .then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_NAME);
            await cache.put('/index.html', response.clone());
            await cache.put('/', response.clone());
            await cache.put(event.request, response.clone());
            await cacheAssetsFromHtml(response);
          }
          return response;
        })
        .catch(async () => {
          const cachedApp = await caches.match('/index.html');
          return cachedApp ?? caches.match('/');
        })
    );
    return;
  }

  if (isStaticAsset(requestUrl)) {
    event.respondWith(
      caches.match(event.request).then(async (cached) => {
        const networkFetch = fetch(event.request)
          .then((response) => {
            if (response.ok) {
              const cloned = response.clone();
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, cloned));
            }
            return response;
          })
          .catch(() => cached);

        return cached ?? networkFetch;
      })
    );
    return;
  }

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
