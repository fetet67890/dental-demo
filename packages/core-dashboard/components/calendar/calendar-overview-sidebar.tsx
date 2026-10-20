"use client"

import { useMemo } from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { CalendarCheck, CheckCircle2, Clock3, XCircle, ArrowRight } from "lucide-react"
import { cn } from "@core/lib/utils"
import type { Appointment } from "@core/types"

interface QuickAction {
  label: string
  icon: React.ComponentType<{ className?: string }>
  href?: string
  onClick?: () => void
}

interface CalendarOverviewSidebarProps {
  // The full role-scoped appointment list (not the calendar grid's own
  // week/staff/status filters) — "today" and "next up" should always
  // reflect reality regardless of which week the grid happens to be
  // showing right now.
  appointments: Appointment[]
  onAppointmentClick?: (appointment: Appointment) => void
  quickActions: QuickAction[]
}

function todayStr() {
  return new Date().toISOString().slice(0, 10)
}

function normDate(a: Appointment) {
  return (a.date || a.data || "").substring(0, 10)
}

export function CalendarOverviewSidebar({ appointments, onAppointmentClick, quickActions }: CalendarOverviewSidebarProps) {
  const t = useTranslations('calendar-overview-sidebar')
  const today = todayStr()

  const { total, completed, pending, missed, next } = useMemo(() => {
    const todayApts = appointments.filter((a) => normDate(a) === today)
    const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes()
    const timeToMinutes = (a: Appointment) => {
      const [h, m] = (a.time || a.ora || "0:00").split(":").map(Number)
      return h * 60 + (m || 0)
    }
    const activeStatuses: Appointment["status"][] = ["planifikuar", "ne_pritje", "ne_trajtim"]
    const next = appointments
      .filter((a) => activeStatuses.includes(a.status))
      .filter((a) => {
        const d = normDate(a)
        if (d > today) return true
        if (d === today) return timeToMinutes(a) >= nowMinutes
        return false
      })
      .sort((a, b) => (normDate(a) + (a.time || a.ora || "")).localeCompare(normDate(b) + (b.time || b.ora || "")))
      .slice(0, 5)

    return {
      total: todayApts.length,
      completed: todayApts.filter((a) => a.status === "perfunduar").length,
      pending: todayApts.filter((a) => a.status === "ne_pritje").length,
      missed: todayApts.filter((a) => a.status === "mungoi").length,
      next,
    }
  }, [appointments, today])

  const stats = [
    { key: "total", label: t('stats.total'), value: total, icon: CalendarCheck, tone: "blue" as const },
    { key: "completed", label: t('stats.completed'), value: completed, icon: CheckCircle2, tone: "green" as const },
    { key: "pending", label: t('stats.pending'), value: pending, icon: Clock3, tone: "amber" as const },
    { key: "missed", label: t('stats.missed'), value: missed, icon: XCircle, tone: "red" as const },
  ]

  return (
    <div className="w-full lg:w-80 shrink-0 space-y-4">
      {/* Today's Overview */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-2.5">
        <p className="text-sm font-semibold text-foreground px-1">{t('title')}</p>
        {stats.map((s) => (
          <div key={s.key} className="flex items-center gap-3 rounded-xl border border-border/60 p-2.5">
            <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", `ibg-${s.tone}`)}>
              <s.icon className={cn("h-4.5 w-4.5", `ic-${s.tone}`)} />
            </div>
            <div className="min-w-0">
              <p className="text-lg font-bold text-foreground leading-none">{s.value}</p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Next Appointments */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-3">
        <p className="text-sm font-semibold text-foreground px-1">{t('nextAppointments.title')}</p>
        {next.length === 0 ? (
          <p className="text-xs text-muted-foreground px-1 py-2">{t('nextAppointments.empty')}</p>
        ) : (
          <div className="space-y-1">
            {next.map((apt) => (
              <button
                key={apt.id}
                onClick={() => onAppointmentClick?.(apt)}
                className="w-full flex items-center gap-2.5 rounded-lg px-2 py-2 hover:bg-secondary/50 transition-colors text-left"
              >
                <div className="shrink-0 w-11 text-center">
                  <p className="text-xs font-bold text-accent tabular-nums">{apt.time || apt.ora}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-foreground truncate">{apt.patientName}</p>
                  <p className="text-[11px] text-muted-foreground truncate">{apt.type}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="bg-card rounded-2xl border border-border shadow-sm p-4 space-y-1">
        <p className="text-sm font-semibold text-foreground px-1 mb-1.5">{t('quickActions.title')}</p>
        {quickActions.map((action) => {
          const content = (
            <>
              <action.icon className="h-4 w-4 text-accent shrink-0" />
              <span className="flex-1 min-w-0 truncate">{action.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />
            </>
          )
          const className = "w-full flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-foreground hover:bg-secondary/50 transition-colors"
          return action.href ? (
            <Link key={action.label} href={action.href} className={className}>{content}</Link>
          ) : (
            <button key={action.label} onClick={action.onClick} className={className}>{content}</button>
          )
        })}
      </div>
    </div>
  )
}
