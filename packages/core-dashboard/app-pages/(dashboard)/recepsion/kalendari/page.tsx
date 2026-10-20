"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { useQuickActions } from "@core/context/quick-actions-context"
import { AppointmentCalendar } from "@core/components/calendar/appointment-calendar"
import { CalendarOverviewSidebar } from "@core/components/calendar/calendar-overview-sidebar"
import { ProviderAvailabilityGrid } from "@core/components/calendar/provider-availability-grid"
import { RoomAvailabilityGrid } from "@core/components/calendar/room-availability-grid"
import { AppointmentRequestsSection } from "@core/components/appointments/appointment-requests-section"
import { Tabs, TabsList, TabsTrigger } from "@core/components/ui/tabs"
import { CalendarDays, UserPlus, FileUp } from "lucide-react"
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
import { Topbar } from "@core/components/layout/topbar"
import { toast } from "sonner"
import type { Appointment } from "@core/types"
import { fmtDate } from "@core/lib/utils"
import { archivePatient } from "@core/lib/api/patients"

export default function RecepsionKalendari() {
  const t = useTranslations('recepsion-kalendari')
  const { appointments, patients, staff, rooms, updateAppointment, refreshPatients } = useData()
  const { openDialog } = useQuickActions()
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null)
  const [view, setView] = useState<"javore" | "mjeket" | "dhomat" | "kerkesat">("javore")
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
    <>
      <Topbar title={t('topbar.title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">

      <Tabs value={view} onValueChange={(v) => setView(v as "javore" | "mjeket" | "dhomat" | "kerkesat")}>
        <TabsList className="mb-4">
          <TabsTrigger value="javore">{t('tabs.weekly')}</TabsTrigger>
          <TabsTrigger value="mjeket">{t('tabs.byDoctor')}</TabsTrigger>
          {hasActiveRooms && <TabsTrigger value="dhomat">{t('tabs.byRoom')}</TabsTrigger>}
          <TabsTrigger value="kerkesat">{t('tabs.requests')}</TabsTrigger>
        </TabsList>
      </Tabs>

      {view === "kerkesat" ? (
        <AppointmentRequestsSection />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          <div className="flex-1 min-w-0 w-full">
            {view === "javore" ? (
              <AppointmentCalendar
                appointments={appointments}
                onAppointmentClick={handleAppointmentClick}
                doctors={staff}
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
          </div>
          <CalendarOverviewSidebar
            appointments={appointments}
            onAppointmentClick={handleAppointmentClick}
            quickActions={[
              { label: t('quickActions.viewAll'), icon: CalendarDays, href: '/recepsion/takimet' },
              { label: t('quickActions.addPatient'), icon: UserPlus, onClick: () => openDialog('pacient') },
              { label: t('quickActions.uploadDocument'), icon: FileUp, href: '/recepsion/dokumenta?action=upload' },
            ]}
          />
        </div>
      )}

      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('detailDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('detailDialog.description')}
            </DialogDescription>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.patient')}</p>
                  <p className="font-medium">
                    {patient ? `${patient.firstName} ${patient.lastName}` : selectedAppointment.patientName}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.doctor')}</p>
                  <p className="font-medium">{doctor?.name || selectedAppointment.doctorName}</p>
                </div>
                {selectedAppointment.roomName && (
                  <div>
                    <p className="text-sm text-muted-foreground">{t('detailDialog.room')}</p>
                    <p className="font-medium">{selectedAppointment.roomName}</p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.date')}</p>
                  <p className="font-medium">{fmtDate(selectedAppointment.date)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.time')}</p>
                  <p className="font-medium">{selectedAppointment.time}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.type')}</p>
                  <p className="font-medium capitalize">{selectedAppointment.type}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.duration')}</p>
                  <p className="font-medium">{selectedAppointment.duration} min</p>
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('detailDialog.currentStatus')}</p>
                <StatusBadge status={selectedAppointment.status} />
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('detailDialog.changeStatus')}</p>
                <Select
                  value={selectedAppointment.status}
                  onValueChange={(value) => handleStatusChange(value as Appointment["status"])}
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
                  <p className="text-sm text-muted-foreground">{t('detailDialog.notes')}</p>
                  <p className="text-sm">{selectedAppointment.notes}</p>
                </div>
              )}
              <div className="flex justify-end">
                <Button variant="outline" onClick={() => setSelectedAppointment(null)}>
                  {t('detailDialog.close')}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </>
  )
}
