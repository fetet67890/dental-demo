import { Skeleton } from '@core/components/ui/skeleton'
import { PageSkeleton } from '@core/components/ui/page-skeleton'
import { TopbarSkeleton } from '@core/components/ui/topbar-skeleton'

// Shown by each role's layout (admin/doktor/recepsion) for the brief window
// while auth is still resolving client-side — before this, that window just
// rendered a bare centered "loading" line with none of the surrounding chrome,
// so the moment auth resolved, the *entire* sidebar+content shell popped in
// at once out of nowhere. This mirrors the real shell's shape (same w-64
// sidebar column, same bg-sidebar, and now the same topbar row via
// TopbarSkeleton — see that file for why Topbar needs its own placeholder
// at all) so the page looks like it's genuinely loading in from the first
// frame, not blank-then-everything.
export function AppShellSkeleton() {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden sm:flex w-64 shrink-0 flex-col bg-sidebar border-r border-sidebar-border/50 h-screen sticky top-0">
        <div className="p-6 border-b border-sidebar-border/50">
          <Skeleton className="h-8 w-32 bg-sidebar-accent/40" />
        </div>
        <div className="flex-1 p-4 space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-9 w-full rounded-xl bg-sidebar-accent/30" />
          ))}
        </div>
        <div className="p-4 border-t border-sidebar-border/50">
          <Skeleton className="h-10 w-full rounded-xl bg-sidebar-accent/30" />
        </div>
      </aside>
      <main className="flex-1 flex flex-col">
        <TopbarSkeleton />
        <div className="flex-1 p-4 lg:p-8">
          <PageSkeleton />
        </div>
      </main>
    </div>
  )
}
