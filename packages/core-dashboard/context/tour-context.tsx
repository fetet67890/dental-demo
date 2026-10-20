"use client"

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from './auth-context'
import { useBlockingModal } from './blocking-modal-context'
import { useSpecialtyConfig } from './specialty-config-context'
import { buildTourSteps } from '@core/lib/tour/steps'
import type { TourStep, TourRole } from '@core/lib/tour/types'

const DASHBOARD_HOME: Record<TourRole, string> = {
  admin: '/admin',
  mjek: '/doktor',
  recepsion: '/recepsion',
}

interface TourContextValue {
  active: boolean
  steps: TourStep[]
  stepIndex: number
  role: TourRole | null
  start: (role: TourRole) => void
  next: () => void
  prev: () => void
  skip: () => void
}

const TourContext = createContext<TourContextValue | null>(null)

const doneKey = (role: TourRole, userId: string) => `hypocrates_tour_done_${role}_${userId}`

export function TourProvider({ children }: { children: ReactNode }) {
  const { user, isInitializing } = useAuth()
  const { isBlocked } = useBlockingModal()
  const { tourExtraSteps } = useSpecialtyConfig()
  const router = useRouter()
  const [active, setActive] = useState(false)
  const [role, setRole] = useState<TourRole | null>(null)
  const [stepIndex, setStepIndex] = useState(0)
  // True once we've decided the tour SHOULD auto-launch for this login, but
  // haven't actually started it yet — held back while something else
  // (the work-mode prompt, most likely) already has the screen.
  const [pendingAutoStart, setPendingAutoStart] = useState(false)
  // Guards the auto-launch check to run once per logged-in session, not once
  // per render — reset to false on logout so a different account logging in
  // on the same page load gets its own fresh check.
  const autoStartChecked = useRef(false)

  // Rebuilding on every render is cheap (a handful of array spreads) and
  // keeps this in sync with tourExtraSteps without a memo dependency to get
  // wrong — see nav-items.ts's buildAdminNavItems for the same call-time
  // splice pattern.
  const tourSteps = buildTourSteps(tourExtraSteps)
  const steps = role ? tourSteps[role] : []

  const markDone = useCallback((r: TourRole, userId: string) => {
    try { window.localStorage.setItem(doneKey(r, userId), '1') } catch { /* private mode etc — worst case it re-offers the tour next login */ }
  }, [])

  // Always starts from the role's dashboard home, regardless of where the
  // tour was launched from (the topbar's "?" icon or Profili's "Rifillo
  // Turin" both work from any page) — every step after the first couple
  // assumes that known starting point, and restarting mid-way through some
  // unrelated page read as disjointed rather than a fresh walkthrough.
  const start = useCallback((r: TourRole) => {
    const home = DASHBOARD_HOME[r]
    if (window.location.pathname !== home) router.push(home)
    // Cancel any still-pending auto-launch (see the effect below) — without
    // this, a manual start within the first ~900ms of login (e.g. someone
    // clicking Profili's "Rifillo Turin" almost immediately) would run fine,
    // and then get silently stomped a moment later when the delayed
    // auto-launch fired anyway, resetting stepIndex back to 0 and pushing
    // back to `home` again out from under whatever the manual tour had
    // already navigated to.
    setPendingAutoStart(false)
    setRole(r)
    setStepIndex(0)
    setActive(true)
  }, [router])

  // `redirectHome` distinguishes actually finishing (clicked Finish on the
  // real last step, the `goodbye` card) from bailing out early with Skip —
  // only a genuine finish sends them back to the dashboard home. Someone
  // skipping mid-tour is very likely doing it *because* they want to keep
  // using the page they're already on, not to be redirected away from it.
  const end = useCallback((redirectHome: boolean) => {
    setActive(false)
    if (role && user) {
      markDone(role, user.id)
      if (redirectHome) router.push(DASHBOARD_HOME[role])
    }
    setRole(null)
    setStepIndex(0)
  }, [role, user, markDone, router])

  const next = useCallback(() => {
    setStepIndex((i) => {
      if (i + 1 >= steps.length) {
        end(true)
        return i
      }
      return i + 1
    })
  }, [steps.length, end])

  const prev = useCallback(() => setStepIndex((i) => Math.max(0, i - 1)), [])
  const skip = useCallback(() => end(false), [end])

  // Decide once per user/role whether the tour SHOULD auto-launch — the
  // first time they land on any dashboard page after login. Runs on any
  // viewport now — TourOverlay gracefully skips its handful of desktop-only
  // (persistent-sidebar) targets on phone widths instead of stalling on
  // them, so mobile gets the same walkthrough as desktop everywhere else.
  // This only flags intent; the actual launch is a separate effect below,
  // gated on isBlocked, so it can wait out a work-mode prompt that got
  // there first.
  useEffect(() => {
    if (isInitializing) return
    if (!user) {
      autoStartChecked.current = false
      setPendingAutoStart(false)
      return
    }
    if (autoStartChecked.current) return
    autoStartChecked.current = true
    let done = false
    try { done = window.localStorage.getItem(doneKey(user.role, user.id)) === '1' } catch { /* treat as not done */ }
    if (!done) setPendingAutoStart(true)
  }, [isInitializing, user])

  // Actually launches a pending auto-start, but only once nothing else is
  // already occupying the screen — re-runs the moment isBlocked clears, so a
  // tour that was held back by the work-mode prompt starts right after that
  // prompt is answered instead of being skipped entirely.
  useEffect(() => {
    if (!pendingAutoStart || !user || isBlocked) return
    // Snapshot where the user is right now (either right after login, or
    // right as isBlocked cleared) — if they've navigated somewhere else by
    // the time this fires, launching the tour would yank them back to the
    // dashboard for no reason they asked for. Silently drop the auto-launch
    // in that case instead; it's still reachable manually from Profili or
    // the topbar's "?" icon.
    const startedFromPath = window.location.pathname
    const timer = setTimeout(() => {
      setPendingAutoStart(false)
      if (window.location.pathname !== startedFromPath) return
      start(user.role)
    }, 900)
    return () => clearTimeout(timer)
  }, [pendingAutoStart, isBlocked, user, start])

  return (
    <TourContext.Provider value={{ active, steps, stepIndex, role, start, next, prev, skip }}>
      {children}
    </TourContext.Provider>
  )
}

export function useTour() {
  const ctx = useContext(TourContext)
  if (!ctx) throw new Error('useTour must be used within a TourProvider')
  return ctx
}
