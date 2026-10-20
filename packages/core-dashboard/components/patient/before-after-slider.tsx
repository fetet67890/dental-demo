"use client"

import { useRef, useState, useCallback } from "react"
import { cn } from "@core/lib/utils"

interface BeforeAfterSliderProps {
  beforeUrl: string
  afterUrl: string
  beforeLabel?: string
  afterLabel?: string
  className?: string
}

// A draggable-divider before/after image comparison — pure CSS clip-path,
// no external library needed.
export function BeforeAfterSlider({
  beforeUrl, afterUrl, beforeLabel = "Para", afterLabel = "Pas", className,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState(50) // percent from left
  const draggingRef = useRef(false)

  const updateFromClientX = useCallback((clientX: number) => {
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const pct = ((clientX - rect.left) / rect.width) * 100
    setPosition(Math.min(100, Math.max(0, pct)))
  }, [])

  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    updateFromClientX(e.clientX)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!draggingRef.current) return
    updateFromClientX(e.clientX)
  }
  const onPointerUp = () => { draggingRef.current = false }

  return (
    <div
      ref={containerRef}
      className={cn("relative w-full aspect-video rounded-xl overflow-hidden select-none bg-black/5 touch-none", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={afterUrl} alt={afterLabel} className="absolute inset-0 w-full h-full object-cover pointer-events-none" draggable={false} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={beforeUrl}
        alt={beforeLabel}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        draggable={false}
      />

      {/* Divider handle */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
        style={{ left: `${position}%` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white shadow-lg flex items-center justify-center">
          <span className="text-xs text-foreground/60">⇔</span>
        </div>
      </div>

      <span className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white pointer-events-none">{beforeLabel}</span>
      <span className="absolute top-2 right-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-black/60 text-white pointer-events-none">{afterLabel}</span>
    </div>
  )
}
