// sw.js
self.addEventListener('install', function(event) {
    event.waitUntil(
        caches.open('v1').then(function(cache) {
            return cache.addAll([
                '/font-awesome/css/all.min.css',
                '/main.js',
                '/bootstrap-5.3.3-dist/js/bootstrap.bundle.min.js',
                '/bootstrap-5.3.3-dist/css/bootstrap.min.css',
                'https://fonts.googleapis.com/css2?family=Roboto+Flex:opsz,wght@8..144,100..1000&display=swap'
            ]);
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        caches.match(event.request).then(function(response) {
            // Cache hit - return response
            if (response) {
                return response;
            }
            return fetch(event.request);
        })
    );
});
