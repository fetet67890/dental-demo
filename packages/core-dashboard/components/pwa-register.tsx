"use client"

import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

    // Demo mode is a plain website, not an installable app — no service
    // worker, no offline shell, no beforeinstallprompt, full stop (see
    // pwa-install-prompt.tsx, which mirrors this same check). This is also
    // what was actually behind the "This page couldn't load" confusion
    // earlier: that's Chrome's own minimal error UI for a failed navigation
    // *inside an installed PWA window* specifically — a plain browser tab
    // shows a normal, more informative error instead. Removing
    // installability removes that whole failure mode along with it, not
    // just the confusing error text.
    const skipRegistration = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

    if (skipRegistration) {
      // Self-healing: a service worker registered from an earlier session (or
      // before this guard existed — including anyone who loaded the demo
      // before this fix shipped) stays installed in the browser indefinitely
      // — a redeploy does NOT unregister it, since SW state lives in the
      // browser, not the server. Left running, its cache-first strategy for
      // JS/CSS bundles serves stale builds (network-first only applies to
      // the HTML page itself), which looks exactly like "reload shows old,
      // hard-reload shows new, reload shows old again" as the SW keeps
      // re-caching whatever it last saw. Actively clean it up on every load
      // instead of just not registering a new one.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        for (const reg of regs) reg.unregister()
      }).catch(() => {})
      if ('caches' in window) {
        caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {})
      }
      return
    }

    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Installability is a progressive enhancement — never block the app on this.
    })
  }, [])

  return null
}
