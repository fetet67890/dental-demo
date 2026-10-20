// Minimal service worker — exists to satisfy PWA installability requirements
// (Chrome/Edge/Android require an active SW with a fetch handler before they'll
// show the "Install app" prompt) and to give the static app shell some offline
// resilience. It deliberately does NOT cache /api/* responses — this app shows
// live clinical/financial data, and silently serving stale data offline would
// be actively dangerous in a dental clinic context.
//
// v2 fixes a real staleness bug the original cache-first "static assets"
// bucket had: it matched EVERY same-origin GET that wasn't `/api/*` and
// wasn't a full-page `navigate` — which also matches the RSC/flight data
// fetches Next.js's App Router issues for every client-side <Link>/router.push
// navigation. Those responses are tied to whatever the server's route tree
// looked like at the moment they were first cached, NOT content-hashed like
// `/_next/static/*` — so once one was cached, EVERY later client-side
// navigation to that URL kept replaying it forever, even across a redeploy
// that changed that page's component tree. A hard reload (a real `navigate`
// request, network-first below) briefly showed the current deploy, but the
// very next in-app Link click was back to serving the stale one — this is
// almost certainly what several "I fixed this already, why is it broken
// again" reports this session actually were: not a regression in the fix
// itself, but a browser that already had this SW installed from an earlier
// deploy silently keeping the OLD version of a page alive after every
// redeploy since. Only `/_next/static/*` is genuinely safe to cache-first —
// webpack/Next give it a content hash, so a given URL's bytes never change
// and a stale cache entry is a contradiction in terms. Everything else here
// is now network-first, cache only as an offline fallback.
//
// Bumping CACHE_NAME also matters on its own: the browser only re-runs
// `activate` (which wipes any cache key that doesn't match CACHE_NAME) when
// it detects THIS FILE'S bytes changed — so existing installs still carrying
// the old, wrongly-cached-forever RSC responses actually get purged the next
// time they load the app, instead of that bad cache sitting there
// indefinitely just because the fetch-handling logic below changed.
const CACHE_NAME = 'hypocrates-shell-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Never cache API calls — always hit the network for live data.
  if (url.pathname.startsWith('/api/')) return

  // Page navigations: network-first, falling back to a cached copy, then a
  // minimal inline offline notice if nothing is cached yet.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(() =>
          caches.match(request).then(
            (cached) =>
              cached ||
              new Response(
                '<!doctype html><html lang="sq"><head><meta charset="utf-8"><title>Offline</title></head>' +
                '<body style="font-family:sans-serif;text-align:center;padding:3rem;color:#122056">' +
                '<h1>Jeni jashtë linje</h1><p>Kontrolloni lidhjen tuaj me internetin dhe provoni përsëri.</p>' +
                '</body></html>',
                { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
              )
          )
        )
    )
    return
  }

  // Only /_next/static/* is content-hashed (a given URL's bytes can never
  // change), so it's the only bucket safe to serve cache-first forever.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
            }
            return response
          })
      )
    )
    return
  }

  // Everything else non-API (RSC/flight data for client-side navigations,
  // the manifest, icons, ...): network-first, cache only as an offline
  // fallback — see the top-of-file comment for why cache-first here was the
  // actual bug.
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        }
        return response
      })
      .catch(() => caches.match(request))
  )
})

// ── Web Push ─────────────────────────────────────────────────────────────
// The push service wakes this worker up even if no tab is open — this is
// what makes it a real OS-level notification instead of just an in-app one.
// Payload is whatever JSON push.controller.js's sendToUser() sent.
self.addEventListener('push', (event) => {
  let data = { title: 'Hypocrates', body: 'Keni një njoftim të ri.' }
  try {
    if (event.data) data = { ...data, ...event.data.json() }
  } catch {
    // Non-JSON payload (shouldn't happen from our own backend) — fall back
    // to the default text above rather than crash the handler.
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-192.png',
      data: { url: data.url || '/' },
    })
  )
})

// Clicking the OS notification focuses an already-open tab on this origin if
// one exists, otherwise opens a new one at the URL the payload specified.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const targetUrl = event.notification.data?.url || '/'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl)
          return client.focus()
        }
      }
      return self.clients.openWindow(targetUrl)
    })
  )
})
