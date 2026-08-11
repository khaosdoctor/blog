/**
 * Offline reading.
 *
 * ponytail: hand-written instead of @vite-pwa/astro, which caps its peer range
 * at Astro 5 and refuses to install on Astro 7. This is the whole feature: HTML
 * is network-first so a reader always gets the current version of a post when
 * online and a cached one when not, hashed assets are cache-first because their
 * name changes whenever their content does, and everything else falls through
 * to the network untouched.
 */
// The release version, handed over by the registration URL (/sw.js?v=1.2.3) so
// this file stays a plain static asset with no build step. A new release changes
// the script URL, which is what makes the browser install a new worker at all,
// and changes every cache name, so `activate` drops the previous release's
// entries instead of letting them pile up on a reader's disk forever.
const VERSION = new URL(self.location.href).searchParams.get('v') ?? 'dev'
const PAGES = `pages-${VERSION}`
const ASSETS = `assets-${VERSION}`
const OFFLINE_URL = '/offline/'
const MAX_PAGES = 60

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((cache) => cache.add(OFFLINE_URL)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys()
      await Promise.all(names.filter((name) => !name.endsWith(VERSION)).map((name) => caches.delete(name)))
      await self.clients.claim()
    })(),
  )
})

/** Keeps the page cache from growing without bound on a 235-post site. */
async function trim(cacheName, max) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= max) return
  await Promise.all(keys.slice(0, keys.length - max).map((key) => cache.delete(key)))
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  // Hashed build output: the URL changes when the content does, so a hit is
  // always correct and never stale.
  if (url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/pagefind/')) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(request)
        if (hit !== undefined) return hit
        const response = await fetch(request)
        if (response.ok) cache.put(request, response.clone())
        return response
      }),
    )
    return
  }

  if (request.mode !== 'navigate') return

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(request)
        if (response.ok) {
          const cache = await caches.open(PAGES)
          cache.put(request, response.clone())
          void trim(PAGES, MAX_PAGES)
        }
        return response
      } catch {
        const cached = await caches.match(request)
        if (cached !== undefined) return cached
        const offline = await caches.match(OFFLINE_URL)
        if (offline !== undefined) return offline
        return new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } })
      }
    })(),
  )
})
