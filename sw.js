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

let scheduleCache = {};
let scheduledTimers = new Map();

self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
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
        })
    );
});

self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    if (url.origin.includes('firebase') || url.origin.includes('googleapis')) {
        event.respondWith(fetch(request));
        return;
    }

    event.respondWith(
        caches.match(request)
            .then(response => {
                return response || fetch(request).then(fetchResponse => {
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

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SET_SCHEDULE') {
        const { allJadwal } = event.data.payload;
        scheduleCache = allJadwal;
        rescheduleNotifications();
    }
});

function rescheduleNotifications() {
    clearAllScheduledTimers();

    const now = new Date();
    const todayName = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'][now.getDay()];
    const todaySchedule = scheduleCache[todayName];

    if (!todaySchedule) return;

    Object.values(todaySchedule).forEach(item => {
        const [hours, minutes] = item.jam_mulai.split(':');
        const classTime = new Date();
        classTime.setHours(hours, minutes, 0, 0);

        const reminderTime = new Date(classTime.getTime() - 10 * 60 * 1000);

        if (reminderTime > now) {
            const delay = reminderTime.getTime() - now.getTime();
            const notificationId = `${todayName}-${item.jam_mulai}`;

            const timerId = setTimeout(() => {
                self.registration.showNotification('Pengingat Kelas', {
                    body: `Kelas ${item.mapelNama} di ${item.kelas} akan dimulai dalam 10 menit.`,
                    icon: 'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg',
                    badge: 'https://raw.githubusercontent.com/speropa/presensi/main/ikon%20presensi.jpg',
                    tag: notificationId,
                });
                scheduledTimers.delete(notificationId);
            }, delay);
            
            scheduledTimers.set(notificationId, timerId);
        }
    });
}

function clearAllScheduledTimers() {
    scheduledTimers.forEach(timerId => clearTimeout(timerId));
    scheduledTimers.clear();
}
