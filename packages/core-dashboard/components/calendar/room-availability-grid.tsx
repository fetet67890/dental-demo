"use client"

import { useState, useMemo, type ReactNode, type CSSProperties } from "react"
import {
  DndContext, useDraggable, useDroppable, PointerSensor, useSensor, useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { useClinicSettings } from "@core/context/clinic-settings-context"
import type { Appointment, Room } from "@core/types"
import { cn } from "@core/lib/utils"
import { computeResourceLoad, getLeastBusy } from "@core/lib/scheduling-load"

interface RoomAvailabilityGridProps {
  appointments: Appointment[]
  rooms: Room[]
  onAppointmentClick?: (appointment: Appointment) => void
}

const HOUR_HEIGHT = 64
const SNAP_MIN = 15
const UNASSIGNED = "__unassigned__"
const ABSOLUTE_MIN_HOUR = 6
const ABSOLUTE_MAX_HOUR = 23

type StatusStyle = { border: string; bg: string; text: string; dot: string; label: string }

function Icon({ name, size = 18, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("material-symbols-outlined select-none leading-none", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}

function toDateStr(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function normDate(d: string | undefined): string {
  if (!d) return ""
  return d.substring(0, 10)
}

function timeStrToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number)
  return h * 60 + (m || 0)
}

function minutesToTimeStr(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
}

// ── Droppable room column (also used for the "unassigned" column) ─────────
function RoomColumn({ roomId, children }: { roomId: string; children: ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: roomId })
  return (
    <div ref={setNodeRef} className={cn("relative border-r border-border/50 last:border-r-0", isOver && "bg-accent/[0.06]")}>
      {children}
    </div>
  )
}

// ── Draggable appointment card ─────────────────────────────────────────────
function DraggableAppointment({
  apt, style, className, children, disabled, onClick,
}: {
  apt: Appointment
  style: CSSProperties
  className: string
  children: ReactNode
  disabled: boolean
  onClick: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: apt.id, disabled })
  const draggedStyle: CSSProperties = transform
    ? { ...style, transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, zIndex: 30 }
    : style

  return (
    <div
      ref={setNodeRef}
      {...(disabled ? {} : listeners)}
      {...(disabled ? {} : attributes)}
      onClick={onClick}
      style={draggedStyle}
      className={cn(className, isDragging && "opacity-60 shadow-lg", !disabled && "touch-none")}
    >
      {children}
    </div>
  )
}

