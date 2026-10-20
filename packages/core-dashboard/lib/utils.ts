import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Updates the URL (a tab/section key, clearing a one-time query param, ...)
// WITHOUT going through Next's router — use this instead of
// `router.replace()`/`router.push()` whenever the change is a same-page
// client-side UI-state sync, not a real navigation to a different page.
//
// This isn't a style preference: per this exact Next.js version's own bundled
// docs (node_modules/next/dist/docs/01-app/01-getting-started/
// 04-linking-and-navigating.md, "Native History API" section), any page that
// reads `useSearchParams()` counts as a dynamic route, and Next's router
// treats a search-param-only `router.replace()`/`push()` on one as a fresh
// dynamic render — which re-triggers the nearest Suspense boundary, i.e. the
// route's own `loading.tsx` full-page skeleton. That's the exact mechanism
// behind "switching tabs looks like the whole page reloading": it was never
// really about refetching (see components/ui/tabs.tsx's own lazy-mount fix
// for that half), it's the router-level navigation itself re-suspending.
// `window.history.replaceState` bypasses that pipeline entirely — no RSC
// fetch, no Suspense re-trigger — while `useSearchParams()`/`usePathname()`
// still stay in sync, because pushState/replaceState integrate directly into
// Next's router state (confirmed in the same doc).
export function syncUrl(url: string) {
  window.history.replaceState(null, '', url)
}

const ALB_MONTHS = [
  "Janar","Shkurt","Mars","Prill","Maj","Qershor",
  "Korrik","Gusht","Shtator","Tetor","Nëntor","Dhjetor",
]

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—"
  try {
    const d = new Date(iso)
    if (isNaN(d.getTime())) return "—"
    return `${d.getDate()} ${ALB_MONTHS[d.getMonth()]} ${d.getFullYear()}`
  } catch {
    return "—"
  }
}
