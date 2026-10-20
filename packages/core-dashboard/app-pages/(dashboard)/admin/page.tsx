"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { StatCard } from '@core/components/ui/stat-card'
import { fmtLEK, fmtEUR } from '@core/lib/currency'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import {
  Users, Calendar, Wallet, TrendingUp, Clock, User, CalendarClock,
  ShieldAlert, PackageSearch, Inbox, UserCheck, CheckCircle2,
} from 'lucide-react'
import { StatusBadge } from '@core/components/ui/status-badge'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { getAllPatientRisks, type PatientRisk } from '@core/lib/api/patient-risk'
import { getReorderRequests } from '@core/lib/api/inventory-reorders'
import { getWebsiteInquiries } from '@core/lib/api/website-inquiries'
import { getAttendance, type StaffAttendanceStatus } from '@core/lib/api/attendance'
import { cn } from '@core/lib/utils'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts'

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)']

// Custom tooltip content instead of Recharts' `contentStyle` (raw inline
// styles on a div it manages internally) — `data-slot="popover-content"`
// means this picks up the exact same border/shadow/blur treatment as every
// other floating surface in the app (including Aparenca's glass theme),
// instead of rendering as a flat, inconsistent box that ignores it.
function ChartTooltipContent({ active, payload, label, format }: {
  active?: boolean
  payload?: Array<{ value: number | string; name?: string }>
  label?: string
  format: (value: number | string) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div data-slot="popover-content" className="bg-popover text-popover-foreground border border-border rounded-xl shadow-lg px-3.5 py-2.5">
      {label && <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>}
      <p className="text-sm font-bold text-foreground">{format(payload[0].value)}</p>
    </div>
  )
}

// One "needs attention" tile — a real operational count that would otherwise
// require a trip to a different page (Pacientët, Inventari, Uebsajti, Stafi)
// to notice. Deliberately always rendered, not just when count > 0: a calm
// green "all clear" state is itself useful information, and a row that
// silently changes shape based on data reads as broken more than a row that
// sometimes shows zeros.
function AttentionTile({ href, icon: Icon, label, value, ok, sub }: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  ok: boolean
  sub?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 bg-card rounded-xl border border-border p-3.5 hover:border-accent/50 hover:shadow-sm transition-all"
    >
      <div className={cn(
        'w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
        ok ? 'ibg-green ic-green' : 'ibg-amber ic-amber',
      )}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-lg font-bold text-foreground leading-none tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground truncate mt-1">{sub || label}</p>
      </div>
      {ok && <CheckCircle2 className="h-4 w-4 text-muted-foreground/40 shrink-0" />}
    </Link>
  )
}

