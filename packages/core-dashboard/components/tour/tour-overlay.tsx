"use client"

import { useEffect, useState, useRef, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useTour } from '@core/context/tour-context'
import { useBlockingModal } from '@core/context/blocking-modal-context'
import { waitForElement } from '@core/lib/tour/wait-for-element'
import { cn } from '@core/lib/utils'

type Rect = { top: number; left: number; width: number; height: number }

const CARD_WIDTH = 320
const MARGIN = 16
const EST_CARD_HEIGHT = 230

function computeCardStyle(rect: Rect | null): CSSProperties {
  if (!rect) {
    return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
  }
  const vw = window.innerWidth
  const vh = window.innerHeight
  let left = rect.left + rect.width / 2 - CARD_WIDTH / 2
  left = Math.min(Math.max(left, MARGIN), Math.max(MARGIN, vw - CARD_WIDTH - MARGIN))

  const spaceBelow = vh - (rect.top + rect.height)
  const placeAbove = spaceBelow < EST_CARD_HEIGHT + MARGIN && rect.top > EST_CARD_HEIGHT + MARGIN
  return placeAbove
    ? { top: rect.top - 12, left, transform: 'translateY(-100%)' }
    : { top: rect.top + rect.height + 12, left, transform: 'translateY(0)' }
}

// Desktop-only tour anchors — the persistent sidebar (and the profile link
// living inside it) is replaced by a bottom sheet on phone widths, closed by
// default; there's no "nav-dashboard" etc. actually on screen to spotlight
// until that sheet is opened. Rather than stalling out the full 2.5s
// waitForElement timeout on every affected step before giving up, these are
// skipped straight to the graceful centered-card fallback on narrow
// viewports (see the `isDesktopOnlyTarget` check below) — same fallback
// that already exists for any target that genuinely never shows up, just
// without the pointless wait first. Every OTHER step (`page-header`,
// `quick-actions`, `action-add-*`, ...) targets ordinary page content that
// renders identically regardless of viewport, so it's spotlighted on mobile
// exactly like desktop.
const MOBILE_BREAKPOINT_PX = 640
function isDesktopOnlySelector(selector: string | undefined): boolean {
  if (!selector) return false
  return selector.includes('data-tour="nav-') || selector === '[data-tour="profile-link"]'
}

