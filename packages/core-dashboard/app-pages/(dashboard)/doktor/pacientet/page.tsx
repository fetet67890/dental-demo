"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from 'next-intl'
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { AddPatientDialog } from "@core/components/patient/add-patient-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@core/components/ui/table"
import Link from "next/link"
import { cn, syncUrl } from "@core/lib/utils"
import type { Patient } from "@core/types"

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

export default function DoktorPacientet() {
  const t = useTranslations('doktor-pacientet')
  const { user } = useAuth()
  const { appointments, patients, addPatient, addAppointment, staff } = useData()
  const doctors = (staff || []).filter((s) => s.role === 'mjek' && s.status === 'aktiv')
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setAddDialogOpen(true)
      syncUrl('/doktor/pacientet')
    }
  }, [searchParams]) // eslint-disable-line

  const myAppointments = (appointments || []).filter(
    (a) => a.doctorId === user?.id || a.doctorName?.includes(user?.name || '')
  )
  const myPatientIds = [...new Set(myAppointments.map((a) => a.patientId))]
  const myPatients =
    myPatientIds.length > 0
      ? (patients || []).filter((p) => myPatientIds.includes(p.id))
      : (patients || [])

  const filteredPatients = myPatients.filter(
    (p) =>
      p.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search) ||
      p.email?.toLowerCase().includes(search.toLowerCase())
  )

  const getPatientAppointmentCount = (patientId: string) =>
    myAppointments.filter((a) => a.patientId === patientId).length

  const handleAddPatient = async (patientData: Omit<Patient, 'id' | 'createdAt'>, _files: File[], assignedDoctorId?: string): Promise<void> => {
    const created = await addPatient(patientData)
    if (assignedDoctorId && created?.id) {
      const doctor = staff.find((s) => s.id === assignedDoctorId)
      await addAppointment({
        patientId: created.id,
        patientName: `${patientData.firstName} ${patientData.lastName}`,
        doctorId: assignedDoctorId,
        doctorName: doctor?.name || '',
        date: new Date().toISOString().split('T')[0],
        time: '09:00',
        duration: 30,
        type: 'konsultim',
        status: 'ne_pritje',
      }).catch(() => {})
    }
  }

  return (
    <>
      <Topbar />

      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('header.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('header.subtitle')}</p>
          </div>
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl gap-2 shrink-0"
            data-tour="action-add-patient"
          >
            <Icon name="add" size={16} />
            <span className="hidden sm:inline">{t('addButton')}</span>
            <span className="sm:hidden">{t('addButtonShort')}</span>
          </Button>
        </div>

        <Card className="bg-card rounded-2xl border border-border shadow-sm">
          <CardHeader className="px-6 pt-5 pb-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative max-w-sm w-full">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl"
                />
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                <div className="flex items-center gap-1.5 bg-secondary rounded-lg px-3 py-1.5">
                  <Icon name="group" size={15} className="text-muted-foreground" />
                  <span className="font-semibold text-foreground">{filteredPatients.length}</span>
                  <span>{t('patientsCount')}</span>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-0 pb-0 overflow-x-auto">
            {filteredPatients.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-4">
                <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                  <Icon name="group" size={32} className="text-muted-foreground/40" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-foreground">{t('empty.title')}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {search ? t('empty.searchHint') : t('empty.noPatients')}
                  </p>
                </div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="bg-secondary/30 border-y border-border/50">
                    <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.patient')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.contact')}</TableHead>
                    <TableHead className="hidden lg:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.address')}</TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.visits')}</TableHead>
                    <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => {
                    const fullName = `${patient.firstName} ${patient.lastName}`
                    const visitCount = getPatientAppointmentCount(patient.id)
                    return (
                      <TableRow
                        key={patient.id}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <TableCell className="pl-6 py-4">
                          <div>
                            <p className="text-sm font-semibold text-foreground">{fullName}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {patient.gender === 'M' ? t('gender.male') : t('gender.female')} · {patient.dateOfBirth || '—'}
                            </p>
                          </div>
                        </TableCell>

                        <TableCell className="py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-sm text-foreground">
                              <Icon name="phone" size={13} className="ic-blue" />
                              {patient.phone}
                            </div>
                            {patient.email && (
                              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <Icon name="mail" size={13} className="text-muted-foreground" />
                                {patient.email}
                              </div>
                            )}
                          </div>
                        </TableCell>

                        <TableCell className="hidden lg:table-cell py-4 text-sm text-muted-foreground">
                          {patient.address || '—'}
                        </TableCell>

                        <TableCell className="py-4">
                          <span
                            className={cn(
                              'inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold',
                              visitCount > 0 ? 'chip-blue' : 'chip-neutral'
                            )}
                          >
                            <Icon name="calendar_month" size={11} />
                            {t('visitsCount', { count: visitCount })}
                          </span>
                        </TableCell>

                        <TableCell className="pr-6 py-4">
                          <div className="flex items-center gap-2">
                            <Link href={`/doktor/pacientet/${patient.id}`}>
                              <Button variant="outline" size="sm" className="rounded-xl gap-1.5">
                                <Icon name="visibility" size={14} />
                                {t('viewChart')}
                              </Button>
                            </Link>
                            <Link href={`/doktor/trajtimet/shto?pacient=${patient.id}`}>
                              <Button size="sm" className="rounded-xl gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground">
                                <Icon name="stethoscope" size={14} />
                                {t('treatment')}
                              </Button>
                            </Link>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <AddPatientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddPatient}
        doctors={doctors}
      />
    </>
  )
}
