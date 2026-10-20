"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useAuth } from './auth-context'
import { useBlockingModal } from './blocking-modal-context'
import { useClinicSettings } from './clinic-settings-context'
import { completeSetupWizard } from '@core/lib/api/settings'

interface SetupWizardContextValue {
  active: boolean
  open: () => void
  finish: () => Promise<void>
  skip: () => Promise<void>
}

const SetupWizardContext = createContext<SetupWizardContextValue | null>(null)

// First-login "let's set up your dashboard" wizard — admin-only, clinic-wide
// (see completeSetupWizard/setup_wizard_done: one flag for the whole clinic,
// not per-user, since everything it sets — language cookie aside — is a
// shared clinic_settings row any admin's login would already see). Auto-
// launches once per browser session the first time an admin whose clinic
// hasn't finished/skipped it logs in; always reachable afterward via
// Profili's "Rifillo Konfigurimin" button regardless of that flag, same
// relationship the guided tour has with its own "done" marker.
export function SetupWizardProvider({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth()
  const { isBlocked, setBlocked } = useBlockingModal()
  const { setupWizardDone, reload } = useClinicSettings()
  const [active, setActive] = useState(false)
  // True once we've decided the wizard SHOULD auto-launch, but haven't
  // actually shown it yet — held back while something else (the guided
  // tour, the work-mode prompt) already has the screen. Split into its own
  // flag/effect (rather than deciding-and-launching in one step) so it can
  // keep waiting for isBlocked to clear instead of only getting one chance
  // to check it — same two-effect shape as tour-context.tsx's own auto-start.
  const [pendingAutoOpen, setPendingAutoOpen] = useState(false)
  const autoChecked = useRef(false)

  // Unmount-only safety net — the real signal is set directly, at the same
  // point `active` itself changes, in open()/finish() below. A
  // `useEffect(() => setBlocked(active), [active])` watching it instead has
  // a real one-render-cycle gap: `active` commits in one render, and only
  // the *next* render (once React gets around to running the effect)
  // actually propagates isBlocked to other consumers. Anything else
  // deciding whether to open in that exact gap — the ambient work-mode
  // prompt, most concretely, since it has no artificial delay either — can
  // observe isBlocked still false and pop up right on top of this wizard
  // instead of correctly waiting for it. Setting both in the same
  // synchronous call closes that gap; see the matching fix in topbar.tsx's
  // own work-mode-prompt open/close points.
  useEffect(() => {
    return () => setBlocked(false)
  }, [setBlocked])

  const open = useCallback(() => {
    setActive(true)
    setBlocked(true)
  }, [setBlocked])

  const finish = useCallback(async () => {
    setActive(false)
    setBlocked(false)
    try {
      await completeSetupWizard()
      await reload()
    } catch { /* worst case it just offers itself again next login */ }
  }, [reload, setBlocked])

  useEffect(() => {
    if (isInitializing) return
    if (!user || user.role !== 'admin') return
    if (autoChecked.current) return
    if (setupWizardDone === null) return // clinic settings haven't loaded yet
    autoChecked.current = true
    if (!setupWizardDone) setPendingAutoOpen(true)
  }, [isInitializing, user, setupWizardDone])

  useEffect(() => {
    if (!pendingAutoOpen || isBlocked) return
    setPendingAutoOpen(false)
    open()
  }, [pendingAutoOpen, isBlocked, open])

  return (
    <SetupWizardContext.Provider value={{ active, open, finish, skip: finish }}>
      {children}
    </SetupWizardContext.Provider>
  )
}

export function useSetupWizard() {
  const ctx = useContext(SetupWizardContext)
  if (!ctx) throw new Error('useSetupWizard must be used within a SetupWizardProvider')
  return ctx
}
