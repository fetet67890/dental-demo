"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { SearchInput } from '@core/components/ui/search-input'
import { Card, CardContent } from '@core/components/ui/card'
import { StatusBadge } from '@core/components/ui/status-badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@core/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Textarea } from '@core/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@core/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@core/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@core/components/ui/alert-dialog'
import { Plus, MoreHorizontal, Eye, Edit, Trash2, Archive, Brain, Download, ShieldOff } from 'lucide-react'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { toast } from 'sonner'
import { toastError } from '@core/lib/toast-error'
import { cn, fmtDate, syncUrl } from '@core/lib/utils'
import { Patient } from '@core/types'
import Link from 'next/link'
import { archivePatient, exportPatientData, anonymizePatient } from '@core/lib/api/patients'
import { PatientMemoryDialog } from '@core/components/patient/patient-memory-dialog'
import { AtRiskPatientsPanel } from '@core/components/patient/at-risk-patients-panel'

const initialFormState = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  gender: '' as 'M' | 'F' | '',
  address: '',
  medicalHistory: '',
  allergies: '',
  status: 'aktiv' as 'aktiv' | 'joaktiv',
  assignedDoctorId: '',
}

export default function PatientsPage() {
  const t = useTranslations('admin-pacientet')
  const { patients, appointments, addPatient, updatePatient, deletePatient, refreshPatients, addAppointment, staff } = useData()
  const doctors = (staff || []).filter((s) => s.role === 'mjek' && s.status === 'aktiv')
  const searchParams = useSearchParams()
  const [memoryPatient, setMemoryPatient] = useState<Patient | null>(null)

  const handleSaveMemory = async (patientId: string, updatedHistory: string[]) => {
    await updatePatient(patientId, { medicalHistory: updatedHistory })
    toast.success('Shënimi u ruajt me sukses')
  }

  const getPatientDoctor = (patientId: string): string => {
    const latest = appointments
      .filter(a => a.patientId === patientId && a.doctorName)
      .sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''))
    return latest[0]?.doctorName || '—'
  }
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingPatient, setEditingPatient] = useState<Patient | null>(null)
  const [formData, setFormData] = useState(initialFormState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [archivingId, setArchivingId] = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Patient | null>(null)
  const [archiveTarget, setArchiveTarget] = useState<Patient | null>(null)
  const [exportingId, setExportingId] = useState<string | null>(null)
  const [anonymizeTarget, setAnonymizeTarget] = useState<Patient | null>(null)
  const [anonymizeReason, setAnonymizeReason] = useState('')
  const [anonymizing, setAnonymizing] = useState(false)

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditingPatient(null)
      setFormData(initialFormState)
      setFormErrors({})
      setIsDialogOpen(true)
      syncUrl('/admin/pacientet')
    }
  }, [searchParams]) // eslint-disable-line

  const filteredPatients = patients.filter(
    (patient) =>
      patient.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      patient.phone.includes(searchQuery)
  )

  const validateForm = () => {
    const e: Record<string, string> = {}
    if (!formData.firstName.trim()) e.firstName = t('validation.firstNameRequired')
    if (!formData.lastName.trim()) e.lastName = t('validation.lastNameRequired')
    if (!formData.phone.trim()) e.phone = t('validation.phoneRequired')
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.')
      return
    }

    const parsed = {
      ...formData,
      gender: formData.gender as 'M' | 'F',
      medicalHistory: formData.medicalHistory.split(',').map((s) => s.trim()).filter(Boolean),
      allergies: formData.allergies.split(',').map((s) => s.trim()).filter(Boolean),
    }

    if (editingPatient) {
      const wasActive = editingPatient.status === 'aktiv'
      const nowJoaktiv = formData.status === 'joaktiv'

      await updatePatient(editingPatient.id, parsed)

      if (wasActive && nowJoaktiv) {
        try {
          await archivePatient(editingPatient.id)
          await refreshPatients()
          toast.success(`${formData.firstName} ${formData.lastName} u shënua joaktiv dhe u arkivua`)
        } catch (e) {
          toastError(e, 'Gabim gjatë arkivimit')
        }
      } else {
        toast.success('Pacienti u përditësua me sukses')
      }
    } else {
      try {
        const created = await addPatient({ ...parsed, status: 'aktiv' })
        if (formData.assignedDoctorId && created?.id) {
          const doctor = staff.find((s) => s.id === formData.assignedDoctorId)
          await addAppointment({
            patientId: created.id,
            patientName: `${formData.firstName} ${formData.lastName}`,
            doctorId: formData.assignedDoctorId,
            doctorName: doctor?.name || '',
            date: new Date().toISOString().split('T')[0],
            time: '09:00',
            duration: 30,
            type: 'konsultim',
            status: 'ne_pritje',
          }).catch(() => {})
        }
        toast.success('Pacienti u shtua me sukses')
      } catch (err) {
        toastError(err, 'Gabim gjatë shtimit të pacientit')
        return
      }
    }

    setIsDialogOpen(false)
    setEditingPatient(null)
    setFormData(initialFormState)
    setFormErrors({})
  }

  const handleEdit = (patient: Patient) => {
    setEditingPatient(patient)
    setFormData({
      firstName: patient.firstName,
      lastName: patient.lastName,
      email: patient.email,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      gender: patient.gender,
      address: patient.address,
      medicalHistory: patient.medicalHistory.join(', '),
      allergies: patient.allergies.join(', '),
      status: patient.status as 'aktiv' | 'joaktiv',
      assignedDoctorId: '',
    })
    setFormErrors({})
    setIsDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deletePatient(deleteTarget.id)
      toast.success('Pacienti u fshi me sukses')
    } catch (e) {
      toastError(e, 'Gabim gjatë fshirjes')
    } finally {
      setDeleteTarget(null)
    }
  }

  const handleArchive = async () => {
    if (!archiveTarget) return
    try {
      setArchivingId(archiveTarget.id)
      await archivePatient(archiveTarget.id)
      await refreshPatients()
      toast.success(`${archiveTarget.firstName} ${archiveTarget.lastName} u arkivua me sukses`)
    } catch (e) {
      toastError(e, 'Gabim gjatë arkivimit të pacientit')
    } finally {
      setArchivingId(null)
      setArchiveTarget(null)
    }
  }

  const handleExportData = async (patient: Patient) => {
    try {
      setExportingId(patient.id)
      await exportPatientData(patient.id, `${patient.firstName}_${patient.lastName}`)
    } catch (e) {
      toastError(e, t('exportData.error'))
    } finally {
      setExportingId(null)
    }
  }

  const handleAnonymize = async () => {
    if (!anonymizeTarget || !anonymizeReason.trim()) return
    try {
      setAnonymizing(true)
      await anonymizePatient(anonymizeTarget.id, anonymizeReason.trim())
      await refreshPatients()
      toast.success(t('anonymizeDialog.success'))
      setAnonymizeTarget(null)
      setAnonymizeReason('')
    } catch (e) {
      toastError(e, t('anonymizeDialog.error'))
    } finally {
      setAnonymizing(false)
    }
  }

  const openNewDialog = () => {
    setEditingPatient(null)
    setFormData(initialFormState)
    setFormErrors({})
    setIsDialogOpen(true)
  }

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <PageLoadingGuard cols={6} rows={8}>
        <AtRiskPatientsPanel basePath="/admin/pacientet" />
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <SearchInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1"
          />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={openNewDialog} className="bg-accent hover:bg-accent/90" data-tour="action-add-patient">
                <Plus className="h-4 w-4 mr-2" />
                {t('addButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPatient ? t('dialog.editTitle') : t('dialog.addTitle')}
                </DialogTitle>
                <DialogDescription>
                  {t('dialog.description')}
                </DialogDescription>
              </DialogHeader>
              <FieldGroup className="gap-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{t('dialog.firstName')}</FieldLabel>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); if (formErrors.firstName) setFormErrors(p => ({ ...p, firstName: '' })) }}
                      placeholder={t('dialog.firstNamePlaceholder')}
                      className={cn(formErrors.firstName && "border-destructive focus-visible:ring-destructive/30")}
                    />
                    {formErrors.firstName && <p className="text-xs text-destructive mt-1">{formErrors.firstName}</p>}
                  </Field>
                  <Field>
                    <FieldLabel>{t('dialog.lastName')}</FieldLabel>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); if (formErrors.lastName) setFormErrors(p => ({ ...p, lastName: '' })) }}
                      placeholder={t('dialog.lastNamePlaceholder')}
                      className={cn(formErrors.lastName && "border-destructive focus-visible:ring-destructive/30")}
                    />
                    {formErrors.lastName && <p className="text-xs text-destructive mt-1">{formErrors.lastName}</p>}
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{t('dialog.email')}</FieldLabel>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder={t('dialog.emailPlaceholder')}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t('dialog.phone')}</FieldLabel>
                    <Input
                      value={formData.phone}
                      onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (formErrors.phone) setFormErrors(p => ({ ...p, phone: '' })) }}
                      placeholder={t('dialog.phonePlaceholder')}
                      className={cn(formErrors.phone && "border-destructive focus-visible:ring-destructive/30")}
                    />
                    {formErrors.phone && <p className="text-xs text-destructive mt-1">{formErrors.phone}</p>}
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{t('dialog.dateOfBirth')}</FieldLabel>
                    <Input
                      type="date"
                      value={formData.dateOfBirth}
                      onChange={(e) => { setFormData({ ...formData, dateOfBirth: e.target.value }); if (formErrors.dateOfBirth) setFormErrors(p => ({ ...p, dateOfBirth: '' })) }}
                      className={cn(formErrors.dateOfBirth && 'border-destructive focus-visible:ring-destructive/30')}
                    />
                    {formErrors.dateOfBirth && <p className="text-xs text-destructive mt-1">{formErrors.dateOfBirth}</p>}
                  </Field>
                  <Field>
                    <FieldLabel>{t('dialog.gender')}</FieldLabel>
                    <Select
                      value={formData.gender}
                      onValueChange={(value) => setFormData({ ...formData, gender: value as 'M' | 'F' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialog.genderPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="M">{t('dialog.genderMale')}</SelectItem>
                        <SelectItem value="F">{t('dialog.genderFemale')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>{t('dialog.address')}</FieldLabel>
                  <Input
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder={t('dialog.addressPlaceholder')}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.medicalHistory')}</FieldLabel>
                  <Textarea
                    value={formData.medicalHistory}
                    onChange={(e) => setFormData({ ...formData, medicalHistory: e.target.value })}
                    placeholder={t('dialog.medicalHistoryPlaceholder')}
                    rows={2}
                  />
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.allergies')}</FieldLabel>
                  <Textarea
                    value={formData.allergies}
                    onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                    placeholder={t('dialog.allergiesPlaceholder')}
                    rows={2}
                  />
                </Field>
                {!editingPatient && (
                  <Field>
                    <FieldLabel>{t('dialog.assignedDoctor')}</FieldLabel>
                    <Select
                      value={formData.assignedDoctorId || "__none__"}
                      onValueChange={(value) => setFormData({ ...formData, assignedDoctorId: value === "__none__" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialog.assignedDoctorPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">{t('dialog.noDoctor')}</SelectItem>
                        {doctors.map((doc) => (
                          <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                {editingPatient && (
                  <Field>
                    <FieldLabel>{t('dialog.status')}</FieldLabel>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value as 'aktiv' | 'joaktiv' })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('dialog.statusPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aktiv">{t('dialog.statusActive')}</SelectItem>
                        <SelectItem value="joaktiv">{t('dialog.statusInactive')}</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.status === 'joaktiv' && (
                      <p className="text-xs ic-amber mt-1">
                        {t('dialog.inactiveWarning')}
                      </p>
                    )}
                  </Field>
                )}
              </FieldGroup>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('dialog.cancel')}
                </Button>
                <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
                  {editingPatient ? t('dialog.saveChanges') : t('dialog.addPatient')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Patients Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">

            {/* —— Desktop table —— */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.patient')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('table.contact')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('table.doctor')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('table.lastVisit')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPatients.map((patient) => (
                    <TableRow key={patient.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{patient.firstName} {patient.lastName}</p>
                          <p className="text-sm text-muted-foreground md:hidden">{patient.phone}</p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="text-sm">{patient.phone}</div>
                          {patient.email && <div className="text-sm text-muted-foreground">{patient.email}</div>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{getPatientDoctor(patient.id)}</TableCell>
                      <TableCell className="hidden lg:table-cell">{fmtDate(patient.lastVisit)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <StatusBadge status={patient.status} />
                          <StatusBadge status={patient.visitStatus === 'new' ? 'new' : 'returning'} />
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild><Link href={`/admin/pacientet/${patient.id}`}><Eye className="h-4 w-4 mr-2" />{t('menu.viewProfile')}</Link></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEdit(patient)}><Edit className="h-4 w-4 mr-2" />{t('menu.edit')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setMemoryPatient(patient)}><Brain className="h-4 w-4 mr-2" />{t('menu.memory')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleExportData(patient)} disabled={exportingId === patient.id}><Download className="h-4 w-4 mr-2" />{exportingId === patient.id ? t('menu.exporting') : t('menu.exportData')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setArchiveTarget(patient)} disabled={archivingId === patient.id} className="ic-amber"><Archive className="h-4 w-4 mr-2" />{archivingId === patient.id ? t('menu.archiving') : t('menu.archive')}</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setAnonymizeTarget(patient)} disabled={!!patient.anonymizedAt} className="text-destructive"><ShieldOff className="h-4 w-4 mr-2" />{patient.anonymizedAt ? t('menu.anonymized') : t('menu.anonymize')}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setDeleteTarget(patient)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t('menu.delete')}</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredPatients.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        {t('table.empty')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* —— Mobile cards —— */}
            <div className="sm:hidden divide-y divide-border">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{patient.firstName} {patient.lastName}</p>
                      <p className="text-xs text-muted-foreground">{patient.phone}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={patient.status} />
                      <StatusBadge status={patient.visitStatus === 'new' ? 'new' : 'returning'} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild><Link href={`/admin/pacientet/${patient.id}`}><Eye className="h-4 w-4 mr-2" />{t('menu.viewProfile')}</Link></DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(patient)}><Edit className="h-4 w-4 mr-2" />{t('menu.edit')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setMemoryPatient(patient)}><Brain className="h-4 w-4 mr-2" />{t('menu.memory')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setArchiveTarget(patient)} disabled={archivingId === patient.id} className="ic-amber"><Archive className="h-4 w-4 mr-2" />{archivingId === patient.id ? t('menu.archiving') : t('menu.archive')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDeleteTarget(patient)} className="text-destructive"><Trash2 className="h-4 w-4 mr-2" />{t('menu.delete')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-2 ml-12 space-y-0.5 text-xs text-muted-foreground">
                    {patient.email && <p>{patient.email}</p>}
                    <p>{t('mobile.doctorVisit', { doctor: getPatientDoctor(patient.id), date: fmtDate(patient.lastVisit) })}</p>
                  </div>
                </div>
              ))}
              {filteredPatients.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('table.empty')}</div>
              )}
            </div>

          </CardContent>
        </Card>
        </PageLoadingGuard>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.confirmPrefix')}{' '}
              <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong>?
              {' '}{t('deleteDialog.confirmSuffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Archive confirmation */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(open) => { if (!open) setArchiveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archiveDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('archiveDialog.confirmPrefix')} <strong>{archiveTarget?.firstName} {archiveTarget?.lastName}</strong>.
              {' '}{t('archiveDialog.confirmSuffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-[var(--p-amber)] hover:opacity-90 text-white">
              {t('archiveDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Anonymize (right to be forgotten) — requires a reason, not just a click-through confirm */}
      <Dialog open={!!anonymizeTarget} onOpenChange={(open) => { if (!open) { setAnonymizeTarget(null); setAnonymizeReason('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('anonymizeDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('anonymizeDialog.confirmPrefix')} <strong>{anonymizeTarget?.firstName} {anonymizeTarget?.lastName}</strong>.
              {' '}{t('anonymizeDialog.confirmSuffix')}
            </DialogDescription>
          </DialogHeader>
          <Field>
            <FieldLabel>{t('anonymizeDialog.reasonLabel')}</FieldLabel>
            <Textarea
              value={anonymizeReason}
              onChange={(e) => setAnonymizeReason(e.target.value)}
              placeholder={t('anonymizeDialog.reasonPlaceholder')}
              rows={3}
            />
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAnonymizeTarget(null); setAnonymizeReason('') }}>{t('dialog.cancel')}</Button>
            <Button
              onClick={handleAnonymize}
              disabled={!anonymizeReason.trim() || anonymizing}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {anonymizing ? t('anonymizeDialog.anonymizing') : t('anonymizeDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PatientMemoryDialog
        patient={memoryPatient}
        open={!!memoryPatient}
        onOpenChange={(open) => { if (!open) setMemoryPatient(null) }}
        onSave={handleSaveMemory}
      />
    </>
  )
}
