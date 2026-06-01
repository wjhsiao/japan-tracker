// Minimal service worker — present for PWA installability, but network-first
// so deploys are never served stale. (No offline mode by design.)
const CACHE = 'japan-tracker-v3'
const OFFLINE_FALLBACK = '/'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.add(OFFLINE_FALLBACK)).catch(() => {}))
  self.skipWaiting()
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return

  // Network-first: always prefer fresh content; only fall back to the cached
  // shell for navigations when offline.
  e.respondWith(
    fetch(e.request).catch(() => {
      if (e.request.mode === 'navigate') return caches.match(OFFLINE_FALLBACK)
      return caches.match(e.request)
    })
  )
})
