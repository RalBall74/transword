const CACHE_NAME = 'transword-app-v1'; // غير الرقم ده لو عايز تجبر المتصفح يحدث الكاش

const CORE_ASSETS = [
    './',
    './index.html',
    './others/style.css',
    './js/app.js',
    './js/languages.js',
    './js/ai-service.js',
    './others/manifest.json',
    './images/icon-192x192.png',
    './images/icon-512x512.jpg'
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // نحمل الملفات الأساسية عشان التطبيق يشتغل أوفلاين من أول تثبيت
            return cache.addAll(CORE_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // 1. طلبات الـ API: نجرب النت الأول، لو مفيش نستخدم الكاش
    if (url.hostname === 'api.mymemory.translated.net' || url.hostname === 'generativelanguage.googleapis.com') {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // نخزن نسخة في الكاش عشان لو النت قطع بعدين
                    if (url.hostname === 'api.mymemory.translated.net') {
                        const clonedResponse = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clonedResponse));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // 2. ملفات التطبيق الأساسية: نستخدم الكاش الأول ونحدث في الخلفية (Stale-While-Revalidate)
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            if (cachedResponse) {
                // حدث الكاش في الباك جراوند بس رد بالنسخة المخزنة فوراً
                fetch(event.request).then(networkResponse => {
                    caches.open(CACHE_NAME).then(cache => cache.put(event.request, networkResponse.clone()));
                }).catch(() => { });
                return cachedResponse;
            }
            // لو مش في الكاش، حمله وخزنه
            return fetch(event.request).then(networkResponse => {
                const clonedResponse = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clonedResponse);
                });
                return networkResponse;
            }).catch(error => {
                console.error('Fetch failed or offline:', error);
            });
        })
    );
});
