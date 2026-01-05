const CACHE_NAME = 'my-ledger-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './logo.png',
    // බාහිරින් ගන්නා Library ෆයිල් ටිකත් Cache කරමු
    'https://cdn.jsdelivr.net/npm/chart.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-auth.js',
    'https://www.gstatic.com/firebasejs/8.10.1/firebase-database.js'
];

// 1. Install Service Worker & Cache Files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            console.log('Caching assets...');
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// 2. Fetch from Cache first, then Network (Offline Strategy)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request).then((response) => {
            // Cache එකේ තියෙනවා නම් ඒක දෙන්න, නැත්නම් Network එකෙන් ගන්න
            return response || fetch(event.request).catch(() => {
                // Network එකත් නැත්නම් (Offline නම්) දෝෂයක් නොවී ඉන්න
                if (event.request.mode === 'navigate') {
                    return caches.match('./index.html');
                }
            });
        })
    );
});

// 3. Update Cache (Delete old versions)
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keyList) => {
            return Promise.all(keyList.map((key) => {
                if (key !== CACHE_NAME) {
                    console.log('Removing old cache:', key);
                    return caches.delete(key);
                }
            }));
        })
    );
});
