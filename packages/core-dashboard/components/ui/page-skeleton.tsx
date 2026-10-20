import { Skeleton } from '@core/components/ui/skeleton'

// ── Primitive blocks ─────────────────────────────────────────────────────────

function SkeletonStatCard() {
  return (
    <div className="relative bg-card rounded-xl border border-border overflow-hidden p-3 sm:p-4">
      <Skeleton className="absolute top-0 left-0 right-0 h-[3px] rounded-none" />
      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-28" />
          <Skeleton className="h-3 w-16" />
        </div>
        <Skeleton className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg shrink-0" />
      </div>
    </div>
  )
}

function SkeletonSearchBar({ hasButton = true }: { hasButton?: boolean }) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <Skeleton className="h-9 flex-1 rounded-xl" />
      {hasButton && <Skeleton className="h-9 w-36 rounded-xl shrink-0" />}
    </div>
  )
}

function SkeletonTableRow({ cols }: { cols: number }) {
  const widths = ['w-28', 'w-36', 'w-24', 'w-20', 'w-16', 'w-12']
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border/40 last:border-0">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-4 ${widths[i % widths.length]} ${i === 0 ? 'flex-1' : 'shrink-0'}`}
        />
      ))}
    </div>
  )
}

function SkeletonTableHeader({ cols }: { cols: number }) {
  return (
    <div className="flex items-center gap-4 px-4 py-3 border-b border-border bg-muted/30">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} className={`h-3 w-16 ${i === 0 ? 'flex-1' : 'shrink-0'}`} />
      ))}
    </div>
  )
}

// ── Exported layout skeletons ────────────────────────────────────────────────

/**
 * Stats row + search bar + table.
 * Covers the majority of admin/recepsion/doktor list pages.
 */
export function PageSkeleton({
  stats = 4,
  cols = 5,
  rows = 7,
  hasSearch = true,
}: {
  stats?: number
  cols?: number
  rows?: number
  hasSearch?: boolean
}) {
  return (
    <div className="space-y-6">
      {/* Stat cards */}
      {stats > 0 && (
        <div className={`grid gap-3 grid-cols-2 ${stats >= 4 ? 'lg:grid-cols-4' : `sm:grid-cols-${stats}`}`}>
          {Array.from({ length: stats }).map((_, i) => <SkeletonStatCard key={i} />)}
        </div>
      )}

      {/* Search + button */}
      {hasSearch && <SkeletonSearchBar />}

      {/* Table card */}
      <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
        <SkeletonTableHeader cols={cols} />
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonTableRow key={i} cols={cols} />
        ))}
      </div>
    </div>
  )
}

/**
 * Dashboard skeleton: stats + 2 charts side by side + bottom list.
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[0, 1].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <Skeleton className="h-4 w-36 mb-4" />
            <Skeleton className="h-[220px] w-full rounded-lg" />
          </div>
        ))}
      </div>

      {/* Bottom row: 3 cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[0, 1, 2].map((i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-5 shadow-sm">
            <Skeleton className="h-4 w-32 mb-4" />
            <div className="space-y-2.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="flex justify-between items-center">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-12" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * Document grid skeleton: stats row + tab bar + card grid.
 */
export function DocumentsSkeleton({ stats = 4 }: { stats?: number }) {
  return (
    <div className="space-y-6">
      <div className={`grid grid-cols-2 ${stats >= 4 ? 'lg:grid-cols-4' : 'sm:grid-cols-3'} gap-3`}>
        {Array.from({ length: stats }).map((_, i) => <SkeletonStatCard key={i} />)}
      </div>

      {/* Tab bar + search */}
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9 w-56 rounded-xl" />
        <div className="flex gap-2">
          <Skeleton className="h-9 flex-1 rounded-xl" />
          <Skeleton className="h-9 w-28 rounded-xl shrink-0" />
        </div>
      </div>

      {/* Card grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border p-4 shadow-sm space-y-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ))}
      </div>
    </div>
  )
}