export default function AdminDashboard() {
  const t = useTranslations('admin-dashboard')
  const { patients, appointments, invoices, treatments, staff, auditLogs } = useData()
  const MONTH_NAMES = [
    t('months.jan'), t('months.feb'), t('months.mar'), t('months.apr'),
    t('months.may'), t('months.jun'), t('months.jul'), t('months.aug'),
    t('months.sep'), t('months.oct'), t('months.nov'), t('months.dec'),
  ]
  const DAY_NAMES = [t('days.mon'), t('days.tue'), t('days.wed'), t('days.thu'), t('days.fri'), t('days.sat')]
  const axisColor = 'var(--chart-1)'
  const gridColor = 'var(--border)'

  // ── "Needs attention" data — four small, cheap reads that already have
  // their own dedicated endpoints elsewhere in the app; fetched once here
  // rather than folded into the global DataProvider (this page is the only
  // place that needs all four together). ──────────────────────────────────
  const [riskPatients, setRiskPatients] = useState<PatientRisk[]>([])
  const [reorderCount, setReorderCount] = useState(0)
  const [newInquiryCount, setNewInquiryCount] = useState(0)
  const [attendanceToday, setAttendanceToday] = useState<StaffAttendanceStatus[]>([])

  useEffect(() => {
    Promise.all([
      getAllPatientRisks().catch(() => []),
      getReorderRequests('ne_pritje').catch(() => []),
      getWebsiteInquiries('e_re').catch(() => []),
      getAttendance().catch(() => null),
    ]).then(([risks, reorders, inquiries, attendance]) => {
      setRiskPatients(risks)
      setReorderCount(reorders.length)
      setNewInquiryCount(inquiries.length)
      setAttendanceToday(attendance?.staff ?? [])
    })
  }, [])

  const flaggedPatients = riskPatients.filter((r) => r.level !== 'ulet').length
  const clockedIn = attendanceToday.filter((s) => s.clockIn).length

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const pendingPayments = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0)
  const todayDate = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter(
    (a) => a.date?.substring(0, 10) === todayDate
  )
  const doctors = staff.filter((s) => s.role === 'mjek')

  // Real month-over-month comparisons, computed from data already loaded —
  // no extra fetch needed. Replaces what used to be hardcoded trend numbers
  // (`{ value: 12, isPositive: true }` etc.) that never actually reflected
  // the clinic's real activity.
  const { patientsTrend, revenueTrend, overdueInvoiceCount, completedToday } = useMemo(() => {
    const now = new Date()
    const thisMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthKey = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`

    const pctChange = (current: number, previous: number): number | null =>
      previous > 0 ? Math.round(((current - previous) / previous) * 100) : null

    const newPatientsThisMonth = patients.filter((p) => p.createdAt?.startsWith(thisMonthKey)).length
    const newPatientsLastMonth = patients.filter((p) => p.createdAt?.startsWith(lastMonthKey)).length

    const revenueThisMonth = invoices.filter((inv) => inv.createdAt?.startsWith(thisMonthKey)).reduce((s, i) => s + i.paidAmount, 0)
    const revenueLastMonth = invoices.filter((inv) => inv.createdAt?.startsWith(lastMonthKey)).reduce((s, i) => s + i.paidAmount, 0)

    const overdue = invoices.filter((inv) => inv.remainingAmount > 0 && inv.dueDate && inv.dueDate.substring(0, 10) < todayDate).length

    return {
      patientsTrend: { count: newPatientsThisMonth, pct: pctChange(newPatientsThisMonth, newPatientsLastMonth) },
      revenueTrend: pctChange(revenueThisMonth, revenueLastMonth),
      overdueInvoiceCount: overdue,
      completedToday: appointments.filter((a) => a.date?.substring(0, 10) === todayDate && a.status === 'perfunduar').length,
    }
  }, [patients, invoices, appointments, todayDate])

  const revenueData = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1)
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const value = invoices
        .filter((inv) => inv.createdAt?.startsWith(monthKey))
        .reduce((sum, inv) => sum + inv.paidAmount, 0)
      return { name: MONTH_NAMES[d.getMonth()], value }
    })
  }, [invoices])

  const appointmentsData = useMemo(() => {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(now)
    monday.setDate(now.getDate() + mondayOffset)
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      const dateKey = d.toISOString().split('T')[0]
      const value = appointments.filter((a) => a.date === dateKey).length
      return { name: DAY_NAMES[i], value }
    })
  }, [appointments])

  const treatmentData = useMemo(() => {
    const typeCounts: Record<string, number> = {}
    treatments.forEach((t) => {
      typeCounts[t.type] = (typeCounts[t.type] || 0) + 1
    })
    const sorted = Object.entries(typeCounts).sort((a, b) => b[1] - a[1])
    const top4 = sorted.slice(0, 4)
    const otherCount = sorted.slice(4).reduce((sum, [, c]) => sum + c, 0)
    const result = top4.map(([name, value], i) => ({ name, value, color: CHART_COLORS[i] }))
    if (otherCount > 0) result.push({ name: t('charts.other'), value: otherCount, color: CHART_COLORS[4] })
    return result
  }, [treatments, t])

  // Each doctor's share of appointment volume relative to the *busiest*
  // doctor right now — not, as this used to compute, each doctor's count
  // divided by itself. That old formula pegged every doctor with more than
  // 10 lifetime appointments at a permanent, meaningless 100%; this one
  // actually moves as the clinic's real distribution of work changes.
  const doctorLoad = useMemo(() => {
    const counts = doctors.map((doctor) => ({
      doctor,
      count: appointments.filter((a) => a.doctorId === doctor.id).length,
    }))
    const max = Math.max(1, ...counts.map((c) => c.count))
    return counts.map((c) => ({ ...c, percentage: Math.round((c.count / max) * 100) }))
  }, [doctors, appointments])

  return (
    <>
      <Topbar
        title={t('title')}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <PageLoadingGuard variant="dashboard">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
          <StatCard
            title={t('stats.totalPatients')}
            value={patients.length}
            icon={Users}
            trend={patientsTrend.pct !== null ? { value: patientsTrend.pct, isPositive: patientsTrend.pct >= 0 } : undefined}
            description={patientsTrend.pct === null ? t('stats.newThisMonth', { count: patientsTrend.count }) : undefined}
          />
          <StatCard
            title={t('stats.todayAppointments')}
            value={todayAppointments.length}
            icon={Calendar}
            description={todayAppointments.length > 0 ? t('stats.todayBreakdown', { done: completedToday, left: todayAppointments.length - completedToday }) : undefined}
          />
          <StatCard
            title={t('stats.totalRevenue')}
            value={fmtLEK(totalRevenue)}
            description={fmtEUR(totalRevenue)}
            icon={Wallet}
            color="emerald"
            trend={revenueTrend !== null ? { value: revenueTrend, isPositive: revenueTrend >= 0 } : undefined}
          />
          <StatCard
            title={t('stats.pendingPayments')}
            value={fmtLEK(pendingPayments)}
            description={overdueInvoiceCount > 0 ? t('stats.overdueCount', { count: overdueInvoiceCount }) : fmtEUR(pendingPayments)}
            icon={TrendingUp}
            color="amber"
          />
        </div>

        {/* Needs Attention — four operational signals that already live on
            their own dedicated pages (Pacientët's risk panel, Inventari,
            Uebsajti's inquiries tab, Stafi's attendance card); surfaced here
            so noticing them doesn't require a separate trip to each one. */}
        <div className="mb-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            {t('attention.title')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <AttentionTile
              href="/admin/pacientet"
              icon={ShieldAlert}
              label={t('attention.risk.label')}
              value={flaggedPatients}
              ok={flaggedPatients === 0}
              sub={flaggedPatients === 0 ? t('attention.risk.allClear') : t('attention.risk.label')}
            />
            <AttentionTile
              href="/admin/inventari"
              icon={PackageSearch}
              label={t('attention.reorders.label')}
              value={reorderCount}
              ok={reorderCount === 0}
              sub={reorderCount === 0 ? t('attention.reorders.allClear') : t('attention.reorders.label')}
            />
            <AttentionTile
              href="/admin/uebsajti?tab=kerkesa"
              icon={Inbox}
              label={t('attention.inquiries.label')}
              value={newInquiryCount}
              ok={newInquiryCount === 0}
              sub={newInquiryCount === 0 ? t('attention.inquiries.allClear') : t('attention.inquiries.label')}
            />
            <AttentionTile
              href="/admin/stafi"
              icon={UserCheck}
              label={t('attention.attendance.label')}
              value={t('attention.attendance.value', { present: clockedIn, total: attendanceToday.length })}
              ok
              sub={t('attention.attendance.label')}
            />
          </div>
        </div>

        {/* Today's Schedule — the "Takime Sot" stat above was just a bare
            count; this is the actual list, using the same todayAppointments
            data already being computed. */}
        <Card className="border-border/50 shadow-sm mb-8">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-primary flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-accent" />
              {t('todaySchedule.title')}
            </CardTitle>
            <Link href="/admin/takimet" className="text-sm font-medium text-accent hover:underline">
              {t('todaySchedule.viewAll')}
            </Link>
          </CardHeader>
          <CardContent>
            {todayAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">{t('todaySchedule.empty')}</p>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {todayAppointments
                  .slice()
                  .sort((a, b) => (a.time || '').localeCompare(b.time || ''))
                  .slice(0, 9)
                  .map((apt) => (
                    <div key={apt.id} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                      <div className="flex flex-col items-center justify-center rounded-lg bg-accent/10 px-2.5 py-1.5 min-w-[56px] shrink-0">
                        <span className="text-sm font-bold text-accent leading-none">{apt.time || '--:--'}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{apt.patientName || t('todaySchedule.visitFallback')}</p>
                        <p className="text-xs text-muted-foreground truncate">{apt.type || t('todaySchedule.visitFallback')}{apt.doctorName ? ` — ${apt.doctorName}` : ''}</p>
                      </div>
                      <StatusBadge status={apt.status} type="appointment" />
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Charts Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Revenue Chart */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">
                {t('charts.monthlyRevenue')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" stroke={axisColor} fontSize={12} />
                  <YAxis stroke={axisColor} fontSize={12} />
                  <Tooltip
                    cursor={{ fill: 'var(--accent)', opacity: 0.08 }}
                    content={<ChartTooltipContent format={(v) => fmtLEK(Number(v))} />}
                  />
                  <Bar dataKey="value" fill="var(--chart-1)" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Appointments Chart */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">
                {t('charts.weeklyAppointments')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={appointmentsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                  <XAxis dataKey="name" stroke={axisColor} fontSize={12} />
                  <YAxis stroke={axisColor} fontSize={12} allowDecimals={false} />
                  <Tooltip
                    cursor={{ stroke: 'var(--accent)', strokeWidth: 1, strokeDasharray: '4 4' }}
                    content={<ChartTooltipContent format={(v) => `${v} ${t('charts.appointmentsTooltip')}`} />}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke="var(--chart-1)"
                    strokeWidth={3}
                    dot={{ fill: 'var(--chart-1)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Treatment Distribution */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">
                {t('charts.treatmentTypes')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {treatmentData.length === 0 ? (
                <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
                  {t('charts.noTreatments')}
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={treatmentData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {treatmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltipContent format={(v) => `${v} ${t('charts.treatmentsTooltip')}`} />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-3 justify-center mt-4">
                    {treatmentData.map((item) => (
                      <div key={item.name} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs text-muted-foreground">{item.name}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Doctor Performance */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">
                {t('doctorPerformance.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {doctorLoad.map(({ doctor, count, percentage }) => (
                  <div key={doctor.id} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
                          <User className="h-4 w-4 text-accent" />
                        </div>
                        <span className="text-sm font-medium">{doctor.name}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {t('doctorPerformance.appointmentsCount', { count })}
                      </span>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
                {doctors.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('doctorPerformance.noDoctors')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-primary">
                {t('recentActivity.title')}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auditLogs.slice(0, 5).map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-accent" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-primary truncate">
                        {log.action}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {log.user} • {new Date(log.timestamp).toLocaleTimeString('sq-AL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </p>
                    </div>
                  </div>
                ))}
                {auditLogs.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    {t('recentActivity.noActivity')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
        </PageLoadingGuard>
      </div>
    </>
  )
}
