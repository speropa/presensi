// 1. Impor Service Worker OneSignal di baris paling atas.
// Ini akan menangani semua logika penerimaan push notification.
importScripts('https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js');

// 2. Logika Caching Anda untuk fungsionalitas offline tetap dipertahankan.
const CACHE_NAME = 'presensi-guru-cache-v3';
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    'https://cdn.tailwindcss.com',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap',
    'https://cdnjs.cloudflare.com/ajax/libs/PapaParse/5.3.0/papaparse.min.js',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
    'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg'
];

// Event 'install': Dipicu saat service worker pertama kali diinstal.
// Di sini kita membuka cache dan menyimpan semua aset penting.
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// Event 'activate': Dipicu saat service worker diaktifkan.
// Di sini kita membersihkan cache lama yang sudah tidak digunakan.
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
        })
    );
});

// Event 'fetch': Dipicu setiap kali aplikasi meminta sebuah resource (file, gambar, dll).
// Ini adalah inti dari strategi offline-first.
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Abaikan request ke Firebase/Google API, selalu ambil dari jaringan.
    if (url.origin.includes('firebase') || url.origin.includes('googleapis')) {
        event.respondWith(fetch(request));
        return;
    }

    // Untuk request lainnya, coba cari di cache terlebih dahulu.
    event.respondWith(
        caches.match(request)
            .then(response => {
                // Jika resource ditemukan di cache, langsung kembalikan.
                // Jika tidak, ambil dari jaringan.
                return response || fetch(request).then(fetchResponse => {
                    // Jika resource yang diambil dari jaringan ada di daftar cache kita,
                    // simpan salinannya ke cache untuk penggunaan offline berikutnya.
                    if (urlsToCache.includes(request.url) || request.url.endsWith('.js')) {
                       const responseToCache = fetchResponse.clone();
                        caches.open(CACHE_NAME).then(cache => {
                            cache.put(request, responseToCache);
                        });
                    }
                    return fetchResponse;
                });
            })
    );
});

// CATATAN: Semua kode notifikasi lama (setTimeout, dll.) telah dihapus dari sini
// karena tugasnya sudah diambil alih oleh OneSignal dan backend.
