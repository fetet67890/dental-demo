import { PageSkeleton } from "@core/components/ui/page-skeleton"
import { TopbarSkeleton } from "@core/components/ui/topbar-skeleton"

// See app/(dashboard)/admin/loading.tsx for why this lives here (not at the
// (dashboard) root), why PageSkeleton specifically (not PageLoading), and
// why TopbarSkeleton is prepended (Topbar lives in each page, not layout.tsx).
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
