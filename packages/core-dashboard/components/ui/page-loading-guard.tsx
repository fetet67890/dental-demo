"use client"

import { useData } from "@core/context/data-context"
import { PageSkeleton, DashboardSkeleton, DocumentsSkeleton } from "@core/components/ui/page-skeleton"

interface Props {
  children: React.ReactNode
  variant?: "default" | "dashboard" | "documents"
  stats?: number
  cols?: number
  rows?: number
}

export function PageLoadingGuard({
  children,
  variant = "default",
  stats = 0,
  cols = 5,
  rows = 7,
}: Props) {
  const { isDataLoading } = useData()

  if (!isDataLoading) return <>{children}</>

  if (variant === "dashboard") return <DashboardSkeleton />
  if (variant === "documents") return <DocumentsSkeleton stats={stats} />
  return <PageSkeleton stats={stats} cols={cols} rows={rows} />
}
