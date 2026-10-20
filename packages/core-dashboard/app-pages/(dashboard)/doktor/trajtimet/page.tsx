"use client"

import { useState } from "react"
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
import Link from "next/link"
import { cn, fmtDate } from "@core/lib/utils"
import { fmtLEK, fmtEUR } from "@core/lib/currency"

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

export default function DoktorTrajtimet() {
  const t = useTranslations('doktor-trajtimet')
  const { user } = useAuth()
  const { treatments, patients } = useData()
  const [search, setSearch]         = useState("")
  const [typeFilter, setTypeFilter] = useState("all")

  const myTreatments = (treatments || [])
    .filter((t) => t.doctorId === user?.id || t.doctorName?.includes(user?.name || ''))
    .filter((t) => {
      const patient   = (patients || []).find((p) => p.id === t.patientId)
      const nameMatch = `${patient?.firstName ?? ''} ${patient?.lastName ?? ''} ${t.patientName ?? ''}`
        .toLowerCase()
        .includes(search.toLowerCase())
      const descMatch = (t.description ?? '').toLowerCase().includes(search.toLowerCase())
      const typeMatch = typeFilter === 'all' || t.type === typeFilter
      return (nameMatch || descMatch) && typeMatch
    })
    .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))

  const treatmentTypes  = [...new Set((treatments || []).map((t) => t.type).filter(Boolean))]
  const totalRevenue    = myTreatments.reduce((s, t) => s + (t.cost || 0), 0)
  const uniquePatients  = new Set(myTreatments.map((t) => t.patientId)).size

  return (
    <>
      <Topbar />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <PageLoadingGuard stats={3} cols={6} rows={7}>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('header.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('header.subtitle')}</p>
          </div>
          <Link href="/doktor/trajtimet/shto">
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl shrink-0" data-tour="action-add-treatment">
              <Icon name="add" size={16} />
              {t('addButton')}
            </Button>
          </Link>
        </div>

        {/* Mini stat cards */}
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
          {[
            { label: t('stats.totalTreatments'),  value: myTreatments.length,  sub: undefined,            icon: 'stethoscope', color: 'ic-blue',  bg: 'ibg-blue',  strip: 'strip-blue'  },
            { label: t('stats.revenue'),          value: fmtLEK(totalRevenue), sub: fmtEUR(totalRevenue), icon: 'payments',    color: 'ic-green', bg: 'ibg-green', strip: 'strip-green' },
            { label: t('stats.treatedPatients'),  value: uniquePatients,       sub: undefined,            icon: 'group',       color: 'ic-sky',   bg: 'ibg-sky',   strip: 'strip-sky'   },
          ].map(({ label, value, sub, icon, color, bg, strip }: { label: string; value: string | number; sub?: string; icon: string; color: string; bg: string; strip: string }) => (
            <div
              key={label}
              className="relative bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3 flex items-center justify-between"
            >
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${strip}`} />
              <div className="mt-1">
                <p className="text-xs font-medium text-muted-foreground">{label}</p>
                <p className="text-xl font-bold text-foreground mt-1 leading-none">{value}</p>
                {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
              </div>
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0', bg)}>
                <Icon name={icon} size={18} className={color} />
              </div>
            </div>
          ))}
        </div>

        {/* Filter + table */}
        <Card className="bg-card rounded-2xl border border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-4 border-b border-border/50">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder={t('filters.searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full sm:w-[190px] rounded-xl">
                  <SelectValue placeholder={t('filters.typePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('filters.allTypes')}</SelectItem>
                  {treatmentTypes.map((type) => (
                    <SelectItem key={type} value={type} className="capitalize">
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>

          <CardContent className="px-0 pb-0 overflow-x-auto">
            {myTreatments.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                  <Icon name="medical_services" size={32} className="text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{t('empty.title')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search || typeFilter !== 'all'
                      ? t('empty.filterHint')
                      : t('empty.noTreatments')}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 border-y border-border/50">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.date')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.patient')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.type')}</TableHead>
                    <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.treatmentArea')}</TableHead>
                    <TableHead className="hidden md:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.description')}</TableHead>
                    <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.price')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {myTreatments.map((t) => (
                    <TableRow
                      key={t.id}
                      className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                    >
                      <TableCell className="pl-6 py-4 text-sm text-muted-foreground">
                        {fmtDate(t.date)}
                      </TableCell>

                      <TableCell className="py-4">
                        <Link
                          href={`/doktor/pacientet/${t.patientId}`}
                          className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                        >
                          {t.patientName}
                        </Link>
                      </TableCell>

                      <TableCell className="py-4">
                        {t.type ? (
                          <span className="chip-blue rounded-full px-2.5 py-0.5 text-xs font-medium capitalize">
                            {t.type}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden sm:table-cell py-4">
                        {t.treatmentArea ? (
                          <span className="bg-secondary rounded px-2 py-0.5 text-xs font-mono font-medium text-foreground">
                            {t.treatmentArea}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>

                      <TableCell className="hidden md:table-cell py-4 max-w-xs">
                        <p className="text-sm text-muted-foreground truncate">{t.description || '—'}</p>
                      </TableCell>

                      <TableCell className="pr-6 py-4">
                        {t.cost ? (
                          <span className="inline-flex flex-col leading-tight">
                            <span className="text-sm font-semibold text-foreground">{fmtLEK(t.cost)}</span>
                            <span className="text-xs text-muted-foreground">{fmtEUR(t.cost)}</span>
                          </span>
                        ) : <span className="text-muted-foreground">—</span>}
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
