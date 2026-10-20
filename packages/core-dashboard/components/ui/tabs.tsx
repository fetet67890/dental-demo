'use client'

import * as React from 'react'
import * as TabsPrimitive from '@radix-ui/react-tabs'

import { cn } from '@core/lib/utils'

// Tracks which tab values have ever been the active one, per <Tabs> instance,
// so TabsContent below can lazy-mount a panel the first time it's opened and
// then keep it mounted forever after — see TabsContent's own comment for why
// both halves of that matter.
const TabsVisitedContext = React.createContext<Set<string> | null>(null)

function Tabs({
  className,
  value,
  defaultValue,
  onValueChange,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  const initial = value ?? defaultValue
  const [visited, setVisited] = React.useState<Set<string>>(() =>
    initial ? new Set([initial]) : new Set(),
  )

  const markVisited = React.useCallback((v: string) => {
    setVisited((prev) => (prev.has(v) ? prev : new Set(prev).add(v)))
  }, [])

  // Covers a controlled `value` changing by some path other than the user
  // clicking a TabsTrigger — e.g. a hub page reading ?tab= from the URL and
  // the user hitting browser back/forward, which changes `value` without
  // Radix ever calling onValueChange.
  React.useEffect(() => {
    if (value !== undefined) markVisited(value)
  }, [value, markVisited])

  const handleValueChange = React.useCallback((v: string) => {
    markVisited(v)
    onValueChange?.(v)
  }, [markVisited, onValueChange])

  return (
    <TabsVisitedContext.Provider value={visited}>
      <TabsPrimitive.Root
        data-slot="tabs"
        className={cn('flex flex-col gap-2', className)}
        value={value}
        defaultValue={defaultValue}
        onValueChange={handleValueChange}
        {...props}
      />
    </TabsVisitedContext.Provider>
  )
}

// SSR-safe useLayoutEffect: identical on the client, falls back to the async
// effect on the server so React doesn't warn about useLayoutEffect being a
// no-op there (this file is 'use client', but Next still renders it once on
// the server for the initial HTML).
const useIsomorphicLayoutEffect = typeof window !== 'undefined' ? React.useLayoutEffect : React.useEffect

type IndicatorRect = { left: number; top: number; width: number; height: number }

function TabsList({
  className,
  children,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  const listRef = React.useRef<HTMLDivElement | null>(null)
  const [rect, setRect] = React.useState<IndicatorRect | null>(null)
  const [ready, setReady] = React.useState(false)

  const measure = React.useCallback(() => {
    const list = listRef.current
    if (!list) return
    const active = list.querySelector<HTMLElement>('[data-slot="tabs-trigger"][data-state="active"]')
    if (!active) { setRect(null); return }
    setRect({ left: active.offsetLeft, top: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight })
  }, [])

  // Every navigator in the app shares this one component, so this single
  // sliding "thumb" — measured off whichever trigger Radix has just marked
  // data-state="active" — is what replaced the old per-trigger active
  // background everywhere at once, instead of hand-tuning each page's tab
  // bar individually.
  useIsomorphicLayoutEffect(() => {
    measure()
    setReady(true)
    const list = listRef.current
    if (!list) return
    // Radix flips data-state on the trigger buttons themselves when the
    // active tab changes — observe that directly rather than the outer
    // value prop, so this works no matter which page renders the Tabs.
    const mo = new MutationObserver(measure)
    mo.observe(list, { attributes: true, attributeFilter: ['data-state'], subtree: true })
    // Also re-measure on resize/reflow — wrapping tab bars on narrow screens,
    // a font/preset swap, sidebar collapse changing available width, etc.
    const ro = new ResizeObserver(measure)
    ro.observe(list)
    window.addEventListener('resize', measure)
    return () => {
      mo.disconnect()
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [measure])

  return (
    <TabsPrimitive.List
      ref={listRef}
      data-slot="tabs-list"
      className={cn(
        'relative isolate bg-muted text-muted-foreground inline-flex h-10 w-fit items-center justify-center gap-1 rounded-full p-1',
        className,
      )}
      {...props}
    >
      {rect && (
        <div
          aria-hidden
          data-slot="tabs-indicator"
          className={cn(
            // top-0 left-0 is load-bearing, not decorative: without an explicit
            // 0,0 baseline, an absolutely-positioned element with no top/left
            // falls back to its own "hypothetical static position" (wherever
            // it'd have landed in the flex flow) — the translate() below then
            // stacks on top of THAT unpredictable point instead of a clean
            // origin, landing the pill in a different wrong spot on every
            // tab bar depending on that bar's own flex layout.
            'absolute top-0 left-0 rounded-full bg-background shadow-sm -z-10',
            // Only animate the thumb once we've taken a first real measurement —
            // otherwise it visibly slides in from the top-left corner (0,0) on
            // every fresh page load instead of just appearing where it belongs.
            // Plain ease-out here on purpose, not a bounce — the springy
            // overshoot fit the Liquid Glass surface style's own playful
            // character, but read as an odd "blob"-like wobble on the plain
            // solid surface style where nothing else moves that way. Glass
            // mode reinstates its own bouncier easing via [data-slot="tabs-
            // indicator"] in globals.css instead of this being one fixed
            // curve for every surface style.
            ready && 'transition-[transform,width,height] duration-300 ease-out',
          )}
          style={{ width: rect.width, height: rect.height, transform: `translate(${rect.left}px, ${rect.top}px)` }}
        />
      )}
      {children}
    </TabsPrimitive.List>
  )
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        // Active state has no background of its own anymore — that's the
        // shared sliding indicator in TabsList, positioned behind this via
        // the indicator's -z-10. This trigger only ever needs to handle its
        // own text color/feedback.
        'relative z-0 inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium whitespace-nowrap',
        'text-muted-foreground hover:text-foreground/80 data-[state=active]:text-foreground',
        'transition-colors duration-150 active:scale-[0.97] transition-transform',
        'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring focus-visible:ring-[3px] focus-visible:outline-1',
        'disabled:pointer-events-none disabled:opacity-50',
        "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  const visited = React.useContext(TabsVisitedContext)
  // Lazy-mount-once, then persist. A panel that has never been the active
  // tab stays fully unmounted — so a hub page with several data-fetching
  // tabs (Financa, Uebsajti, Takimet, a patient's own Overview/Chart/
  // Treatments/Payments/Documents tabs, ...) only ever runs the fetch for
  // the tab a user actually opens, not all of them at once just because the
  // page rendered. That "all of them at once" was a real regression from an
  // earlier version of this file that force-mounted unconditionally: it did
  // stop a tab from re-fetching on every switch, but it also made every
  // *other* tab on the page fetch immediately on first load, multiplying a
  // hub page's request count by its tab count on every single visit — which
  // is what actually tripped the API's rate limiter, not a real "page
  // reload." Once a panel IS activated for the first time, it's added to
  // `visited` and force-mounted from then on, so switching away and back
  // still doesn't re-run its fetch — the original bug this file was built to
  // fix in the first place, without paying for it up front on every tab.
  const alreadyVisited = value !== undefined && visited?.has(value)
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      value={value}
      forceMount={alreadyVisited || undefined}
      className={cn(
        'flex-1 outline-none duration-200',
        'data-[state=inactive]:hidden',
        'data-[state=active]:animate-in data-[state=active]:fade-in-0 data-[state=active]:slide-in-from-bottom-2',
        className,
      )}
      {...props}
    />
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent }
