"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@core/context/auth-context'
import { DataProvider } from '@core/context/data-context'
import { CurrencyRemountBoundary } from '@core/context/currency-context'
import { SidebarProvider } from '@core/context/sidebar-context'
import { Sidebar } from '@core/components/layout/sidebar'
import { BottomNav } from '@core/components/layout/bottom-nav'
import { Footer } from '@core/components/layout/footer'
import { useData } from '@core/context/data-context'
import { GlobalDialogs } from '@core/components/dialogs/global-dialogs'
import { AppShellSkeleton } from '@core/components/ui/app-shell-skeleton'

function NotificationWatcher() {
  const { user } = useAuth()
  const { appointments } = useData()
  const prevWaitingIds = useRef<Set<string>>(new Set())
  const permissionAsked = useRef(false)

  // Ask for notification permission once after login
  useEffect(() => {
    if (permissionAsked.current || !("Notification" in window)) return
    if (Notification.permission === "default") {
      permissionAsked.current = true
      setTimeout(() => Notification.requestPermission(), 4000)
    }
  }, [])

  // `appointments` is now kept live by DataProvider's Socket.IO listeners
  // (see context/data-context.tsx) — no separate poll needed here anymore.

  // Watch for new "ne_pritje" appointments
  useEffect(() => {
    if (!user || !appointments.length) return

    const myApts = appointments.filter(
      (a) => a.doctorId === user.id || a.doctorName?.includes(user.name || '')
    )
    const waiting = myApts.filter((a) => a.status === "ne_pritje")
    const currentIds = new Set(waiting.map((a) => a.id))

    if (prevWaitingIds.current.size > 0) {
      for (const apt of waiting) {
        if (!prevWaitingIds.current.has(apt.id)) {
          if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Pacient Në Pritje", {
              body: `${apt.patientName} është në pritje${apt.time ? ` (ora ${apt.time})` : ''}`,
              icon: "/logo.png",
              tag: `waiting-${apt.id}`,
            })
          }
        }
      }
    }

    prevWaitingIds.current = currentIds
  }, [appointments, user])

  return null
}

export default function DoktorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isInitializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isInitializing && (!user || user.role !== 'mjek')) {
      router.push('/hyrje')
    }
  }, [user, isInitializing, router])

  if (isInitializing || !user || user.role !== 'mjek') {
    return <AppShellSkeleton />
  }

  return (
    <DataProvider>
      <SidebarProvider>
        <div data-slot="dashboard-shell" className="flex min-h-screen bg-background">
          <Sidebar />
          <main className="flex-1 flex flex-col overflow-hidden pb-16 sm:pb-0">
            <NotificationWatcher />
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
