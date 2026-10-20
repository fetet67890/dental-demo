"use client"

import { createContext, useContext, useState } from 'react'

interface SidebarContextValue {
  collapsed: boolean
  toggle: () => void
  mobileOpen: boolean
  toggleMobile: () => void
  setMobileOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue>({
  collapsed: false,
  toggle: () => {},
  mobileOpen: false,
  toggleMobile: () => {},
  setMobileOpen: () => {},
})

const COLLAPSED_KEY = 'hypocrates_sidebar_collapsed'

function readCollapsed(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.localStorage.getItem(COLLAPSED_KEY) === '1' } catch { return false }
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  // Lazy initializer reads localStorage once, synchronously, before first
  // paint — every AdminLayout/DoktorLayout/RecepsionLayout already gates
  // rendering this provider behind an auth-loading check, so this never
  // runs during SSR/hydration (no mismatch risk, unlike a provider that's
  // part of the server-rendered shell). Without this, collapsed always
  // reset to expanded on every real page reload, since it was plain
  // in-memory state with nowhere to survive a remount.
  const [collapsed, setCollapsedState] = useState(readCollapsed)
  // Not persisted on purpose — this is the mobile overlay's open/closed
  // state, not a layout preference; nobody wants it stuck "open" on their
  // next visit just because they left it open once.
  const [mobileOpen, setMobileOpen] = useState(false)

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    try { window.localStorage.setItem(COLLAPSED_KEY, value ? '1' : '0') } catch {}
  }

  return (
    <SidebarContext.Provider value={{
      collapsed,
      toggle: () => setCollapsed(!collapsed),
      mobileOpen,
      toggleMobile: () => setMobileOpen((o) => !o),
      setMobileOpen,
    }}>
      {children}
    </SidebarContext.Provider>
  )
}

export const useSidebar = () => useContext(SidebarContext)
