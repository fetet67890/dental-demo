"use client"

import { useState } from "react"
import { useTranslations } from 'next-intl'
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { useQuickActions } from "@core/context/quick-actions-context"
import { Topbar } from "@core/components/layout/topbar"
import { AppointmentCalendar } from "@core/components/calendar/appointment-calendar"
import { CalendarOverviewSidebar } from "@core/components/calendar/calendar-overview-sidebar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@core/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@core/components/ui/select"
import { Button } from "@core/components/ui/button"
import { StatusBadge } from "@core/components/ui/status-badge"
import { toast } from "sonner"
import Link from "next/link"
import { CalendarDays, UserPlus, Stethoscope } from "lucide-react"
import type { Appointment } from "@core/types"

export default function DoktorKalendari() {
  const t = useTranslations('doktor-kalendari')
  const { user } = useAuth()
  const { appointments, patients, updateAppointment } = useData()
  const { openDialog } = useQuickActions()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)

  const myAppointments = appointments.filter(
    (a) => a.doctorId === user?.id || a.doctorName?.includes(user?.name || '')
  )

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
  }

  const handleStatusChange = async (newStatus: Appointment["status"]) => {
    if (!selectedAppointment) return
    await updateAppointment(selectedAppointment.id, { status: newStatus })
    setSelectedAppointment({ ...selectedAppointment, status: newStatus })
    toast.success("Statusi u ndryshua me sukses")
  }

  const patient = selectedAppointment
    ? patients.find((p) => p.id === selectedAppointment.patientId)
    : null

  return (
    <>
      <Topbar title={t('topbar.title')} />

      <div className="flex-1 overflow-auto p-4 lg:p-6">
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 w-full">
            <AppointmentCalendar
              appointments={myAppointments}
              onAppointmentClick={handleAppointmentClick}
            />
          </div>
          <CalendarOverviewSidebar
            appointments={myAppointments}
            onAppointmentClick={handleAppointmentClick}
            quickActions={[
              { label: t('quickActions.viewAll'), icon: CalendarDays, href: '/doktor/takimet' },
              { label: t('quickActions.addPatient'), icon: UserPlus, onClick: () => openDialog('pacient') },
              { label: t('quickActions.addTreatment'), icon: Stethoscope, href: '/doktor/trajtimet/shto' },
            ]}
          />
        </div>
      </div>

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.patient')}</p>
                  <p className="font-medium">
                    {patient ? `${patient.firstName} ${patient.lastName}` : selectedAppointment.patientName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.phone')}</p>
                  <p className="font-medium">{patient?.phone || '—'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.date')}</p>
                  <p className="font-medium">{selectedAppointment.date}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.time')}</p>
                  <p className="font-medium">{selectedAppointment.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.type')}</p>
                  <p className="font-medium capitalize">{selectedAppointment.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.duration')}</p>
                  <p className="font-medium">{selectedAppointment.duration} min</p>
                </div>
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dialog.currentStatus')}</p>
                <StatusBadge status={selectedAppointment.status} />
              </div>

              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('dialog.changeStatus')}</p>
                <Select
                  value={selectedAppointment.status}
                  onValueChange={(v) => handleStatusChange(v as Appointment["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              </div>

              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.notes')}</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-1">
                {(selectedAppointment.status === "planifikuar" || selectedAppointment.status === "ne_trajtim") && (
                  <Link href={`/doktor/trajtimet/shto?pacient=${patient?.id}&takim=${selectedAppointment.id}`}>
                    <Button variant="secondary">{t('dialog.addTreatment')}</Button>
                  </Link>
                )}
                {patient?.id && (
                  <Link href={`/doktor/pacientet/${patient.id}`}>
                    <Button variant="outline">{t('dialog.viewChart')}</Button>
                  </Link>
                )}
                <Button variant="ghost" onClick={() => setSelectedAppointment(null)}>
                  {t('dialog.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
