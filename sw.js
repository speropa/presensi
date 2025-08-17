// File service worker utama Anda
// Logika caching Anda tetap di sini untuk fungsionalitas offline.

const CACHE_NAME = 'presensi-guru-cache-v6'; // Versi cache dinaikkan
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg',
    // Menambahkan library Firebase ke cache
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'
];

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;

    // Selalu coba ambil dari jaringan dulu untuk data Firebase
    if (request.url.includes('firebasedatabase.app')) {
        event.respondWith(
            fetch(request).catch(() => {
                // Jika gagal (offline), tidak mengembalikan apa-apa dari cache untuk data
                // Aplikasi akan menangani ini dengan data lokal
                return new Response(null, { status: 503, statusText: 'Service Unavailable' });
            })
        );
        return;
    }

    // Untuk aset lain, gunakan strategi cache-first
    event.respondWith(
        caches.match(request)
            .then(cachedResponse => {
                // Jika ada di cache, langsung kembalikan
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Jika tidak, ambil dari jaringan, lalu simpan ke cache
                return fetch(request).then(networkResponse => {
                    // Hanya cache request yang berhasil dan bukan dari chrome-extension
                    if (networkResponse && networkResponse.status === 200 && request.method === 'GET' && !request.url.startsWith('chrome-extension://')) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return networkResponse;
                });
            })
    );
});
