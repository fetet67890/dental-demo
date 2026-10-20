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
import { useQuickActions } from "@core/context/quick-actions-context"
import { Button } from "@core/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@core/components/ui/select"
import { Plus } from "lucide-react"
import type { Appointment, Staff } from "@core/types"
import { cn } from "@core/lib/utils"

type StatusFilter = "all" | "upcoming" | "pending" | "completed" | "missed"

const STATUS_FILTER_MAP: Record<Exclude<StatusFilter, "all">, Appointment["status"]> = {
  upcoming: "planifikuar",
  pending: "ne_pritje",
  completed: "perfunduar",
  missed: "mungoi",
}

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  // Optional — only recepsion's multi-doctor view passes this, which is what
  // turns on the staff filter dropdown below. Doktor's own calendar already
  // only ever sees their own appointments, so a filter picking between
  // "themselves" and nothing else would be pointless chrome.
  doctors?: Staff[]
}

const HOUR_HEIGHT = 64
const SNAP_MIN = 15
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

function getWeekDates(date: Date): Date[] {
  const week: Date[] = []
  const start = new Date(date)
  const day = start.getDay()
  start.setDate(start.getDate() - day + (day === 0 ? -6 : 1))
  for (let i = 0; i < 7; i++) {
    const d = new Date(start)
    d.setDate(start.getDate() + i)
    week.push(d)
  }
  return week
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

function isToday(date: Date) {
  return toDateStr(date) === toDateStr(new Date())
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

// ── Droppable day column ────────────────────────────────────────────────────
function DayColumn({ dateStr, children, className }: { dateStr: string; children: ReactNode; className?: string }) {
  const { setNodeRef, isOver } = useDroppable({ id: dateStr })
  return (
    <div ref={setNodeRef} className={cn(className, isOver && "bg-accent/[0.06]")}>
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

export function AppointmentCalendar({ appointments, onAppointmentClick, doctors }: AppointmentCalendarProps) {
  const t = useTranslations('appointment-calendar')
  const { updateAppointment } = useData()
  const { openTime, closeTime } = useClinicSettings()
  const { openDialog } = useQuickActions()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [staffFilter, setStaffFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all")

  // Show a window scoped to the clinic's actual hours (±1-2h padding for
  // early/late outliers) instead of a fixed 6:00–23:00 span — a clinic open
  // 8–17 doesn't need 18 empty hour rows forcing its own inner scrollbar.
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

  const MONTHS = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'), t('months.may'), t('months.jun'),
    t('months.jul'), t('months.aug'), t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec'),
  ]
  const DAYS_SHORT = [
    t('daysShort.mon'), t('daysShort.tue'), t('daysShort.wed'), t('daysShort.thu'),
    t('daysShort.fri'), t('daysShort.sat'), t('daysShort.sun'),
  ]
  const STATUS_STYLES: Record<string, StatusStyle> = {
    planifikuar: { border: "border-l-[var(--p-blue)]",  bg: "bg-[var(--p-blue-bg)]",  text: "text-[var(--p-blue-txt)]",  dot: "dot-blue",  label: t('status.planifikuar') },
    ne_pritje:   { border: "border-l-[var(--p-amber)]", bg: "bg-[var(--p-amber-bg)]", text: "text-[var(--p-amber-txt)]", dot: "dot-amber", label: t('status.ne_pritje') },
    ne_trajtim:  { border: "border-l-[var(--p-sky)]",   bg: "bg-[var(--p-sky-bg)]",   text: "text-[var(--p-sky-txt)]",   dot: "dot-sky",   label: t('status.ne_trajtim') },
    perfunduar:  { border: "border-l-[var(--p-green)]", bg: "bg-[var(--p-green-bg)]", text: "text-[var(--p-green-txt)]", dot: "dot-green", label: t('status.perfunduar') },
    anuluar:     { border: "border-l-[var(--p-red)]",   bg: "bg-[var(--p-red-bg)]",   text: "text-[var(--p-red-txt)]",   dot: "dot-red",   label: t('status.anuluar') },
  }

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate])

  // Staff filter narrows which appointments are eligible at all; status
  // filter (the pills below the header) narrows further. Both apply before
  // the grid ever groups anything by date, so drag/drop, overlap-column
  // layout, etc. all just work against whatever's currently visible.
  const filteredAppointments = useMemo(() => {
    return (appointments || []).filter((apt) => {
      if (staffFilter !== "all" && apt.doctorId !== staffFilter) return false
      if (statusFilter !== "all" && apt.status !== STATUS_FILTER_MAP[statusFilter]) return false
      return true
    })
  }, [appointments, staffFilter, statusFilter])

  const statusCounts = useMemo(() => {
    const base = (appointments || []).filter((apt) => staffFilter === "all" || apt.doctorId === staffFilter)
    return {
      all: base.length,
      upcoming: base.filter((a) => a.status === "planifikuar").length,
      pending: base.filter((a) => a.status === "ne_pritje").length,
      completed: base.filter((a) => a.status === "perfunduar").length,
      missed: base.filter((a) => a.status === "mungoi").length,
    }
  }, [appointments, staffFilter])

  const appointmentsByDate = useMemo(() => {
    const map: Record<string, Appointment[]> = {}
    for (const apt of filteredAppointments) {
      const key = normDate(apt.date || apt.data)
      if (!key) continue
      if (!map[key]) map[key] = []
      map[key].push(apt)
    }
    return map
  }, [filteredAppointments])

  const navigateWeek = (dir: number) => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + dir * 7)
    setCurrentDate(d)
  }

  const weekLabel = () => {
    const s = weekDates[0], e = weekDates[6]
    if (s.getFullYear() !== e.getFullYear()) {
      return `${s.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`
    }
    if (s.getMonth() === e.getMonth()) {
      return `${s.getDate()} – ${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`
    }
    return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${s.getFullYear()}`
  }

  // Drag vertically to reschedule the time (snapped to 15 min), drag into a
  // different day column to reschedule the date. Doctor/room stay unchanged
  // here — this view mixes doctors in one column, so reassigning them isn't
  // meaningful; use the "Sipas Mjekëve" grid for that.
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over, delta } = event
    if (!over) return

    const apt = appointments.find(a => a.id === active.id)
    if (!apt) return

    const originalMinutes = timeStrToMinutes(apt.time || apt.ora || "00:00")
    const snappedDelta = Math.round((delta.y / HOUR_HEIGHT) * 60 / SNAP_MIN) * SNAP_MIN
    const newMinutes = Math.max(GRID_START_MIN, Math.min(GRID_END_MIN, originalMinutes + snappedDelta))
    const newTime = minutesToTimeStr(newMinutes)
    const newDate = String(over.id)

    if (newTime === (apt.time || apt.ora) && newDate === normDate(apt.date || apt.data)) return

    try {
      await updateAppointment(apt.id, { time: newTime, date: newDate })
      toast.success("Takimi u zhvendos me sukses")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Nuk u zhvendos dot takimi")
    }
  }

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-border/50">
        <div>
          <div className="flex items-center gap-2">
            <Icon name="calendar_month" size={20} className="text-accent" />
            <h2 className="text-[15px] font-semibold text-foreground tracking-tight">
              {t('title')}
            </h2>
          </div>
          <p className="text-sm text-muted-foreground mt-1 pl-7">{weekLabel()}</p>
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
              onClick={() => navigateWeek(-1)}
              className="px-2 py-1.5 hover:bg-secondary/60 transition-colors border-r border-border outline-none"
              aria-label={t('previousWeek')}
            >
              <Icon name="chevron_left" size={20} className="text-muted-foreground" />
            </button>
            <button
              onClick={() => navigateWeek(1)}
              className="px-2 py-1.5 hover:bg-secondary/60 transition-colors outline-none"
              aria-label={t('nextWeek')}
            >
              <Icon name="chevron_right" size={20} className="text-muted-foreground" />
            </button>
          </div>
          <div className="w-px h-6 bg-border mx-1" />
          <Button size="sm" className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => openDialog('takim')}>
            <Plus className="h-4 w-4" />
            {t('newAppointment')}
          </Button>
        </div>
      </div>

      {/* ── Filters: staff (recepsion's multi-doctor view only) + status pills ── */}
      <div className="flex flex-wrap items-center gap-3 px-6 py-3 border-b border-border/50 bg-secondary/10">
        {doctors && doctors.length > 0 && (
          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="h-8 w-auto min-w-[160px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('staffFilter.all')}</SelectItem>
              {doctors.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", "upcoming", "pending", "completed", "missed"] as StatusFilter[]).map((key) => {
            const active = statusFilter === key
            return (
              <button
                key={key}
                onClick={() => setStatusFilter(key)}
                className={cn(
                  "text-xs font-medium px-2.5 py-1 rounded-full border transition-colors outline-none",
                  active
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:border-accent/50 hover:text-foreground"
                )}
              >
                {t(`filters.${key}`)} · {statusCounts[key]}
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Grid ── */}
      <div className="overflow-x-auto">
        <div className="min-w-[720px]">

          {/* Day header row */}
          <div className="grid grid-cols-[64px_repeat(7,1fr)] border-b border-border/50 bg-secondary/30">
            <div className="border-r border-border/50" />
            {weekDates.map((date, i) => {
              const count = (appointmentsByDate[toDateStr(date)] || []).length
              const today = isToday(date)
              return (
                <div
                  key={i}
                  className={cn(
                    "py-3 px-2 text-center border-r border-border/50 last:border-r-0",
                    today && "bg-accent/10"
                  )}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {DAYS_SHORT[i]}
                  </p>
                  <p className={cn("text-xl font-bold mt-0.5", today ? "text-accent" : "text-foreground")}>
                    {date.getDate()}
                  </p>
                  {count > 0 ? (
                    <span className={cn(
                      "inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full mt-1",
                      today ? "bg-accent text-accent-foreground" : "bg-accent/15 text-accent"
                    )}>
                      {count}
                    </span>
                  ) : (
                    <span className="inline-block h-5 mt-1" />
                  )}
                </div>
              )
            })}
          </div>

          {/* Time grid — single tall positioned container, no per-row borders cutting events */}
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <div className="grid grid-cols-[64px_repeat(7,1fr)]" style={{ height: GRID_HEIGHT }}>

              {/* Time gutter */}
              <div className="relative border-r border-border/50 bg-secondary/20">
                {HOURS.map((hour, i) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0"
                    style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                  >
                    {/* Hour label */}
                    <span className="absolute top-2 left-0 right-0 text-center text-[11px] font-semibold text-muted-foreground tabular-nums">
                      {hour.toString().padStart(2, "0")}:00
                    </span>
                    {/* Half-hour tick */}
                    <span className="absolute left-1/2 -translate-x-1/2 text-[9px] text-muted-foreground/40 tabular-nums" style={{ top: HOUR_HEIGHT / 2 + 2 }}>
                      :30
                    </span>
                  </div>
                ))}
              </div>

              {/* Day columns */}
              {weekDates.map((date, dayIdx) => {
                const today = isToday(date)
                const dStr = toDateStr(date)
                const dayApts = (appointmentsByDate[dStr] || []).filter(a => {
                  const h = parseInt((a.time || a.ora || "0:00").split(":")[0])
                  return h >= gridStartHour && h < gridEndHour
                })

                // Group by same hour for side-by-side overlap handling
                const hourGroups: Record<number, Appointment[]> = {}
                for (const apt of dayApts) {
                  const h = parseInt((apt.time || apt.ora || "0:00").split(":")[0])
                  if (!hourGroups[h]) hourGroups[h] = []
                  hourGroups[h].push(apt)
                }

                return (
                  <DayColumn
                    key={dayIdx}
                    dateStr={dStr}
                    className={cn(
                      "relative border-r border-border/50 last:border-r-0",
                      today && "bg-accent/[0.04]"
                    )}
                  >
                    {/* Hour grid lines (pointer-events-none so they don't block clicks) */}
                    {HOURS.map((_, i) => (
                      <div key={i} className="pointer-events-none absolute left-0 right-0" style={{ top: i * HOUR_HEIGHT, height: HOUR_HEIGHT }}>
                        {/* Full-hour solid line */}
                        <div className="absolute inset-x-0 top-0 border-t border-border/40" />
                        {/* Half-hour dashed line */}
                        <div className="absolute inset-x-0 border-t border-border/25 border-dashed" style={{ top: HOUR_HEIGHT / 2 }} />
                      </div>
                    ))}

                    {/* Appointments */}
                    {Object.values(hourGroups).flatMap((apts) =>
                      apts.map((apt, colIdx) => {
                        const pos = getAptPosition(apt)
                        if (!pos) return null
                        const s = STATUS_STYLES[apt.status] ?? STATUS_STYLES["planifikuar"]
                        const total = apts.length
                        const pct = 100 / total
                        const showTime = pos.height >= 46
                        const showType = pos.height >= 58 && apt.type
                        const showDoctor = pos.height >= 72 && apt.doctorName
                        const locked = apt.status === "perfunduar"

                        return (
                          <DraggableAppointment
                            key={apt.id}
                            apt={apt}
                            disabled={locked}
                            onClick={() => onAppointmentClick?.(apt)}
                            style={{
                              top: pos.top + 2,
                              height: pos.height - 2,
                              left: `calc(${colIdx * pct}% + 2px)`,
                              width: `calc(${pct}% - 4px)`,
                            }}
                            className={cn(
                              "absolute rounded-lg bg-card border-l-[3px] pl-2 pr-1.5 py-1.5 cursor-pointer overflow-hidden z-10",
                              "shadow-sm transition-shadow duration-150 hover:shadow-md hover:z-20",
                              !locked && "cursor-grab active:cursor-grabbing",
                              s.border
                            )}
                          >
                            {/* White card + a solid colored left bar (not a
                                full pastel fill) — legible at any text length
                                and in any theme, since it's real foreground
                                text on `bg-card` rather than colored text on a
                                colored tint. Time sits top-right in the
                                status color so the glanceable color-coding
                                the old dot/pastel version gave is still
                                there, just carried by the bar + time instead
                                of tinting the whole card. */}
                            <div className="flex items-start justify-between gap-1 min-w-0">
                              <p className={cn("font-bold truncate leading-tight text-foreground", pos.height < 42 ? "text-[10px]" : "text-[11px]")}>
                                {apt.patientName}
                              </p>
                              {showTime && (
                                <p className={cn("font-bold shrink-0 tabular-nums text-[10px]", s.text)}>
                                  {apt.time || apt.ora}
                                </p>
                              )}
                            </div>
                            {showType && (
                              <span className={cn("inline-block mt-1 truncate max-w-full text-[9px] font-semibold px-1.5 py-[1px] rounded-full", s.bg, s.text)}>
                                {apt.type}
                              </span>
                            )}
                            {showDoctor && (
                              <p className="flex items-center gap-0.5 mt-1 truncate text-muted-foreground text-[10px]">
                                <Icon name="schedule" size={9} className="shrink-0" />
                                {apt.duration || apt.kohezgjatja} min{apt.doctorName ? ` · ${apt.doctorName}` : ''}{apt.roomName ? ` · ${apt.roomName}` : ''}
                              </p>
                            )}
                          </DraggableAppointment>
                        )
                      })
                    )}
                  </DayColumn>
                )
              })}
            </div>
          </DndContext>
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-3 border-t border-border/50 bg-secondary/20">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{t('legend')}</span>
        {Object.values(STATUS_STYLES).map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={cn("w-2.5 h-2.5 rounded-[3px] shrink-0", s.dot)} />
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
