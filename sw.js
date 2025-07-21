// Nama cache untuk aplikasi
const CACHE_NAME = 'presensi-guru-cache-v1';

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
    // Menunggu hingga semua aset penting berhasil di-cache
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cache dibuka');
                return cache.addAll(urlsToCache);
            })
    );
});

// Event 'fetch': Dipanggil setiap kali aplikasi meminta sumber daya (file, gambar, dll.)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Jika sumber daya ditemukan di cache, kembalikan dari cache
                if (response) {
                    return response;
                }
                
                // Jika tidak ada di cache, ambil dari jaringan
                return fetch(event.request).then(
                    (response) => {
                        // Periksa apakah respons valid
                        if(!response || response.status !== 200 || (response.type !== 'basic' && response.type !== 'cors')) {
                            return response;
                        }

                        // Gandakan respons karena kita perlu menyimpannya di cache dan mengirimkannya ke browser
                        const responseToCache = response.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // Simpan respons yang baru diambil ke dalam cache
                                cache.put(event.request, responseToCache);
                            });

                        return response;
                    }
                );
            })
    );
});

// Event 'activate': Dipanggil saat service worker diaktifkan (misalnya setelah update)
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME]; // Hanya cache dengan nama ini yang akan dipertahankan
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                // Hapus semua cache lama yang tidak ada dalam whitelist
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});
