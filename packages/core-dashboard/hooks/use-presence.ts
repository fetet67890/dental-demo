'use client'

import { useEffect, useState } from 'react'

// Small stand-in for Radix's internal <Presence> for the handful of floating
// panels in this app that manage their own open/closed boolean directly
// instead of being built on a Radix primitive (Dialog/DropdownMenu/Popover
// already delay their own unmount for a data-[state=closed]:animate-out to
// finish — this is only needed where there's no Radix component underneath).
//
// Without this, `{open && <div>}` removes the node the instant `open` flips
// to false — any CSS exit animation on it never gets a chance to play, so
// the panel just vanishes mid-frame instead of dissolving out. This keeps
// the node mounted for `exitDurationMs` after `open` goes false so its own
// data-state="closed" + animate-out classes can finish first.
//
// Usage:
//   const mounted = usePresence(open, 200)
//   {mounted && <div data-state={open ? 'open' : 'closed'} className="data-[state=open]:animate-in data-[state=closed]:animate-out ...">
export function usePresence(open: boolean, exitDurationMs = 200): boolean {
  const [mounted, setMounted] = useState(open)

  useEffect(() => {
    if (open) {
      setMounted(true)
      return
    }
    const timer = setTimeout(() => setMounted(false), exitDurationMs)
    return () => clearTimeout(timer)
  }, [open, exitDurationMs])

  return mounted
}
