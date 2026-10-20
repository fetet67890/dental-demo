"use client"

import { useEffect, useState } from 'react'

export function LiveClock() {
  const [now, setNow] = useState<Date | null>(null)

  useEffect(() => {
    setNow(new Date())
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  if (!now) return null

  return (
    <span className="hidden md:inline-flex items-center px-2.5 h-9 rounded-xl text-xs font-semibold text-muted-foreground tabular-nums">
      {now.toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </span>
  )
}
