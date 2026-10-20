"use client"

import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { StatCard } from '@core/components/ui/stat-card'
import { fmtLEK, fmtEUR } from '@core/lib/currency'
import { StatusBadge } from '@core/components/ui/status-badge'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Users, Calendar, Wallet, Clock, ArrowRight, User } from 'lucide-react'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import Link from 'next/link'

export default function ReceptionDashboard() {
  const t = useTranslations('recepsion-dashboard')
  const { patients, appointments, dailyTransactions, updateAppointment } = useData()

  const today = new Date().toISOString().split('T')[0]
  const todayAppointments = appointments.filter((a) => a.date?.substring(0, 10) === today)
  const waitingAppointments = todayAppointments.filter((a) => a.status === 'ne_pritje')
  const scheduledAppointments = todayAppointments.filter((a) => a.status === 'planifikuar')

  const todayIncome = dailyTransactions
    .filter((t) => t.createdAt.startsWith(today) && t.type === 'hyrese')
    .reduce((sum, t) => sum + t.amount, 0)

  const handleStatusChange = (id: string, status: 'ne_pritje' | 'ne_trajtim') => {
    updateAppointment(id, { status })
  }

  return (
    <>
      <Topbar
        title={t('topbar.title')}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <PageLoadingGuard stats={4} cols={5} rows={8}>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatCard
            title={t('stats.totalPatients')}
            value={patients.length}
            icon={Users}
          />
          <StatCard
            title={t('stats.todayAppointments')}
            value={todayAppointments.length}
            icon={Calendar}
          />
          <StatCard
            title={t('stats.waiting')}
            value={waitingAppointments.length}
            icon={Clock}
            color="amber"
          />
          <StatCard
            title={t('stats.todayCash')}
            value={fmtLEK(todayIncome)}
            description={fmtEUR(todayIncome)}
            icon={Wallet}
            color="emerald"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Waiting Patients */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary">
                {t('waitingCard.title')}
              </CardTitle>
              <span className="text-sm text-accent font-medium">
                {t('waitingCard.count', { count: waitingAppointments.length })}
              </span>
            </CardHeader>
            <CardContent>
              {waitingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {waitingAppointments.map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 ibg-amber rounded-xl border border-[var(--p-amber)]/30"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[var(--p-amber)]/20 flex items-center justify-center">
                          <User className="h-5 w-5 ic-amber" />
                        </div>
                        <div>
                          <p className="font-medium">{appointment.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.time} - {appointment.type}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleStatusChange(appointment.id, 'ne_trajtim')}
                        className="bg-accent hover:bg-accent/90"
                      >
                        {t('waitingCard.start')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{t('waitingCard.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Appointments */}
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg font-semibold text-primary">
                {t('upcomingCard.title')}
              </CardTitle>
              <Link href="/recepsion/takimet">
                <Button variant="ghost" size="sm" className="text-accent">
                  {t('upcomingCard.viewAll')}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {scheduledAppointments.length > 0 ? (
                <div className="space-y-3">
                  {scheduledAppointments.slice(0, 5).map((appointment) => (
                    <div
                      key={appointment.id}
                      className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{appointment.patientName}</p>
                          <p className="text-sm text-muted-foreground">
                            {appointment.time} - {appointment.doctorName}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(appointment.id, 'ne_pritje')}
                      >
                        {t('upcomingCard.checkIn')}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-10 w-10 mx-auto mb-2 opacity-50" />
                  <p>{t('upcomingCard.empty')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Link href="/recepsion/pacientet">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 ibg-sky rounded-lg">
                  <Users className="h-5 w-5 ic-sky" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('quickActions.patients.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('quickActions.patients.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recepsion/takimet">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 ibg-green rounded-lg">
                  <Calendar className="h-5 w-5 ic-green" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('quickActions.appointments.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('quickActions.appointments.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recepsion/kalendari">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 ibg-blue rounded-lg">
                  <Clock className="h-5 w-5 ic-blue" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('quickActions.calendar.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('quickActions.calendar.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          <Link href="/recepsion/arka">
            <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2 ibg-indigo rounded-lg">
                  <Wallet className="h-5 w-5 ic-indigo" />
                </div>
                <div>
                  <p className="font-medium text-sm">{t('quickActions.cashRegister.title')}</p>
                  <p className="text-xs text-muted-foreground">{t('quickActions.cashRegister.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
        </PageLoadingGuard>
      </div>
    </>
  )
}
