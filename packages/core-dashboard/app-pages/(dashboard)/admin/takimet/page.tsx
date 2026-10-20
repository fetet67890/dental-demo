"use client"

import { useMemo, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { StatusBadge } from '@core/components/ui/status-badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@core/components/ui/tabs'
import { AppointmentsListSection } from '@core/components/appointments/appointments-list-section'
import { AppointmentsCalendarSection } from '@core/components/appointments/appointments-calendar-section'
import { AppointmentRequestsSection } from '@core/components/appointments/appointment-requests-section'
import { syncUrl } from '@core/lib/utils'

type TabKey = 'list' | 'calendar' | 'requests'
const TAB_KEYS: TabKey[] = ['list', 'calendar', 'requests']

export default function AppointmentsPage() {
  const t = useTranslations('admin-takimet')
  const tKalendari = useTranslations('admin-kalendari')
  const { appointments } = useData()
  const searchParams = useSearchParams()

  const requested = searchParams.get('tab') as TabKey | null
  const [fallback, setFallback] = useState<TabKey>('list')
  const tab: TabKey = (requested && TAB_KEYS.includes(requested)) ? requested : fallback

  const setTab = (key: TabKey) => {
    setFallback(key)
    syncUrl(`/admin/takimet?tab=${key}`)
  }

  const meta: Record<TabKey, { title: string; subtitle: string }> = {
    list: { title: t('title'), subtitle: t('subtitle') },
    calendar: { title: tKalendari('title'), subtitle: tKalendari('subtitle') },
    requests: { title: t('hubTabs.requests'), subtitle: t('hubTabs.requestsSubtitle') },
  }

  const { todayStr, weekStartStr, weekEndStr, monthStr, todayLabel } = useMemo(() => {
    const now = new Date()
    const todayStr = now.toISOString().split('T')[0]
    const dow = now.getDay()
    const mondayOffset = dow === 0 ? -6 : 1 - dow
    const mon = new Date(now); mon.setDate(now.getDate() + mondayOffset)
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6)
    return {
      todayStr,
      weekStartStr: mon.toISOString().split('T')[0],
      weekEndStr:   sun.toISOString().split('T')[0],
      monthStr:     `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
      todayLabel:   now.toLocaleDateString('sq-AL', { weekday: 'long', day: 'numeric', month: 'long' }),
    }
  }, [])

  const active = (a: typeof appointments[number]) => a.status !== 'anuluar'
  const todayApts  = useMemo(() => appointments.filter(a => a.date?.substring(0,10) === todayStr && active(a)).sort((a,b) => (a.time||'').localeCompare(b.time||'')), [appointments, todayStr])
  const weekCount  = useMemo(() => appointments.filter(a => active(a) && a.date >= weekStartStr && a.date <= weekEndStr).length, [appointments, weekStartStr, weekEndStr])
  const monthCount = useMemo(() => appointments.filter(a => active(a) && a.date?.startsWith(monthStr)).length, [appointments, monthStr])

  return (
    <>
      <Topbar title={meta[tab].title} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">

        {/* Stats row — shared between both tabs */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t('stats.today'),     value: todayApts.length, strip: 'strip-blue',   note: todayLabel },
            { label: t('stats.thisWeek'),  value: weekCount,        strip: 'strip-sky',    note: t('stats.activeAppointments') },
            { label: t('stats.thisMonth'), value: monthCount,       strip: 'strip-indigo', note: t('stats.activeAppointments') },
          ].map(({ label, value, strip, note }) => (
            <div key={label} className="relative bg-card rounded-xl border border-border overflow-hidden p-3">
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${strip}`} />
              <p className="text-[11px] text-muted-foreground font-medium mt-1">{label}</p>
              <p className="text-2xl font-bold text-foreground leading-none mt-1">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{note}</p>
            </div>
          ))}
        </div>

        {/* Today's appointments — shared between both tabs */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <p className="font-semibold text-sm">{t('today.sectionTitle')}</p>
            <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
          </div>
          {todayApts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('today.empty')}</div>
          ) : (
            <div className="divide-y divide-border/40">
              {todayApts.map(apt => (
                <div key={apt.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="shrink-0 w-12 text-center">
                    <p className="text-sm font-bold text-accent">{apt.time}</p>
                    <p className="text-[10px] text-muted-foreground">{t('today.durationMinutes', { duration: apt.duration })}</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{apt.patientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.doctorName} · {apt.type}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="mb-6">
            <TabsTrigger value="list">{t('hubTabs.list')}</TabsTrigger>
            <TabsTrigger value="calendar">{t('hubTabs.calendar')}</TabsTrigger>
            <TabsTrigger value="requests">{t('hubTabs.requests')}</TabsTrigger>
          </TabsList>
          <TabsContent value="list">
            <AppointmentsListSection />
          </TabsContent>
          <TabsContent value="calendar">
            <AppointmentsCalendarSection />
          </TabsContent>
          <TabsContent value="requests">
            <AppointmentRequestsSection />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
