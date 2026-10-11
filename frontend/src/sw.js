/* CivicConnect service worker: app-shell caching, offline navigation and sync wake-ups. */
const VERSION = 'civicconnect-v1'
const SHELL_CACHE = `${VERSION}-shell`
const RUNTIME_CACHE = `${VERSION}-runtime`
const API_CACHE = `${VERSION}-api`
const SHELL = ['/', '/index.html', '/manifest.json', '/favicon.svg']
const CACHEABLE_API = ['/api/complaints/map', '/api/dashboard/public', '/api/departments/routing-rules']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()))
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => !key.startsWith(VERSION)).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  )
})

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName)
  try {
    const response = await fetch(request)
    if (response && response.ok) cache.put(request, response.clone())
    return response
  } catch (error) {
    const cached = await cache.match(request)
    if (cached) return cached
    throw error
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  const response = await fetch(request)
  if (response && response.ok && response.type === 'basic') {
    const cache = await caches.open(RUNTIME_CACHE)
    cache.put(request, response.clone())
  }
  return response
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)

  if (url.origin === self.location.origin && url.pathname.startsWith('/api/')) {
    if (CACHEABLE_API.some((path) => url.pathname.startsWith(path))) {
      event.respondWith(networkFirst(request, API_CACHE))
    } else if (url.pathname.startsWith('/api/images/')) {
      event.respondWith(cacheFirst(request))
    }
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(SHELL_CACHE).then((cache) => cache.put('/index.html', copy))
          return response
        })
        .catch(() => caches.match('/index.html')),
    )
    return
  }

  const isStatic = url.origin === self.location.origin && /\.(js|css|svg|png|jpg|jpeg|webp|woff2?)$/.test(url.pathname)
  const isTile = url.hostname.endsWith('tile.openstreetmap.org')
  const isFont = url.hostname.includes('fonts.g')
  if (isStatic || isFont) {
    event.respondWith(cacheFirst(request))
  } else if (isTile) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE))
  }
})

async function wakeClients() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' })
  clients.forEach((client) => client.postMessage({ type: 'SYNC_COMPLAINTS' }))
}

self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-complaints') event.waitUntil(wakeClients())
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting()
})
