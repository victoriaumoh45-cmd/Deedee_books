const CACHE_NAME = 'deedee-books-cache-v13';
const APP_SHELL_URLS = ['./index.html', './manifest.json'];
const LIBRARY_URLS = [
  './icons/icon-192.png',
  './icons/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/epubjs/0.3.93/epub.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js',
  'https://unpkg.com/jszip@3.10.1/dist/jszip.min.js',
  'https://unpkg.com/epubjs@0.3.93/dist/epub.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.min.js',
  'https://unpkg.com/pdfjs-dist@3.11.174/build/pdf.worker.min.js',
  'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500&display=swap'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        [...APP_SHELL_URLS, ...LIBRARY_URLS].map((url) =>
          fetch(url, { mode: 'cors', cache: 'reload' })
            .then((res) => { if (res.ok) return cache.put(url, res); })
            .catch(() => {})
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isAppShellRequest(url){
  return APP_SHELL_URLS.some(shellUrl => url.endsWith(shellUrl.replace('./','')));
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = event.request.url;

  if (isAppShellRequest(url) || event.request.mode === 'navigate') {
    // Network-first: always try to get the latest HTML/manifest so updates land immediately.
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache-first for large third-party libraries that rarely change.
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((res) => {
          if (res.ok && url.startsWith('http')) {
            const copy = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
    })
  );
});

