"use client"

import { useMemo, useState } from "react"
import { useTranslations } from 'next-intl'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@core/components/ui/table"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@core/components/ui/select"
import { StatusBadge } from "@core/components/ui/status-badge"
import { toast } from "sonner"
import Link from "next/link"
import { cn, fmtDate } from "@core/lib/utils"

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

export default function DoktorTakimet() {
  const t = useTranslations('doktor-takimet')
  const { user } = useAuth()
  const { appointments, updateAppointment } = useData()
  const [search, setSearch]             = useState("")
  const [dateFilter, setDateFilter]     = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

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

  const allMy = useMemo(() => (appointments || []).filter(
    (a) => a.doctorId === user?.id || a.doctorName?.includes(user?.name || '')
  ), [appointments, user])

  const active = (a: { status: string }) => a.status !== 'anuluar'
  const todayApts  = useMemo(() => allMy.filter(a => a.date?.substring(0,10) === todayStr && active(a)).sort((a,b) => (a.time||'').localeCompare(b.time||'')), [allMy, todayStr])
  const weekCount  = useMemo(() => allMy.filter(a => active(a) && a.date >= weekStartStr && a.date <= weekEndStr).length, [allMy, weekStartStr, weekEndStr])
  const monthCount = useMemo(() => allMy.filter(a => active(a) && a.date?.startsWith(monthStr)).length, [allMy, monthStr])

  const myAppointments = useMemo(() => allMy
    .filter((a) => {
      const dateStr    = a.date?.substring(0, 10) ?? ''
      const name       = (a.patientName ?? '').toLowerCase()
      const matchSearch = !search     || name.includes(search.toLowerCase())
      const matchDate   = !dateFilter || dateStr === dateFilter
      const matchStatus = statusFilter === 'all' || a.status === statusFilter
      return matchSearch && matchDate && matchStatus
    })
    .sort((a, b) => {
      const da = a.date?.substring(0, 10) ?? ''
      const db = b.date?.substring(0, 10) ?? ''
      if (da !== db) return da.localeCompare(db)
      return (a.time ?? '').localeCompare(b.time ?? '')
    }), [allMy, search, dateFilter, statusFilter])

  const handleStart = async (id: string) => {
    await updateAppointment(id, { status: 'ne_trajtim' })
    toast.success('Takimi filloi')
  }

  const handleComplete = async (id: string) => {
    await updateAppointment(id, { status: 'perfunduar' })
    toast.success('Takimi u përfundua')
  }

  return (
    <>
      <Topbar />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <PageLoadingGuard stats={3} cols={5} rows={7}>

        <div data-tour="page-header">
          <h1 className="text-xl font-bold text-foreground">{t('header.title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('header.subtitle')}</p>
        </div>

        {/* Stats row */}
        <div className="grid gap-3 grid-cols-3">
          {[
            { label: t('stats.today'),     value: todayApts.length, strip: 'strip-blue',   note: todayLabel },
            { label: t('stats.thisWeek'),  value: weekCount,        strip: 'strip-sky',    note: t('stats.myAppointmentsNote') },
            { label: t('stats.thisMonth'), value: monthCount,       strip: 'strip-indigo', note: t('stats.myAppointmentsNote') },
          ].map(({ label, value, strip, note }) => (
            <div key={label} className="relative bg-card rounded-xl border border-border overflow-hidden p-3">
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${strip}`} />
              <p className="text-[11px] text-muted-foreground font-medium mt-1">{label}</p>
              <p className="text-2xl font-bold text-foreground leading-none mt-1">{value}</p>
              <p className="text-[10px] text-muted-foreground mt-1 truncate">{note}</p>
            </div>
          ))}
        </div>

        {/* Today's appointments */}
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
            <p className="font-semibold text-sm">{t('todayCard.title')}</p>
            <p className="text-xs text-muted-foreground capitalize">{todayLabel}</p>
          </div>
          {todayApts.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">{t('todayCard.empty')}</div>
          ) : (
            <div className="divide-y divide-border/40">
              {todayApts.map(apt => (
                <div key={apt.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="shrink-0 w-12 text-center">
                    <p className="text-sm font-bold text-accent">{apt.time}</p>
                    <p className="text-[10px] text-muted-foreground">{apt.duration}min</p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{apt.patientName}</p>
                    <p className="text-xs text-muted-foreground truncate">{apt.type}</p>
                  </div>
                  <StatusBadge status={apt.status} type="appointment" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Filters + table */}
        <Card className="bg-card rounded-2xl border border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-4 border-b border-border/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none z-10" />
                <Input
                  placeholder={t('filters.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-border"
                />
              </div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-[180px] rounded-xl border-border"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[170px] rounded-xl border-border">
                  <SelectValue placeholder={t('filters.statusPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('status.all')}</SelectItem>
                  <SelectItem value="planifikuar">{t('status.planifikuar')}</SelectItem>
                  <SelectItem value="ne_pritje">{t('status.ne_pritje')}</SelectItem>
                  <SelectItem value="ne_trajtim">{t('status.ne_trajtim')}</SelectItem>
                  <SelectItem value="perfunduar">{t('status.perfunduar')}</SelectItem>
                  <SelectItem value="anuluar">{t('status.anuluar')}</SelectItem>
                  <SelectItem value="mungoi">{t('status.mungoi')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="px-0 pb-0 overflow-x-auto">
            {myAppointments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                  <Icon name="event_busy" size={32} className="text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{t('empty.title')}</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">
                    {search || dateFilter || statusFilter !== 'all'
                      ? t('empty.filterHint')
                      : t('empty.noAppointments')}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 border-y border-border/50">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.timeDate')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.patient')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.type')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.duration')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.status')}</TableHead>
                    <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myAppointments.map((apt) => (
                    <TableRow
                      key={apt.id}
                      className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                    >
                      <TableCell className="pl-6 py-4">
                        <p className="font-mono text-sm font-semibold text-foreground">
                          {apt.time || '—'}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5">
                          {fmtDate(apt.date)}
                        </p>
                      </TableCell>

                      <TableCell className="py-4 font-medium text-foreground">
                        {apt.patientName}
                      </TableCell>

                      <TableCell className="py-4">
                        <span className="capitalize text-sm text-muted-foreground">{apt.type || '—'}</span>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell py-4">
                        <span className="text-sm text-muted-foreground">
                          {apt.duration ? `${apt.duration} min` : '—'}
                        </span>
                      </TableCell>

                      <TableCell className="py-4">
                        <Select
                          value={apt.status}
                          onValueChange={async (v) => {
                            await updateAppointment(apt.id, { status: v as Parameters<typeof updateAppointment>[1]['status'] })
                            toast.success("Statusi u ndryshua")
                          }}
                        >
                          <SelectTrigger className="w-36 h-8 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <StatusBadge status={apt.status} type="appointment" />
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
                      </TableCell>

                      <TableCell className="pr-6 py-4">
                        <div className="flex items-center gap-2">
                          {apt.status === 'planifikuar' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleStart(apt.id)}
                              className="gap-1.5 rounded-xl"
                            >
                              <Icon name="play_arrow" size={14} />
                              {t('actions.start')}
                            </Button>
                          )}
                          {apt.status === 'ne_trajtim' && (
                            <Button
                              size="sm"
                              onClick={() => handleComplete(apt.id)}
                              className="bg-[var(--p-green)] hover:opacity-90 text-white gap-1.5 rounded-xl"
                            >
                              <Icon name="check_circle" size={14} />
                              {t('actions.complete')}
                            </Button>
                          )}
                          {(apt.status === 'planifikuar' || apt.status === 'ne_trajtim') && (
                            <Link href={`/doktor/trajtimet/shto?pacient=${apt.patientId}&takim=${apt.id}`}>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="rounded-xl hover:text-accent hover:bg-accent/10"
                              >
                                {t('actions.treatment')}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        </PageLoadingGuard>
      </div>
    </>
  )
}