export function RoomAvailabilityGrid({ appointments, rooms, onAppointmentClick }: RoomAvailabilityGridProps) {
  const t = useTranslations('room-availability-grid')
  const { updateAppointment } = useData()
  const { openTime, closeTime } = useClinicSettings()
  const [currentDate, setCurrentDate] = useState(new Date())

  const gridStartHour = Math.max(ABSOLUTE_MIN_HOUR, Math.min((parseInt(openTime.split(':')[0], 10) || 8) - 1, ABSOLUTE_MAX_HOUR - 1))
  const gridEndHour = Math.max(gridStartHour + 1, Math.min((parseInt(closeTime.split(':')[0], 10) || 17) + 2, ABSOLUTE_MAX_HOUR))
  const HOURS = useMemo(
    () => Array.from({ length: gridEndHour - gridStartHour }, (_, i) => i + gridStartHour),
    [gridStartHour, gridEndHour]
  )
  const GRID_HEIGHT = HOURS.length * HOUR_HEIGHT
  const GRID_START_MIN = gridStartHour * 60
  const GRID_END_MIN = gridEndHour * 60 - 15

  const getAptPosition = (apt: Appointment): { top: number; height: number } | null => {
    const [hStr, mStr] = (apt.time || apt.ora || "0:00").split(":")
    const h = parseInt(hStr)
    const m = parseInt(mStr || "0")
    if (isNaN(h) || h < gridStartHour || h >= gridEndHour) return null
    const top = ((h - gridStartHour) + m / 60) * HOUR_HEIGHT
    const durationMin = apt.duration || apt.kohezgjatja || 30
    const height = Math.max(34, (durationMin / 60) * HOUR_HEIGHT - 3)
    return { top, height }
  }

  const STATUS_STYLES: Record<string, StatusStyle> = {
    planifikuar: { border: "border-l-[var(--p-blue)]",    bg: "bg-[var(--p-blue-bg)]",    text: "text-[var(--p-blue-txt)]",    dot: "dot-blue",    label: t('status.planifikuar') },
    ne_pritje:   { border: "border-l-[var(--p-amber)]",   bg: "bg-[var(--p-amber-bg)]",   text: "text-[var(--p-amber-txt)]",   dot: "dot-amber",   label: t('status.ne_pritje')   },
    ne_trajtim:  { border: "border-l-[var(--p-sky)]",     bg: "bg-[var(--p-sky-bg)]",     text: "text-[var(--p-sky-txt)]",     dot: "dot-sky",     label: t('status.ne_trajtim')  },
    perfunduar:  { border: "border-l-[var(--p-green)]",   bg: "bg-[var(--p-green-bg)]",   text: "text-[var(--p-green-txt)]",   dot: "dot-green",   label: t('status.perfunduar')  },
    anuluar:     { border: "border-l-[var(--p-red)]",     bg: "bg-[var(--p-red-bg)]",     text: "text-[var(--p-red-txt)]",     dot: "dot-red",     label: t('status.anuluar')     },
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const activeRooms = useMemo(() => (rooms || []).filter(r => r.isActive), [rooms])
  const columns = useMemo(
    () => [{ id: UNASSIGNED, name: t('unassigned') }, ...activeRooms],
    [activeRooms, t]
  )

  const dateStr = toDateStr(currentDate)
  const dayLabel = currentDate.toLocaleDateString("sq-AL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })

  // Every appointment for the day, regardless of whether a room is assigned —
  // room-less ones land in the "Pa Dhomë" column so they can be dragged into one.
  const appointmentsByColumn = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const apt of appointments || []) {
      if (normDate(apt.date || apt.data) !== dateStr) continue
      if (apt.status === "anuluar") continue
      const key = apt.roomId || UNASSIGNED
      if (!map[key]) map[key] = []
      map[key].push(apt)
    }
    return map
  }, [appointments, dateStr])

  // "Which room is least busy" — a live same-day heuristic, excludes the
  // "unassigned" pseudo-column since it isn't a real bookable resource.
  const leastBusyRoomIds = useMemo(() => {
    const loads = computeResourceLoad(activeRooms, appointments, dateStr, apt => apt.roomId || undefined)
    return new Set(getLeastBusy(loads).map(l => l.id))
  }, [activeRooms, appointments, dateStr])

  const navigateDay = (dir: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir)
    setCurrentDate(d)
  }

  // Drag vertically to reschedule the time (snapped to 15 min), drag into a
  // different column to assign/reassign/clear the room. Doctor stays unchanged.
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event
    if (!over) return

    const apt = appointments.find(a => a.id === active.id)
    if (!apt) return

    const originalMinutes = timeStrToMinutes(apt.time || apt.ora || "00:00")
    const snappedDelta = Math.round((delta.y / HOUR_HEIGHT) * 60 / SNAP_MIN) * SNAP_MIN
    const newMinutes = Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, originalMinutes + snappedDelta))
    const newTime = minutesToTimeStr(newMinutes)
    const overId = String(over.id)
    const newRoomId = overId === UNASSIGNED ? null : overId
    const currentRoomId = apt.roomId || null

    if (newTime === (apt.time || apt.ora) && newRoomId === currentRoomId) return

    try {
      await updateAppointment(apt.id, { time: newTime, roomId: newRoomId })
      toast.success(newRoomId ? "Takimi u zhvendos me sukses" : "Dhoma u hoq nga takimi")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nuk u zhvendos dot takimi")
    }
  }

  const colWidth = columns.length > 0 ? `repeat(${columns.length}, minmax(160px, 1fr))` : "1fr"

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="door_front" size={20} className="text-accent" />
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
              {t('title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-7 capitalize">{dayLabel}</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(new Date())}
            className="text-xs font-semibold text-accent border border-accent/30 hover:bg-accent/10 rounded-lg px-3 py-1.5 transition-colors outline-none"
          >
            {t('today')}
          </button>
          <div className="flex items-center border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => navigateDay(-1)}
              className="px-2 py-1.5 hover:bg-secondary/60 transition-colors border-r border-border outline-none"
              aria-label={t('prevDay')}
            >
              <Icon name="chevron_left" size={20} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => navigateDay(1)}
              className="px-2 py-1.5 hover:bg-secondary/60 transition-colors outline-none"
              aria-label={t('nextDay')}
            >
              <Icon name="chevron_right" size={20} className="text-muted-foreground" />
            </button>
          </div>
        </div>
      </div>

      {activeRooms.length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          {t('emptyState')}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">

            {/* Column header row */}
            <div
              className="grid border-b border-border/50 bg-secondary/30"
              style={{ gridTemplateColumns: `64px ${colWidth}` }}
            >
              <div className="border-r border-border/50" />
              {columns.map((col) => {
                const count = (appointmentsByColumn[col.id] || []).length
                const isUnassigned = col.id === UNASSIGNED
                const recommended = leastBusyRoomIds.has(col.id)
                return (
                  <div key={col.id} className={cn("py-3 px-2 text-center border-r border-border/50 last:border-r-0", recommended && "ibg-green")}>
                    <div className={cn(
                      "w-8 h-8 mx-auto rounded-full flex items-center justify-center",
                      isUnassigned ? "bg-secondary text-muted-foreground" : "bg-accent/10 text-accent"
                    )}>
                      <Icon name={isUnassigned ? "help_outline" : "door_front"} size={16} />
                    </div>
                    <p className={cn("text-xs font-semibold mt-1 truncate", isUnassigned ? "text-muted-foreground" : "text-foreground")}>
                      {col.name}
                    </p>
                    <div className="flex flex-col items-center gap-1 mt-1">
                      {count > 0 ? (
                        <span className={cn(
                          "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                          isUnassigned ? "bg-secondary text-muted-foreground" : "bg-accent/15 text-accent"
                        )}>
                          {t('appointmentsCount', { count })}
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-medium px-1.5 py-0.5 rounded-full chip-green">
                          {t('freeAllDay')}
                        </span>
                      )}
                      {recommended && (
                        <span className="inline-flex items-center gap-0.5 text-[9px] font-semibold px-1.5 py-0.5 rounded-full chip-green">
                          <Icon name="auto_awesome" size={9} />
                          {t('leastBusy')}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Time grid */}
            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
              <div className="grid" style={{ gridTemplateColumns: `64px ${colWidth}`, height: GRID_HEIGHT }}>

                {/* Time gutter */}
                <div className="relative border-r border-border/50 bg-secondary/20">
                  {HOURS.map((hour, i) => (
                    <div
                      key={hour}
                      className="absolute left-0 right-0"
                      style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    >
                      <span className="absolute top-2 left-0 right-0 text-center text-[11px] font-semibold text-muted-foreground tabular-nums">
                        {hour.toString().padStart(2, "0")}:00
                      </span>
                      <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground/40 tabular-nums" style={{ top: HOUR_HEIGHT / 2 + 2 }}>
                        :30
                      </span>
                    </div>
                  ))}
                </div>

                {/* Columns */}
                {columns.map((col) => {
                  const colApts = (appointmentsByColumn[col.id] || []).filter(a => {
                    const h = parseInt((a.time || a.ora || "0:00").split(":")[0])
                    return h >= gridStartHour && h < gridEndHour
                  })

                  return (
                    <RoomColumn key={col.id} roomId={col.id}>
                      {/* Hour grid lines */}
                      {HOURS.map((_, i) => (
                        <div key={i} className="pointer-events-none absolute left-0 right-0" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                          <div className="absolute inset-x-0 top-0 border-t border-border/40" />
                          <div className="absolute inset-x-0 border-t border-border/25 border-dashed" style={{ top: HOUR_HEIGHT / 2 }} />
                        </div>
                      ))}

                      {/* Appointments */}
                      {colApts.map((apt) => {
                        const pos = getAptPosition(apt)
                        if (!pos) return null
                        const s = STATUS_STYLES[apt.status] ?? STATUS_STYLES["planifikuar"]
                        const showTime = pos.height >= 46
                        const showType = pos.height >= 58 && apt.type
                        const locked = apt.status === "perfunduar"

                        return (
                          <DraggableAppointment
                            key={apt.id}
                            apt={apt}
                            disabled={locked}
                            onClick={() => onAppointmentClick?.(apt)}
                            style={{ top: pos.top + 2, height: pos.height - 2, left: 2, right: 2 }}
                            className={cn(
                              "absolute rounded-md border-l-[3px] px-2 py-1 cursor-pointer overflow-hidden z-10",
                              "shadow-sm transition-shadow duration-150 hover:shadow-md hover:z-20",
                              !locked && "cursor-grab active:cursor-grabbing",
                              s.border, s.bg
                            )}
                          >
                            <p className={cn("font-semibold truncate leading-tight", s.text, pos.height < 42 ? "text-[10px]" : "text-[11px]")}>
                              {apt.patientName}
                            </p>
                            {showTime && (
                              <p className={cn("flex items-center gap-0.5 mt-0.5 truncate opacity-80", s.text, "text-[10px]")}>
                                <Icon name="schedule" size={9} className="shrink-0" />
                                {apt.time || apt.ora}
                              </p>
                            )}
                            {showType && (
                              <p className={cn("mt-0.5 truncate opacity-70 text-[10px]", s.text)}>
                                {apt.type}
                              </p>
                            )}
                            {pos.height >= 58 && apt.doctorName && (
                              <p className={cn("flex items-center gap-0.5 mt-0.5 truncate opacity-70 text-[10px]", s.text)}>
                                <Icon name="person" size={9} className="shrink-0" />
                                {apt.doctorName}
                              </p>
                            )}
                          </DraggableAppointment>
                        )
                      })}
                    </RoomColumn>
                  )
                })}
              </div>
            </DndContext>
          </div>
        </div>
      )}

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 border-t border-border/50 bg-secondary/20">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('legend')}</span>
        {Object.values(STATUS_STYLES).map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full shrink-0", s.dot)} />
            <span className="text-xs text-muted-foreground font-medium">{s.label}</span>
          </div>
        ))}
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70 italic ml-auto">
          <Icon name="drag_indicator" size={13} />
          {t('dragHint')}
        </span>
      </div>

    </div>
  )
}
