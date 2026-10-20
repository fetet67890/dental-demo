"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@core/context/auth-context'
import { DataProvider } from '@core/context/data-context'
import { CurrencyRemountBoundary } from '@core/context/currency-context'
import { SidebarProvider } from '@core/context/sidebar-context'
import { Sidebar } from '@core/components/layout/sidebar'
import { BottomNav } from '@core/components/layout/bottom-nav'
import { Footer } from '@core/components/layout/footer'
import { GlobalDialogs } from '@core/components/dialogs/global-dialogs'
import { AppShellSkeleton } from '@core/components/ui/app-shell-skeleton'

export default function ReceptionLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isInitializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isInitializing && (!user || user.role !== 'recepsion')) {
      router.push('/hyrje')
    }
  }, [user, isInitializing, router])

  if (isInitializing || !user || user.role !== 'recepsion') {
    return <AppShellSkeleton />
  }

  return (
    <DataProvider>
      <SidebarProvider>
        <div data-slot="dashboard-shell" className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden pb-16 sm:pb-0">
            <CurrencyRemountBoundary>{children}</CurrencyRemountBoundary>
            <Footer className="hidden sm:block" />
          </main>
          <BottomNav />
          <GlobalDialogs />
        </div>
      </SidebarProvider>
    </DataProvider>
  )
}
