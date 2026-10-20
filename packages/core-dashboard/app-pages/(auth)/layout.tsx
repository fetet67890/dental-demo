"use client"

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { LoadingScreen } from '@core/components/ui/loading'

// Held open for a fixed minimum stretch before actually navigating away, so
// the transition always reads as deliberate instead of a flicker — see the
// render branch below for why this used to be invisible regardless of any
// delay here.
const MIN_TRANSITION_MS = 600

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const t = useTranslations('common')
  const { user, isInitializing } = useAuth()
  const { logoUrl } = useClinicSettings()
  const router = useRouter()

  // Distinguishes "a session was already restored the moment this page
  // loaded" (an old bookmark/refresh landing on /hyrje while already
  // logged in) from "the user just logged in during this visit". Only the
  // first case should ever skip the auto-redirect below in demo mode — a
  // fresh, active login must always redirect, demo mode or not. The
  // previous version's `if (DEMO_MODE) return` bailed out of the redirect
  // unconditionally, which also silently ate every *fresh* login's
  // redirect in demo mode: the effect never ran, but the render branch
  // below (`if (user)`) had no matching demo-mode awareness, so it kept
  // showing "Redirecting…" forever with nothing left to actually redirect
  // — exactly the "stuck at loading, only unstick by navigating away and
  // back" bug. Set once, during render (not an effect), specifically so
  // it's captured before the redirect effect below ever runs.
  const wasAlreadyAuthedRef = useRef<boolean | null>(null)
  if (!isInitializing && wasAlreadyAuthedRef.current === null) {
    wasAlreadyAuthedRef.current = !!user
  }
  const skipRedirectInDemo = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && wasAlreadyAuthedRef.current === true

  useEffect(() => {
    if (skipRedirectInDemo) return
    if (isInitializing || !user) return
    const destination =
      user.role === 'admin'     ? '/admin' :
      user.role === 'mjek'      ? '/doktor' :
      user.role === 'recepsion' ? '/recepsion' :
      null
    if (!destination) return
    const timer = setTimeout(() => router.push(destination), MIN_TRANSITION_MS)
    return () => clearTimeout(timer)
  }, [user, isInitializing, router, skipRedirectInDemo])

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse text-accent">{t('loading')}</div>
      </div>
    )
  }

  // This used to be `return null` the instant `user` became truthy — login's
  // own setUser() fires synchronously, so on the very next render this
  // component already saw user != null and returned null, unmounting
  // hyrje/page.tsx (and whatever loading overlay IT tried to render) in the
  // same tick. No delay placed in the login page itself could ever survive
  // that — the parent was already tearing it down before the delay had a
  // chance to matter. Rendering the transition screen *here* instead, in the
  // component that actually controls the unmount, is what makes it visible
  // for real. Also covers an already-authenticated visit to /hyrje (e.g. an
  // old bookmark) — either way a blank screen for that stretch reads as
  // broken, not just a fresh login. Skipped when skipRedirectInDemo is true
  // — that's precisely the case where nothing is ever going to redirect, so
  // showing "Redirecting…" forever would just be a different flavor of the
  // same stuck screen; render the actual login page instead.
  if (user && !skipRedirectInDemo) {
    return <LoadingScreen message={t('redirecting')} logoSrc={logoUrl || '/logo.png'} />
  }

  return <>{children}</>
}