// Renders the spotlight + tooltip for whatever tour is currently active
// (TourProvider owns the state; this component is purely the visual/
// positioning engine). Mounted once at the app root so it survives route
// navigation triggered by a step's own `route` — see the effect below.
export function TourOverlay() {
  const { active, steps, stepIndex, role, next, prev, skip } = useTour()
  const { isBlocked } = useBlockingModal()
  const router = useRouter()
  const t = useTranslations('tour')

  const step = steps[stepIndex]
  const [rect, setRect] = useState<Rect | null>(null)
  const [ready, setReady] = useState(false)
  const targetElRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!active || !step) return
    let cancelled = false
    let cleanupListeners: (() => void) | undefined
    targetElRef.current = null
    setReady(false)
    setRect(null)

    const measure = (el: HTMLElement) => {
      // A defensive no-op, not the primary fix (that's skipInitialCheck
      // below) — if this ever fires on a node that's since been removed
      // from the document, getBoundingClientRect() would return all zeros
      // and pin the spotlight to the top-left corner instead of just
      // leaving the last good position on screen.
      if (!el.isConnected) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.top, left: r.left, width: r.width, height: r.height })
    }

    const run = async () => {
      // Compare against pathname+search, not just pathname — several steps
      // route into `/admin/profili?section=...`, where the query string is
      // the only thing distinguishing one step's destination from another.
      const here = window.location.pathname + window.location.search
      const navigating = !!step.route && here !== step.route
      if (navigating) {
        router.push(step.route!)
      }
      const skipTarget = !step.target || (isDesktopOnlySelector(step.target) && window.innerWidth < MOBILE_BREAKPOINT_PX)
      if (skipTarget) {
        if (!cancelled) setReady(true)
        return
      }
      // skipInitialCheck: true whenever we just navigated — see
      // wait-for-element.ts for exactly why this matters (the top-left bug).
      const el = await waitForElement(step.target!, 2500, { skipInitialCheck: navigating })
      if (cancelled) return
      if (!el) {
        // Target never showed up (slow fetch, wrong role, etc.) — degrade to
        // a centered card rather than getting stuck with no visible tooltip.
        setReady(true)
        return
      }
      targetElRef.current = el
      el.scrollIntoView({ block: 'center', behavior: 'smooth' })
      const remeasure = () => measure(el)
      // Every target here is already-visible persistent chrome, never far
      // off-screen — a short delay is enough for the smooth scroll to
      // settle without needing scrollend support/polyfills.
      const scrollSettleTimer = setTimeout(remeasure, 300)
      const ro = new ResizeObserver(remeasure)
      ro.observe(document.body)
      window.addEventListener('resize', remeasure)
      window.addEventListener('scroll', remeasure, true)
      // The overlay never blocks clicks (see the wrapper's pointer-events-none
      // below), so this target is always genuinely clickable through it —
      // this listener is what makes clicking it actually advance the tour,
      // same as Next, instead of leaving the spotlight stuck on a step the
      // user already acted on.
      const onTargetClick = () => next()
      el.addEventListener('click', onTargetClick)
      cleanupListeners = () => {
        clearTimeout(scrollSettleTimer)
        ro.disconnect()
        window.removeEventListener('resize', remeasure)
        window.removeEventListener('scroll', remeasure, true)
        el.removeEventListener('click', onTargetClick)
      }
      setReady(true)
    }
    run()

    return () => {
      cancelled = true
      cleanupListeners?.()
    }
  }, [active, stepIndex, step, router, next])

  useEffect(() => {
    if (!active || isBlocked) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') skip()
      else if (e.key === 'ArrowRight') next()
      else if (e.key === 'ArrowLeft') prev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, isBlocked, skip, next, prev])

  // Stand down entirely while something else already has the screen (the
  // work-mode prompt, most likely): the scrim itself doesn't block clicks
  // (see the wrapper below), but the tooltip card is a real, positioned,
  // pointer-events:auto element that could still land visually on top of a
  // dialog and eat a click meant for it. The tour resumes at the same step
  // once isBlocked clears.
  if (!active || !step || !role || isBlocked) return null

  const title = t(`${role}.${step.key}.title`)
  const body = t(`${role}.${step.key}.body`)
  const isFirst = stepIndex === 0
  const isLast = stepIndex === steps.length - 1

  return (
    // pointer-events-none: this overlay never blocks the page underneath —
    // every targeted step is meant to be genuinely clickable (see the click
    // listener above). Only the tooltip card (and its own buttons) opts back
    // into pointer-events-auto, since those need real clicks.
    <div className="fixed inset-0 z-[300] pointer-events-none">
      {rect ? (
        <div
          aria-hidden
          className="absolute rounded-2xl transition-all duration-300 ease-out"
          style={{
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.6)',
            outline: '2px solid var(--accent)',
            outlineOffset: '2px',
          }}
        />
      ) : (
        <div aria-hidden className="absolute inset-0 bg-slate-900/60" />
      )}

      {ready && (
        <div
          role="dialog"
          aria-modal="true"
          className="absolute w-80 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-2xl shadow-2xl p-5 animate-in fade-in-0 zoom-in-95 duration-200 pointer-events-auto"
          style={computeCardStyle(rect)}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">
              {t('common.stepOf', { current: stepIndex + 1, total: steps.length })}
            </span>
            <button
              onClick={skip}
              className="text-muted-foreground hover:text-foreground text-xs font-medium transition-colors"
            >
              {t('common.skip')}
            </button>
          </div>
          <h3 className="text-base font-bold text-foreground mb-1.5">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mb-4">{body}</p>
          {rect && (
            <p className="text-xs text-accent font-medium mb-4 -mt-2">{t('common.tryItHint')}</p>
          )}
          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={prev}
                className="px-3 py-1.5 rounded-xl text-sm font-medium text-muted-foreground hover:bg-secondary transition-colors"
              >
                {t('common.back')}
              </button>
            )}
            <button
              onClick={next}
              className="ml-auto px-4 py-1.5 rounded-xl text-sm font-semibold bg-accent text-accent-foreground hover:bg-accent/90 transition-colors"
            >
              {isLast ? t('common.finish') : t('common.next')}
            </button>
          </div>
          <div className="flex gap-1 mt-4 justify-center">
            {steps.map((s, i) => (
              <span
                key={s.id}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === stepIndex ? 'w-4 bg-accent' : 'w-1.5 bg-border',
                )}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
