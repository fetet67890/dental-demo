"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { AddPatientDialog } from "@core/components/patient/add-patient-dialog"
import { PatientMemoryDialog } from "@core/components/patient/patient-memory-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@core/components/ui/table"
import { Eye, Users, UserPlus, Brain } from "lucide-react"
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { AtRiskPatientsPanel } from '@core/components/patient/at-risk-patients-panel'
import Link from "next/link"
import type { Patient } from "@core/types"
import { fmtDate, syncUrl } from "@core/lib/utils"
import { toast } from "sonner"

export default function RecepsionPacientet() {
  const t = useTranslations('recepsion-pacientet')
  const { patients, appointments, addPatient, addAppointment, staff, updatePatient } = useData()
  const doctors = (staff || []).filter((s) => s.role === 'mjek' && s.status === 'aktiv')
  const searchParams = useSearchParams()

  const getPatientDoctor = (patientId: string): string => {
    const latest = appointments
      .filter(a => a.patientId === patientId && a.doctorName)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    return latest[0]?.doctorName || '—'
  }
  const [search, setSearch] = useState("")
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [memoryPatient, setMemoryPatient] = useState<Patient | null>(null)

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setAddDialogOpen(true)
      syncUrl('/recepsion/pacientet')
    }
  }, [searchParams]) // eslint-disable-line

  const handleSaveMemory = async (patientId: string, updatedHistory: string[]) => {
    await updatePatient(patientId, { medicalHistory: updatedHistory })
    toast.success('Shënimi u ruajt me sukses')
  }

  const filteredPatients = (patients || []).filter(
    (p) =>
      p.firstName?.toLowerCase().includes(search.toLowerCase()) ||
      p.lastName?.toLowerCase().includes(search.toLowerCase()) ||
      p.email?.toLowerCase().includes(search.toLowerCase()) ||
      p.phone?.includes(search)
  )

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
      <Topbar
        title={t('topbar.title')}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        <PageLoadingGuard cols={5} rows={8}>
        <AtRiskPatientsPanel basePath="/recepsion/pacientet" />
        <Card className="border-border/50 shadow-lg">
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3 flex-1">
                <SearchInput
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  containerClassName="flex-1 max-w-sm"
                />
                <div className="flex items-center gap-2 text-sm text-muted-foreground shrink-0">
                  <Users className="h-4 w-4" />
                  <span>{t('count', { count: filteredPatients.length })}</span>
                </div>
              </div>
              <Button
                onClick={() => setAddDialogOpen(true)}
                className="bg-accent hover:bg-accent/90 text-accent-foreground shrink-0"
                data-tour="action-add-patient"
              >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('register')}
              </Button>
            </div>
          </CardHeader>
        <CardContent className="p-0">
          {/* ── Desktop table ── */}
          <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.patient')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table.contact')}</TableHead>
                <TableHead className="hidden md:table-cell">{t('table.doctor')}</TableHead>
                <TableHead className="hidden lg:table-cell">{t('table.registered')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPatients.map((patient) => (
                <TableRow key={patient.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                      <p className="text-sm text-muted-foreground">{patient.gender === "M" ? t('gender.male') : t('gender.female')}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="space-y-1">
                      <div className="text-sm">{patient.phone}</div>
                      {patient.email && <div className="text-sm text-muted-foreground">{patient.email}</div>}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{getPatientDoctor(patient.id)}</TableCell>
                  <TableCell className="hidden lg:table-cell">{fmtDate(patient.createdAt)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Link href={`/recepsion/pacientet/${patient.id}`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          {t('view')}
                        </Button>
                      </Link>
                      <Button variant="ghost" size="sm" onClick={() => setMemoryPatient(patient)}>
                        <Brain className="h-4 w-4 mr-1" />
                        {t('memory')}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredPatients.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('empty')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="sm:hidden divide-y divide-border">
            {filteredPatients.map((patient) => (
              <div key={patient.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{patient.firstName} {patient.lastName}</p>
                    <p className="text-xs text-muted-foreground">{patient.gender === "M" ? t('gender.male') : t('gender.female')}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Link href={`/recepsion/pacientet/${patient.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 px-2"><Eye className="h-4 w-4" /></Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="h-8 px-2" onClick={() => setMemoryPatient(patient)}>
                      <Brain className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                  <p>{patient.phone}</p>
                  {patient.email && <p className="text-muted-foreground">{patient.email}</p>}
                  <p>{t('mobileSummary', { doctor: getPatientDoctor(patient.id), date: fmtDate(patient.createdAt) })}</p>
                </div>
              </div>
            ))}
            {filteredPatients.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</div>
            )}
          </div>

        </CardContent>
        </Card>
        </PageLoadingGuard>
      </div>

      {/* Add Patient Dialog */}
      <AddPatientDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onAdd={handleAddPatient}
        doctors={doctors}
      />

      <PatientMemoryDialog
        patient={memoryPatient}
        open={!!memoryPatient}
        onOpenChange={(open) => { if (!open) setMemoryPatient(null) }}
        onSave={handleSaveMemory}
      />
    </>
  )
}
