const CACHE_NAME = 'presensi-guru-cache-v7'; // Versi dinaikkan ke v7
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg',
    // Library Firebase
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'
];

// 1. Install Service Worker & Cache Aset Statis
self.addEventListener('install', event => {
    self.skipWaiting(); // Paksa SW baru segera aktif
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// 2. Activate & Bersihkan Cache Lama
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Ambil alih kontrol semua klien segera
    );
});

// 3. Fetch Strategy (Inti Perbaikan Offline)
self.addEventListener('fetch', event => {
    const { request } = event;

    // A. API Requests (Firebase/Google) -> Network Only (Jangan Cache)
    // Biarkan browser menangani error koneksi untuk API ini, aplikasi akan menangani errornya.
    if (request.url.includes('firebasedatabase.app') || 
        request.url.includes('googleapis.com') || 
        request.url.includes('github.com')) {
        return; 
    }

    // B. Navigation Requests (Saat membuka aplikasi/browser) -> Cache First (index.html)
    // Ini memperbaiki error "Situs tidak dapat dijangkau" saat offline.
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then((response) => {
                return response || fetch(request);
            }).catch(() => {
                // Jika offline total dan fetch gagal, kembalikan index.html dari cache
                return caches.match('./index.html');
            })
        );
        return;
    }

    // C. Asset Requests (CSS, JS, Gambar) -> Stale-While-Revalidate
    // Coba ambil dari cache dulu, tapi update cache di latar belakang jika ada koneksi
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            // Jika ada di cache, kembalikan segera
            if (cachedResponse) {
                return cachedResponse;
            }

            // Jika tidak ada, ambil dari jaringan
            return fetch(request).then(networkResponse => {
                // Validasi respons
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }

                // Simpan aset baru ke cache
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseToCache);
                });

                return networkResponse;
            });
        })
    );
});
