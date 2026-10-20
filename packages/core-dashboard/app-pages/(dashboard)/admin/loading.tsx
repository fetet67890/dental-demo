import { PageSkeleton } from "@core/components/ui/page-skeleton"
import { TopbarSkeleton } from "@core/components/ui/topbar-skeleton"

// Colocated with layout.tsx on purpose, not left at the (dashboard) root
// above it — Next only wraps a segment's *own* {children} in Suspense, not
// the layout.tsx that defines it. One level up, this boundary wrapped the
// whole admin layout (Sidebar included), so any navigation that wasn't
// instantly cache-hit tore out the sidebar entirely and replaced the full
// page with this skeleton before popping the real page back in — read
// exactly like a hard reload. Here, only {children} suspends; Sidebar/
// BottomNav (defined in layout.tsx, outside {children}) stay mounted.
//
// Topbar, though, is rendered by each *page* itself, not by layout.tsx —
// so it's part of {children} and WAS disappearing during this same
// suspense window with nothing standing in for it, popping back in whole
// once the real page mounted. TopbarSkeleton fixes that half.
//
// PageSkeleton (not the older, separate PageLoading) — same component
// PageLoadingGuard already shows on first-ever page load, so a route
// transition and a first-load both look like the same app instead of two
// different-looking placeholders depending on which mechanism triggered.
export default function Loading() {
  return (
    <>
      <TopbarSkeleton />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <PageSkeleton />
      </div>
    </>
  )
}
