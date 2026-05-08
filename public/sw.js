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

// --- PWA Push Notifications Listener ---
self.addEventListener('push', (event) => {
    let data = { title: 'Zenbourg Staff Update', body: 'New operational dispatch received.' };
    try {
        if (event.data) {
            data = event.data.json();
        }
    } catch (e) {
        if (event.data) {
            data = { title: 'Zenbourg Staff Update', body: event.data.text() };
        }
    }

    const options = {
        body: data.body,
        icon: '/images/icon-192.png',
        badge: '/images/icon-192.png',
        vibrate: [200, 100, 200],
        data: { url: data.url || '/staff' },
        actions: [
            { action: 'open', title: 'View Details' }
        ]
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

// --- Notification Click Actions ---
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const urlToOpen = event.notification.data?.url || '/staff';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url.includes(urlToOpen) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(urlToOpen);
            }
        })
    );
});

/**
 * PWA Eligibility Fix:
 * Chrome requires a 'fetch' event listener to be present.
 */
self.addEventListener('fetch', (event) => {
    // We intentionally do nothing here.
    return;
});
