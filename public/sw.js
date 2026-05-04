const CACHE_NAME = 'zenbourg-v1';

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    return self.clients.claim();
});

/**
 * PWA Eligibility Fix:
 * Chrome requires a 'fetch' event listener to be present.
 * To avoid any possibility of interfering with Next.js hydration or chunk loading
 * (which causes "Application error: a client-side exception has occurred"),
 * we implement an EMPTY fetch handler.
 * 
 * By NOT calling event.respondWith(), we allow the browser to handle the 
 * request normally (bypass the service worker). This fulfills the PWA 
 * requirement without the risk of cache-misses or malformed responses.
 */
self.addEventListener('fetch', (event) => {
    // We intentionally do nothing here.
    // The mere existence of this listener satisfies the PWA criteria.
    return;
});
