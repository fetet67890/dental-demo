"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { AppointmentCalendar } from "@core/components/calendar/appointment-calendar"
import { ProviderAvailabilityGrid } from "@core/components/calendar/provider-availability-grid"
import { RoomAvailabilityGrid } from "@core/components/calendar/room-availability-grid"
import { Tabs, TabsList, TabsTrigger } from "@core/components/ui/tabs"
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
import type { Appointment } from "@core/types"
import { archivePatient } from "@core/lib/api/patients"

export function AppointmentsCalendarSection() {
  const t = useTranslations('admin-kalendari')
  const statusLabels: Record<Appointment['status'], string> = {
    planifikuar: t('status.planifikuar'),
    ne_pritje: t('status.ne_pritje'),
    ne_trajtim: t('status.ne_trajtim'),
    perfunduar: t('status.perfunduar'),
    anuluar: t('status.anuluar'),
    mungoi: t('status.mungoi'),
  }
  const { appointments, patients, staff, rooms, updateAppointment, refreshPatients } = useData()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [view, setView] = useState<"javore" | "mjeket" | "dhomat">("javore")
  const hasActiveRooms = rooms.some(r => r.isActive)

  const handleAppointmentClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment)
  }

  const handleStatusChange = async (newStatus: Appointment["status"]) => {
    if (!selectedAppointment) return
    updateAppointment(selectedAppointment.id, { status: newStatus })
    setSelectedAppointment({ ...selectedAppointment, status: newStatus })
    if (newStatus === "perfunduar") {
      const patient = patients.find(p => p.id === selectedAppointment.patientId)
      if (patient && !patient.archived) {
        try {
          await archivePatient(selectedAppointment.patientId)
          await refreshPatients()
          toast.success(`Takimi u përfundua. ${patient.firstName} ${patient.lastName} u arkivua automatikisht.`)
        } catch {
          toast.success("Statusi u ndryshua me sukses")
        }
        return
      }
    }
    toast.success("Statusi u ndryshua me sukses")
  }

  const patient = selectedAppointment
    ? patients.find((p) => p.id === selectedAppointment.patientId)
    : null
  const doctor = selectedAppointment
    ? staff.find((s) => s.id === selectedAppointment.doctorId)
    : null

  return (
    <div className="space-y-6">
      <Tabs value={view} onValueChange={(v) => setView(v as "javore" | "mjeket" | "dhomat")}>
        <TabsList>
          <TabsTrigger value="javore">{t('tabs.weekly')}</TabsTrigger>
          <TabsTrigger value="mjeket">{t('tabs.byDoctor')}</TabsTrigger>
          {hasActiveRooms && <TabsTrigger value="dhomat">{t('tabs.byRoom')}</TabsTrigger>}
        </TabsList>
      </Tabs>

      {view === "javore" ? (
        <AppointmentCalendar
          appointments={appointments}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : view === "mjeket" ? (
        <ProviderAvailabilityGrid
          appointments={appointments}
          doctors={staff}
          onAppointmentClick={handleAppointmentClick}
        />
      ) : (
        <RoomAvailabilityGrid
          appointments={appointments}
          rooms={rooms}
          onAppointmentClick={handleAppointmentClick}
        />
      )}

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dialog.title')}</DialogTitle>
            <DialogDescription>{t('dialog.description')}</DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.patient')}</p>
                  <p className="font-medium">
                    {patient ? `${patient.firstName} ${patient.lastName}` : selectedAppointment.patientName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.doctor')}</p>
                  <p className="font-medium">{doctor?.name || selectedAppointment.doctorName}</p>
                </div>
                {selectedAppointment.roomName && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('dialog.room')}</p>
                    <p className="font-medium">{selectedAppointment.roomName}</p>
                  </div>
                )}
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
                  <p className="font-medium">{selectedAppointment.duration} {t('dialog.minutesUnit')}</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('dialog.currentStatus')}</p>
                <StatusBadge status={selectedAppointment.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('dialog.changeStatus')}</p>
                <Select
                  value={selectedAppointment.status}
                  onValueChange={(value) => handleStatusChange(value as Appointment["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
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
              {selectedAppointment.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">{t('dialog.notes')}</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  {t('dialog.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
