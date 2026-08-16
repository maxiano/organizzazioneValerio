Il codice del Service Worker è ben scritto, ma la causa del blocco dell'installazione sta nel primo elemento dell'array ASSETS_TO_CACHE: './'.

Se nell'array metti './', l'istruzione cache.addAll() proverà a fare una richiesta HTTP separata a quella cartella. Se il server hosting risponde con un reindirizzamento (es. da / a /index.html) o se una qualsiasi delle risorse fallisce nel caricamento (es. il link del CDN o un file CSS/JS con un percorso leggermente diverso), l'installazione del Service Worker fallisce silenziosamente, bloccando l'intero banner PWA.

Ecco il file sw.js corretto e ottimizzato per evitare fallimenti nel caching e garantire che Chrome registri la PWA al primo colpo:

JavaScript
const CACHE_NAME = 'turni-valerio-v2';
const ASSETS_TO_CACHE = [
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Usiamo Promise.allSettled per evitare che un errore su un singolo file 
      // (es. CDN offline o immagine mancante) blocchi l'installazione del Service Worker
      return Promise.allSettled(
        ASSETS_TO_CACHE.map((url) => cache.add(url))
      );
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Ignora le richieste verso Firebase o API esterne (tranne CDN xlsx)
  if (!event.request.url.startsWith(self.location.origin) && !event.request.url.includes('cdn.jsdelivr.net')) {
    return;
  }

  // Ignora le chiamate di tipo POST o non-GET (es. salvataggi Firestore)
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback in caso di assenza di rete
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
