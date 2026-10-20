"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

// A tiny shared signal for "something non-dismissible is already covering
// the screen, don't layer anything else on top of it right now." Exists
// specifically because the work-mode prompt (Topbar's "Si po punoni sot?"
// dialog) and the guided tour's auto-launch are two fully independent
// triggers with no knowledge of each other — without this, both could fire
// within the same few seconds after login, and the tour's full-viewport
// click-blocking scrim (z-[300], above the dialog's z-[100]) would sit on
// top of the work-mode dialog and swallow clicks meant for it, making it
// look like the dialog's own buttons had stopped responding.
interface BlockingModalContextValue {
  isBlocked: boolean
  setBlocked: (blocked: boolean) => void
}

const BlockingModalContext = createContext<BlockingModalContextValue | null>(null)

export function BlockingModalProvider({ children }: { children: ReactNode }) {
  const [isBlocked, setIsBlocked] = useState(false)
  const setBlocked = useCallback((blocked: boolean) => setIsBlocked(blocked), [])
  return (
    <BlockingModalContext.Provider value={{ isBlocked, setBlocked }}>
      {children}
    </BlockingModalContext.Provider>
  )
}

export function useBlockingModal() {
  const ctx = useContext(BlockingModalContext)
  if (!ctx) throw new Error('useBlockingModal must be used within a BlockingModalProvider')
  return ctx
}
