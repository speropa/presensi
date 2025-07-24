// Nama cache untuk aplikasi (versi dinaikkan untuk memicu pembaruan)
const CACHE_NAME = 'presensi-guru-cache-v3'; // Versi cache dinaikkan

// Daftar URL aset penting yang akan disimpan di cache
const urlsToCache = [
    './', // Ini akan menyimpan index.html
    './index.html', // Simpan secara eksplisit juga
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js'
];

// Event 'install': Dipanggil saat service worker pertama kali diinstal
self.addEventListener('install', event => {
    self.skipWaiting(); // Memaksa service worker baru untuk aktif lebih cepat
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache dibuka dan aset statis disimpan');
                return cache.addAll(urlsToCache);
            })
    );
});

// Event 'activate': Dipanggil saat service worker diaktifkan
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Hanya cache dengan nama ini yang akan dipertahankan
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                // Hapus semua cache lama yang tidak ada dalam whitelist
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Event 'fetch': Dipanggil setiap kali aplikasi meminta sumber daya
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Abaikan permintaan ke Firebase Realtime Database, selalu ambil dari jaringan.
    if (url.hostname.includes('firebasedatabase.app')) {
        event.respondWith(fetch(request));
        return;
    }

    // Untuk halaman HTML, gunakan strategi "Network First, then Cache".
    if (request.headers.get('Accept').includes('text/html')) {
        event.respondWith(
            fetch(request)
                .then(response => {
                    // Jika berhasil, simpan versi baru ke cache.
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    return response;
                })
                .catch(() => {
                    // Jika jaringan gagal, ambil dari cache.
                    return caches.match(request);
                })
        );
        return;
    }

    // Untuk aset statis lainnya, gunakan strategi "Cache First, then Network".
    event.respondWith(
        caches.match(request)
            .then(response => {
                // Kembalikan dari cache jika ada, jika tidak, ambil dari jaringan.
                return response || fetch(request).then(fetchResponse => {
                    const responseToCache = fetchResponse.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseToCache);
                    });
                    return fetchResponse;
                });
            })
    );
});

// --- NEW: Notification Logic ---

// Listener untuk pesan dari client (halaman web)
self.addEventListener('message', event => {
    if (event.data.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, timestamp, tag } = event.data.payload;
        const delay = timestamp - Date.now();

        if (delay > 0) {
            setTimeout(() => {
                self.registration.showNotification(title, {
                    body: body,
                    icon: 'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg',
                    badge: 'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg',
                    tag: tag, // Tag untuk mencegah notifikasi duplikat
                    renotify: true, // Izinkan notifikasi baru dengan tag yang sama untuk muncul kembali
                });
            }, delay);
        }
    }
});

// Listener saat notifikasi diklik
self.addEventListener('notificationclick', event => {
    event.notification.close(); // Tutup notifikasi

    // Buka aplikasi atau fokus ke tab yang sudah ada
    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then(clientList => {
            if (clientList.length > 0) {
                let client = clientList[0];
                for (let i = 0; i < clientList.length; i++) {
                    if (clientList[i].focused) {
                        client = clientList[i];
                    }
                }
                return client.focus();
            }
            return clients.openWindow('/');
        })
    );
});
