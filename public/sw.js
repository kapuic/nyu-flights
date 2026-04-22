const PAGE_CACHE = "nyu-flights-pages-v1"
const ASSET_CACHE = "nyu-flights-assets-v1"
const OFFLINE_URL = "/offline.html"
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(PAGE_CACHE).then((cache) => cache.addAll([OFFLINE_URL]))
  )
  self.skipWaiting()
})
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => ![PAGE_CACHE, ASSET_CACHE].includes(key))
            .map((key) => caches.delete(key))
        )
      )
  )
  self.clients.claim()
})
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.mode === "navigate") {
    event.respondWith(handleNavigationRequest(request))
    return
  }
  if (["style", "script", "image", "font"].includes(request.destination)) {
    event.respondWith(handleStaticAssetRequest(request))
  }
})
async function handleNavigationRequest(request) {
  const cache = await caches.open(PAGE_CACHE)
  try {
    const response = await fetch(request)
    cache.put(request, response.clone())
    return response
  } catch {
    const cachedResponse = await cache.match(request)
    if (cachedResponse) return cachedResponse
    const offlineResponse = await cache.match(OFFLINE_URL)
    if (offlineResponse) return offlineResponse
    return Response.error()
  }
}
async function handleStaticAssetRequest(request) {
  const cache = await caches.open(ASSET_CACHE)
  const cachedResponse = await cache.match(request)
  if (cachedResponse) return cachedResponse
  const response = await fetch(request)
  cache.put(request, response.clone())
  return response
}
