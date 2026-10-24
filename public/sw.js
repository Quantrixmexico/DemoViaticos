const CACHE = "viaticos-v8"
// Solo se cachean recursos estáticos y públicos. Las páginas con sesión
// nunca se guardan: en un equipo compartido quedarían legibles tras cerrar sesión.
const PRECACHE = ["/login", "/icon-192.png", "/manifest.json"]
const CACHEABLE = /^\/(_next\/static\/|icon[^/]*\.png$|apple-touch-icon[^/]*\.png$|logo\.png$|manifest\.json$|login$)/

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return
  const url = new URL(e.request.url)
  if (url.hostname !== self.location.hostname || !CACHEABLE.test(url.pathname)) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && res.type === "basic") {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone)).catch(() => {})
        }
        return res
      })
      .catch(() => caches.match(e.request).then(r => r || Response.error()))
  )
})
