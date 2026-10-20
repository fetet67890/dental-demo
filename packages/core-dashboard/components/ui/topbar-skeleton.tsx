import { Skeleton } from '@core/components/ui/skeleton'

// Matches Topbar's real structure/dimensions (components/layout/topbar.tsx)
// closely enough that swapping in the real one causes no layout shift —
// same padding, same sticky header height, same icon-cluster sizing.
//
// This exists because Topbar is rendered by each *page*, not by layout.tsx
// — so on a route transition into an uncached dynamic segment, Next's
// per-route loading.tsx Suspense fallback was replacing the topbar along
// with the content, and nothing stood in for it in the meantime: the whole
// bar just vanished and popped back in whole once the real page mounted,
// which read exactly like the navbar was reloading. Used in every role's
// loading.tsx (prepended above the content skeleton) and in AppShellSkeleton
// (the auth-init placeholder), so both loading paths show the same
// topbar-shaped chrome instead of one of them going blank.
export function TopbarSkeleton({ withTitleBar = true }: { withTitleBar?: boolean }) {
  return (
    <>
      <div className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-3 sm:px-4 lg:px-6 py-3 sticky top-0 z-[58]">
        <div className="flex items-center gap-2 sm:gap-3">
          <Skeleton className="hidden lg:block h-8 w-8 rounded-xl shrink-0" />
          <Skeleton className="hidden sm:block flex-1 h-9 max-w-md rounded-xl" />
          <div className="flex items-center gap-2 sm:gap-3 ml-auto">
            <Skeleton className="hidden sm:block h-9 w-9 rounded-xl shrink-0" />
            <Skeleton className="h-9 w-9 rounded-xl shrink-0" />
            <Skeleton className="hidden sm:block h-9 w-9 rounded-xl shrink-0" />
            <Skeleton className="h-9 w-9 rounded-full shrink-0" />
          </div>
        </div>
      </div>
      {withTitleBar && (
        <div className="px-4 lg:px-8 py-3 sm:py-4 border-b border-border/40 bg-background/60">
          <Skeleton className="h-5 w-40 mb-2" />
          <Skeleton className="hidden sm:block h-3 w-64" />
        </div>
      )}
    </>
  )
}
