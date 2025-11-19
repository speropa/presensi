const CACHE_NAME = 'presensi-guru-cache-v8'; // Versi v8
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    // PENTING: Gambar GitHub saya hapus dari 'wajib cache' di awal.
    // Alasannya: Jika GitHub down/lambat, instalasi offline GAGAL TOTAL.
    // Biarkan gambar ini di-cache saat pertama kali muncul (runtime caching).
    
    // Library Firebase Wajib
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'
];

// 1. Install: Paksa cache semua file inti
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            console.log('Service Worker: Caching files');
            return cache.addAll(urlsToCache);
        })
    );
});

// 2. Activate: Hapus cache lama
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Service Worker: Clearing old cache');
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// 3. Fetch: Strategi Cache-First untuk Navigasi
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // A. Abaikan API Firebase/Google (Biarkan Network Only)
    if (url.hostname.includes('firebasedatabase.app') || 
        url.hostname.includes('googleapis.com')) {
        return;
    }

    // B. STRATEGI NAVIGASI (Solusi Masalah Anda)
    // Jika browser meminta halaman utama (HTML), LANGSUNG berikan dari Cache.
    // Jangan coba fetch ke network dulu, karena WiFi tanpa internet bisa bikin error.
    if (request.mode === 'navigate') {
        event.respondWith(
            caches.match('./index.html').then(cachedResponse => {
                // 1. Jika ada di cache, kembalikan SEGERA. (Aplikasi langsung terbuka)
                if (cachedResponse) {
                    return cachedResponse;
                }
                // 2. Jika tidak ada (baru install), baru ambil dari network
                return fetch(request).catch(() => {
                    // 3. Jika network juga mati dan tidak ada cache
                    return new Response("Offline dan cache belum siap. Silakan online sekali untuk inisialisasi.", { 
                        status: 503, 
                        headers: { 'Content-Type': 'text/plain' } 
                    });
                });
            })
        );
        return;
    }

    // C. Aset Lain (JS, CSS, Gambar) -> Cache First, lalu Network
    event.respondWith(
        caches.match(request).then(cachedResponse => {
            if (cachedResponse) {
                return cachedResponse;
            }
            // Jika tidak ada di cache, ambil dari internet dan simpan
            return fetch(request).then(networkResponse => {
                if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                    return networkResponse;
                }
                const responseToCache = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(request, responseToCache);
                });
                return networkResponse;
            }).catch(err => {
                console.log('Fetch error:', err);
                // Abaikan error gambar/aset saat offline
            });
        })
    );
});
