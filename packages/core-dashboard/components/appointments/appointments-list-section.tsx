"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
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
import { Plus, MoreHorizontal, Edit, Trash2, Check, X, Clock } from 'lucide-react'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { toast } from 'sonner'
import { cn, fmtDate, syncUrl } from '@core/lib/utils'
import { Appointment } from '@core/types'
import { treatmentTypes } from '@core/lib/mock-data'
import { archivePatient } from '@core/lib/api/patients'

const initialFormState = {
  patientId: '',
  doctorId: '',
  date: '',
  time: '',
  duration: '30',
  type: '',
  notes: '',
}

export function AppointmentsListSection() {
  const t = useTranslations('admin-takimet')
  const statusLabels: Record<Appointment['status'], string> = {
    planifikuar: t('status.planifikuar'),
    ne_pritje: t('status.ne_pritje'),
    ne_trajtim: t('status.ne_trajtim'),
    perfunduar: t('status.perfunduar'),
    anuluar: t('status.anuluar'),
    mungoi: t('status.mungoi'),
  }
  const { appointments, patients, staff, addAppointment, updateAppointment, deleteAppointment, refreshPatients } = useData()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null)
  const [formData, setFormData] = useState(initialFormState)
  const [aptErrors, setAptErrors] = useState<Record<string, string>>({})
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)

  const doctors = staff.filter((s) => s.role === 'mjek')

  const filteredAppointments = appointments.filter(
    (appointment) =>
      appointment.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.doctorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const checkDoubleBooking = (doctorId: string, date: string, time: string, excludeId?: string) => {
    return appointments.some(
      (a) =>
        a.doctorId === doctorId &&
        a.date === date &&
        a.time === time &&
        a.id !== excludeId &&
        a.status !== 'anuluar'
    )
  }

  const handleSubmit = async () => {

    if (checkDoubleBooking(formData.doctorId, formData.date, formData.time, editingAppointment?.id)) {
      toast.error('Ky mjek ka takim tjetër në këtë kohë!')
      return
    }

    const patient = patients.find((p) => p.id === formData.patientId)
    const doctor = doctors.find((d) => d.id === formData.doctorId)

    if (!patient || !doctor) {
      toast.error('Pacienti ose mjeku nuk u gjet')
      return
    }

    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          patientId: formData.patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          doctorId: formData.doctorId,
          doctorName: doctor.name,
          date: formData.date,
          time: formData.time,
          duration: parseInt(formData.duration),
          type: formData.type,
          notes: formData.notes,
        })
        toast.success('Takimi u përditësua me sukses')
      } else {
        await addAppointment({
          patientId: formData.patientId,
          patientName: `${patient.firstName} ${patient.lastName}`,
          doctorId: formData.doctorId,
          doctorName: doctor.name,
          date: formData.date,
          time: formData.time,
          duration: parseInt(formData.duration),
          type: formData.type,
          status: 'planifikuar',
          notes: formData.notes,
        })
        toast.success('Takimi u krijua me sukses')
      }
      setIsDialogOpen(false)
      setEditingAppointment(null)
      setFormData(initialFormState)
      setAptErrors({})
    } catch {
      toast.error('Gabim gjatë ruajtjes së takimit')
    }
  }

  const handleEdit = (appointment: Appointment) => {
    setEditingAppointment(appointment)
    setFormData({
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      date: appointment.date,
      time: appointment.time,
      duration: appointment.duration.toString(),
      type: appointment.type,
      notes: appointment.notes || '',
    })
    setIsDialogOpen(true)
  }

  const handleStatusChange = async (id: string, status: Appointment['status']) => {
    updateAppointment(id, { status })
    if (status === 'perfunduar') {
      const apt = appointments.find(a => a.id === id)
      if (apt) {
        const patient = patients.find(p => p.id === apt.patientId)
        if (patient && !patient.archived) {
          try {
            await archivePatient(apt.patientId)
            await refreshPatients()
            toast.success(`Takimi u përfundua. ${patient.firstName} ${patient.lastName} u arkivua automatikisht.`)
            return
          } catch {
            // fall through to generic success
          }
        }
      }
    }
    toast.success(`Statusi u ndryshua në "${status}"`)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    try {
      await deleteAppointment(deleteTarget)
      toast.success('Takimi u anulua')
    } catch {
      toast.error('Gabim gjatë anulimit')
    } finally {
      setDeleteTarget(null)
    }
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setEditingAppointment(null)
      setFormData(initialFormState)
      setAptErrors({})
      setIsDialogOpen(true)
      syncUrl('/admin/takimet')
    }
  }, [searchParams]) // eslint-disable-line

  const openNewDialog = () => {
    setEditingAppointment(null)
    setFormData(initialFormState)
    setAptErrors({})
    setIsDialogOpen(true)
  }

  return (
    <>
      <PageLoadingGuard cols={6} rows={8}>

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
              <Button onClick={openNewDialog} className="bg-accent hover:bg-accent/90">
                <Plus className="h-4 w-4 mr-2" />
                {t('addButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>
                  {editingAppointment ? t('dialog.editTitle') : t('dialog.addTitle')}
                </DialogTitle>
                <DialogDescription>
                  {t('dialog.description')}
                </DialogDescription>
              </DialogHeader>
              <FieldGroup className="gap-4">
                <Field>
                  <FieldLabel>{t('dialog.patient')}</FieldLabel>
                  <Select
                    value={formData.patientId}
                    onValueChange={(value) => { setFormData({ ...formData, patientId: value }); if (aptErrors.patientId) setAptErrors(p => ({ ...p, patientId: '' })) }}
                  >
                    <SelectTrigger className={cn(aptErrors.patientId && "border-destructive")}>
                      <SelectValue placeholder={t('dialog.patientPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {patients.map((patient) => (
                        <SelectItem key={patient.id} value={patient.id}>
                          {patient.firstName} {patient.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aptErrors.patientId && <p className="text-xs text-destructive mt-1">{aptErrors.patientId}</p>}
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.doctor')}</FieldLabel>
                  <Select
                    value={formData.doctorId}
                    onValueChange={(value) => { setFormData({ ...formData, doctorId: value }); if (aptErrors.doctorId) setAptErrors(p => ({ ...p, doctorId: '' })) }}
                  >
                    <SelectTrigger className={cn(aptErrors.doctorId && "border-destructive")}>
                      <SelectValue placeholder={t('dialog.doctorPlaceholder')} />
                    </SelectTrigger>
                    <SelectContent>
                      {doctors.map((doctor) => (
                        <SelectItem key={doctor.id} value={doctor.id}>
                          {doctor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aptErrors.doctorId && <p className="text-xs text-destructive mt-1">{aptErrors.doctorId}</p>}
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{t('dialog.date')}</FieldLabel>
                    <Input
                      type="date"
                      value={formData.date}
                      onChange={(e) => { setFormData({ ...formData, date: e.target.value }); if (aptErrors.date) setAptErrors(p => ({ ...p, date: '' })) }}
                      className={cn(aptErrors.date && "border-destructive")}
                    />
                    {aptErrors.date && <p className="text-xs text-destructive mt-1">{aptErrors.date}</p>}
                  </Field>
                  <Field>
                    <FieldLabel>{t('dialog.time')}</FieldLabel>
                    <Input
                      type="time"
                      value={formData.time}
                      onChange={(e) => { setFormData({ ...formData, time: e.target.value }); if (aptErrors.time) setAptErrors(p => ({ ...p, time: '' })) }}
                      className={cn(aptErrors.time && "border-destructive")}
                    />
                    {aptErrors.time && <p className="text-xs text-destructive mt-1">{aptErrors.time}</p>}
                  </Field>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel>{t('dialog.type')}</FieldLabel>
                    <Select
                      value={formData.type}
                      onValueChange={(value) => { setFormData({ ...formData, type: value }); if (aptErrors.type) setAptErrors(p => ({ ...p, type: '' })) }}
                    >
                      <SelectTrigger className={cn(aptErrors.type && "border-destructive")}>
                        <SelectValue placeholder={t('dialog.typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        {treatmentTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {aptErrors.type && <p className="text-xs text-destructive mt-1">{aptErrors.type}</p>}
                  </Field>
                  <Field>
                    <FieldLabel>{t('dialog.duration')}</FieldLabel>
                    <Select
                      value={formData.duration}
                      onValueChange={(value) => setFormData({ ...formData, duration: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="15">15 {t('dialog.minutesUnit')}</SelectItem>
                        <SelectItem value="30">30 {t('dialog.minutesUnit')}</SelectItem>
                        <SelectItem value="45">45 {t('dialog.minutesUnit')}</SelectItem>
                        <SelectItem value="60">60 {t('dialog.minutesUnit')}</SelectItem>
                        <SelectItem value="90">90 {t('dialog.minutesUnit')}</SelectItem>
                        <SelectItem value="120">120 {t('dialog.minutesUnit')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field>
                  <FieldLabel>{t('dialog.notes')}</FieldLabel>
                  <Textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder={t('dialog.notesPlaceholder')}
                    rows={2}
                  />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t('dialog.cancel')}
                </Button>
                <Button onClick={handleSubmit} className="bg-accent hover:bg-accent/90">
                  {editingAppointment ? t('dialog.saveChanges') : t('dialog.create')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Appointments Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {/* —— Desktop table —— */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.patient')}</TableHead>
                    <TableHead>{t('table.doctor')}</TableHead>
                    <TableHead>{t('table.dateTime')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('table.type')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAppointments.map((appointment) => (
                    <TableRow key={appointment.id}>
                      <TableCell className="font-medium">{appointment.patientName}</TableCell>
                      <TableCell>{appointment.doctorName}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm">{fmtDate(appointment.date)}</p>
                            <p className="text-xs text-muted-foreground">{appointment.time}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">{appointment.type}</TableCell>
                      <TableCell>
                        <Select
                          value={appointment.status}
                          onValueChange={(value) => handleStatusChange(appointment.id, value as Appointment['status'])}
                        >
                          <SelectTrigger className="w-36 h-7 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <StatusBadge status={appointment.status} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planifikuar">{statusLabels.planifikuar}</SelectItem>
                            <SelectItem value="ne_pritje">{statusLabels.ne_pritje}</SelectItem>
                            <SelectItem value="ne_trajtim">{statusLabels.ne_trajtim}</SelectItem>
                            <SelectItem value="perfunduar">{statusLabels.perfunduar}</SelectItem>
                            <SelectItem value="anuluar">{statusLabels.anuluar}</SelectItem>
                            <SelectItem value="mungoi">{statusLabels.mungoi}</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(appointment)}>
                              <Edit className="h-4 w-4 mr-2" />
                              {t('menu.edit')}
                            </DropdownMenuItem>
                            {appointment.status === 'planifikuar' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(appointment.id, 'ne_pritje')}
                              >
                                <Clock className="h-4 w-4 mr-2" />
                                {t('menu.markPending')}
                              </DropdownMenuItem>
                            )}
                            {appointment.status === 'ne_pritje' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(appointment.id, 'ne_trajtim')}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                {t('menu.startTreatment')}
                              </DropdownMenuItem>
                            )}
                            {appointment.status === 'ne_trajtim' && (
                              <DropdownMenuItem
                                onClick={() => handleStatusChange(appointment.id, 'perfunduar')}
                              >
                                <Check className="h-4 w-4 mr-2" />
                                {t('menu.complete')}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              onClick={() => setDeleteTarget(appointment.id)}
                              className="text-destructive"
                            >
                              <X className="h-4 w-4 mr-2" />
                              {t('menu.cancel')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredAppointments.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{t('table.empty')}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* —— Mobile cards —— */}
            <div className="sm:hidden divide-y divide-border">
              {filteredAppointments.map((appointment) => (
                <div key={appointment.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{appointment.patientName}</p>
                      <p className="text-xs text-muted-foreground">{appointment.doctorName}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEdit(appointment)}><Edit className="h-4 w-4 mr-2" />{t('menu.edit')}</DropdownMenuItem>
                          {appointment.status === 'planifikuar' && <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'ne_pritje')}><Clock className="h-4 w-4 mr-2" />{t('menu.markPending')}</DropdownMenuItem>}
                          {appointment.status === 'ne_pritje' && <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'ne_trajtim')}><Check className="h-4 w-4 mr-2" />{t('menu.startTreatment')}</DropdownMenuItem>}
                          {appointment.status === 'ne_trajtim' && <DropdownMenuItem onClick={() => handleStatusChange(appointment.id, 'perfunduar')}><Check className="h-4 w-4 mr-2" />{t('menu.complete')}</DropdownMenuItem>}
                          <DropdownMenuItem onClick={() => setDeleteTarget(appointment.id)} className="text-destructive"><X className="h-4 w-4 mr-2" />{t('menu.cancel')}</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5"><Clock className="h-3 w-3" />{fmtDate(appointment.date)} · {appointment.time} ({appointment.duration} {t('dialog.minutesUnit')})</p>
                    <p>{appointment.type}</p>
                    <div className="pt-1">
                      <Select value={appointment.status} onValueChange={(v) => handleStatusChange(appointment.id, v as Appointment['status'])}>
                        <SelectTrigger className="w-36 h-7 text-xs border-0 bg-secondary/50 rounded-lg shadow-none focus:ring-0">
                          <StatusBadge status={appointment.status} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planifikuar">{statusLabels.planifikuar}</SelectItem>
                          <SelectItem value="ne_pritje">{statusLabels.ne_pritje}</SelectItem>
                          <SelectItem value="ne_trajtim">{statusLabels.ne_trajtim}</SelectItem>
                          <SelectItem value="perfunduar">{statusLabels.perfunduar}</SelectItem>
                          <SelectItem value="anuluar">{statusLabels.anuluar}</SelectItem>
                          <SelectItem value="mungoi">{statusLabels.mungoi}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
              {filteredAppointments.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('table.empty')}</div>
              )}
            </div>

          </CardContent>
        </Card>
      </PageLoadingGuard>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cancelDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cancelDialog.description')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancelDialog.close')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              {t('cancelDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
