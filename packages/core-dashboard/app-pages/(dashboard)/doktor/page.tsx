"use client"

import { useTranslations } from 'next-intl'
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { Topbar } from "@core/components/layout/topbar"
import { StatCard } from "@core/components/ui/stat-card"
import { StatusBadge } from "@core/components/ui/status-badge"
import { Button } from "@core/components/ui/button"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@core/components/ui/select"
import Link from "next/link"
import { cn } from "@core/lib/utils"
import { toast } from "sonner"

function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("material-symbols-outlined select-none leading-none", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DoktorDashboard() {
  const t = useTranslations('doktor-dashboard')
  const { user } = useAuth()
  const { appointments, patients, treatments, updateAppointment } = useData()

  const today = localDateStr()

  const myAppointments = (appointments || []).filter(
    (a) => a.doctorId === user?.id || a.doctorName?.includes(user?.name || '')
  )
  const todayAppointments = myAppointments.filter((a) => a.date?.substring(0, 10) === today)
  const pendingToday = todayAppointments.filter(
    (a) => a.status === 'planifikuar' || a.status === 'ne_pritje'
  ).length

  const myPatientIds = [...new Set(myAppointments.map((a) => a.patientId))]
  const myPatients = (patients || []).filter((p) => myPatientIds.includes(p.id))
  const myTreatments = (treatments || []).filter((t) => t.doctorId === user?.id)

  const upcomingAppointments = myAppointments
    .filter(
      (a) =>
        (a.date?.substring(0, 10) ?? '') >= today &&
        (a.status === 'planifikuar' || a.status === 'ne_pritje' || a.status === 'ne_trajtim')
    )
    .sort((a, b) => {
      const da = a.date?.substring(0, 10) ?? ''
      const db = b.date?.substring(0, 10) ?? ''
      if (da !== db) return da.localeCompare(db)
      return (a.time ?? '').localeCompare(b.time ?? '')
    })
    .slice(0, 6)

  const completedCount = myAppointments.filter((a) => a.status === 'perfunduar').length
  const cancelledCount = myAppointments.filter((a) => a.status === 'anuluar').length

  const todayPatients = todayAppointments
    .sort((a, b) => (a.time ?? '').localeCompare(b.time ?? ''))

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus as Parameters<typeof updateAppointment>[1]['status'] })
      toast.success("Statusi u ndryshua")
    } catch {
      toast.error("Gabim gjatë ndryshimit të statusit")
    }
  }

  const quickLinks = [
    {
      href: '/doktor/kalendari',
      icon: 'calendar_month',
      iconBg: 'ibg-blue',
      iconColor: 'ic-blue',
      title: t('quickNav.calendar.title'),
      subtitle: t('quickNav.calendar.subtitle'),
    },
    {
      href: '/doktor/pacientet',
      icon: 'group',
      iconBg: 'ibg-sky',
      iconColor: 'ic-sky',
      title: t('quickNav.patients.title'),
      subtitle: t('quickNav.patients.subtitle'),
    },
    {
      href: '/doktor/trajtimet',
      icon: 'stethoscope',
      iconBg: 'ibg-green',
      iconColor: 'ic-green',
      title: t('quickNav.treatments.title'),
      subtitle: t('quickNav.treatments.subtitle'),
    },
    {
      href: '/doktor/recetat',
      icon: 'description',
      iconBg: 'ibg-amber',
      iconColor: 'ic-amber',
      title: t('quickNav.prescriptions.title'),
      subtitle: t('quickNav.prescriptions.subtitle'),
    },
  ]

  return (
    <>
      <Topbar />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <PageLoadingGuard stats={4} cols={4} rows={7}>

        {/* Page header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">
            {t('welcome', { name: user?.name || t('doctorFallback') })}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>

        {/* Stat cards */}
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <StatCard title={t('stats.todayAppointments')} value={todayAppointments.length} icon="event"       color="blue"    />
          <StatCard title={t('stats.myPatients')}         value={myPatients.length}        icon="group"       color="sky"  />
          <StatCard title={t('stats.totalTreatments')}    value={myTreatments.length}      icon="stethoscope" color="emerald" />
          <StatCard title={t('stats.pendingToday')}       value={pendingToday}             icon="schedule"    color="amber"   />
        </div>

        {/* Pacientët e Sotëm — full width */}
        <div className="bg-card rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
            <div>
              <h2 className="text-base font-semibold text-foreground">{t('todaySection.title')}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">{t('todaySection.count', { count: todayPatients.length })}</p>
            </div>
            <Link href="/doktor/kalendari">
              <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                <Icon name="calendar_month" size={13} />
                {t('todaySection.calendarButton')}
              </Button>
            </Link>
          </div>
          {todayPatients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 gap-3">
              <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                <Icon name="event_available" size={28} className="text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">{t('todaySection.emptyTitle')}</p>
              <p className="text-xs text-muted-foreground/60">{t('todaySection.emptySubtitle')}</p>
            </div>
          ) : (
            <ul className="divide-y divide-border/50">
              {todayPatients.map((apt) => {
                const pat = patients.find(p => p.id === apt.patientId)
                return (
                  <li key={apt.id} className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-secondary/40 transition-colors">
                    <div className="text-right shrink-0 w-14">
                      <p className="text-sm font-bold text-accent font-mono">{apt.time || '—'}</p>
                      <p className="text-[10px] text-muted-foreground/60 mt-0.5">{apt.duration} min</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{apt.patientName}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">{apt.type || t('todaySection.visitFallback')}</p>
                      {pat?.phone && (
                        <p className="text-xs text-muted-foreground/60">{pat.phone}</p>
                      )}
                    </div>
                    <Select
                      value={apt.status}
                      onValueChange={(v) => handleStatusChange(apt.id, v)}
                    >
                      <SelectTrigger className="w-36 h-8 text-xs rounded-lg border-border">
                        <StatusBadge status={apt.status} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="planifikuar">{t('status.planifikuar')}</SelectItem>
                        <SelectItem value="ne_pritje">{t('status.ne_pritje')}</SelectItem>
                        <SelectItem value="ne_trajtim">{t('status.ne_trajtim')}</SelectItem>
                        <SelectItem value="perfunduar">{t('status.perfunduar')}</SelectItem>
                        <SelectItem value="anuluar">{t('status.anuluar')}</SelectItem>
                        <SelectItem value="mungoi">{t('status.mungoi')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {pat?.id && (
                      <Link href={`/doktor/pacientet/${pat.id}`}>
                        <Button variant="ghost" size="sm" className="rounded-lg">
                          <Icon name="person" size={15} />
                        </Button>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        {/* Main grid */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Upcoming appointments */}
          <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col">
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border/50">
              <h2 className="text-base font-semibold text-foreground">{t('upcomingSection.title')}</h2>
              <Link href="/doktor/takimet">
                <Button variant="outline" size="sm" className="rounded-xl text-xs gap-1.5">
                  <Icon name="open_in_new" size={13} />
                  {t('upcomingSection.viewAll')}
                </Button>
              </Link>
            </div>

            <div className="flex-1">
              {upcomingAppointments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center">
                    <Icon name="event_available" size={28} className="text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground font-medium">{t('upcomingSection.emptyTitle')}</p>
                  <p className="text-xs text-muted-foreground/60">{t('upcomingSection.emptySubtitle')}</p>
                </div>
              ) : (
                <ul className="divide-y divide-border/50">
                  {upcomingAppointments.map((apt) => (
                    <li key={apt.id} className="flex items-center gap-3 px-4 sm:px-6 py-3.5 hover:bg-secondary/40 transition-colors">
                      <div className="text-right shrink-0 w-12">
                        <p className="text-sm font-bold text-accent font-mono">{apt.time || '—'}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-0.5">{apt.date?.substring(0, 10)}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{apt.patientName}</p>
                        <p className="text-xs text-muted-foreground capitalize truncate">{apt.type || t('todaySection.visitFallback')}</p>
                      </div>
                      <StatusBadge status={apt.status} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Quick navigation */}
          <div className="bg-card rounded-2xl border border-border shadow-sm flex flex-col">
            <div className="px-6 pt-5 pb-4 border-b border-border/50">
              <h2 className="text-base font-semibold text-foreground">{t('quickNav.title')}</h2>
            </div>
            <div className="flex-1 p-4 grid grid-cols-2 gap-3">
              {quickLinks.map(({ href, icon, iconBg, iconColor, title, subtitle }) => (
                <Link
                  key={href}
                  href={href}
                  className="group flex flex-col gap-3 p-4 rounded-xl border border-border/50 hover:border-accent/30 hover:bg-accent/5 transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', iconBg)}>
                      <Icon name={icon} size={20} className={iconColor} />
                    </div>
                    <Icon name="chevron_right" size={16} className="text-muted-foreground/40 group-hover:text-muted-foreground transition-colors mt-1" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Weekly stats row */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[
            { value: completedCount,            label: t('weeklyStats.completed'),       icon: 'check_circle',  iconColor: 'ic-green'   },
            { value: myTreatments.length,        label: t('weeklyStats.treatmentsDone'),  icon: 'stethoscope',  iconColor: 'ic-blue'    },
            { value: myPatients.length,          label: t('weeklyStats.activePatients'),  icon: 'group',        iconColor: 'ic-sky'     },
            { value: cancelledCount,             label: t('weeklyStats.cancelled'),       icon: 'cancel',       iconColor: 'ic-red'     },
          ].map(({ value, label, icon, iconColor }) => (
            <div
              key={label}
              className="bg-card rounded-2xl border border-border shadow-sm p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-3xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground font-medium mt-1 leading-tight">{label}</p>
              </div>
              <Icon name={icon} size={28} className={cn('shrink-0', iconColor)} />
            </div>
          ))}
        </div>

        </PageLoadingGuard>
      </div>
    </>
  )
}
