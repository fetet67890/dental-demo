"use client"

import { useMemo, useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useSearchParams } from "next/navigation"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@core/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@core/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@core/components/ui/select"
import { Plus, Calendar, Clock } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@core/components/ui/status-badge"
import type { Appointment } from "@core/types"
import { cn, fmtDate, syncUrl } from "@core/lib/utils"

const EMPTY_FORM: Partial<Appointment> = {
  patientId: "",
  doctorId: "",
  date: "",
  time: "",
  duration: 30,
  type: "kontroll",
  status: "planifikuar",
  notes: "",
}

export default function RecepsionTakimet() {
  const t = useTranslations('recepsion-takimet')
  const { appointments, patients, staff, addAppointment, updateAppointment, refreshPatients } = useData()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [isOpen, setIsOpen] = useState(false)
  const [form, setForm] = useState<Partial<Appointment>>(EMPTY_FORM)
  const [aptErrors, setAptErrors] = useState<Record<string, string>>({})

  const doctors = staff.filter((s) => s.role === "mjek")

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setForm(EMPTY_FORM)
      setAptErrors({})
      setIsOpen(true)
      syncUrl('/recepsion/takimet')
    }
  }, [searchParams]) // eslint-disable-line

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

  const active = (a: Appointment) => a.status !== 'anuluar'
  const todayApts  = useMemo(() => appointments.filter(a => a.date?.substring(0,10) === todayStr && active(a)).sort((a,b) => (a.time||'').localeCompare(b.time||'')), [appointments, todayStr])
  const weekCount  = useMemo(() => appointments.filter(a => active(a) && a.date >= weekStartStr && a.date <= weekEndStr).length, [appointments, weekStartStr, weekEndStr])
  const monthCount = useMemo(() => appointments.filter(a => active(a) && a.date?.startsWith(monthStr)).length, [appointments, monthStr])

  const filteredAppointments = appointments.filter((a) => {
    const patient = patients.find((p) => p.id === a.patientId)
    const doctor = staff.find((s) => s.id === a.doctorId)
    const matchesSearch =
      patient?.firstName.toLowerCase().includes(search.toLowerCase()) ||
      patient?.lastName.toLowerCase().includes(search.toLowerCase()) ||
      doctor?.name.toLowerCase().includes(search.toLowerCase())
    const matchesStatus = statusFilter === "all" || a.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const handleAdd = async () => {
    try {
      await addAppointment({
        patientId:  form.patientId!,
        doctorId:   form.doctorId!,
        patientName: patients.find(p => p.id === form.patientId)
          ? `${patients.find(p => p.id === form.patientId)!.firstName} ${patients.find(p => p.id === form.patientId)!.lastName}`
          : "",
        doctorName: staff.find(s => s.id === form.doctorId)?.name || "",
        date:       form.date!,
        time:       form.time!,
        duration:   form.duration || 30,
        type:       form.type || "kontroll",
        status:     "planifikuar",
        notes:      form.notes || "",
      })
      toast.success("Takimi u shtua me sukses")
      setIsOpen(false)
      setForm(EMPTY_FORM)
      setAptErrors({})
    } catch {
      toast.error("Gabim gjatë shtimit të takimit")
    }
  }

  const handleStatusChange = async (appointmentId: string, newStatus: Appointment["status"]) => {
    try {
      await updateAppointment(appointmentId, { status: newStatus })
      if (newStatus === "perfunduar") {
        const apt = appointments.find(a => a.id === appointmentId)
        if (apt) {
          const patient = patients.find(p => p.id === apt.patientId)
          if (patient && !patient.archived) {
            const { archivePatient } = await import("@core/lib/api/patients")
            try {
              await archivePatient(apt.patientId)
              await refreshPatients()
              toast.success(`Takimi u përfundua. ${patient.firstName} ${patient.lastName} u arkivua automatikisht.`)
              return
            } catch {
              // fall through
            }
          }
        }
      }
      toast.success("Statusi u ndryshua me sukses")
    } catch {
      toast.error("Gabim gjatë ndryshimit të statusit")
    }
  }

  return (
    <>
      <Topbar title={t('topbar.title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: t('stats.today'),     value: todayApts.length, strip: 'strip-blue',   note: todayLabel },
            { label: t('stats.thisWeek'),  value: weekCount,        strip: 'strip-sky',    note: t('stats.activeAppointments') },
            { label: t('stats.thisMonth'), value: monthCount,       strip: 'strip-indigo', note: t('stats.activeAppointments') },
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
        <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden mb-6">
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
                    <p className="text-xs text-muted-foreground truncate">{apt.doctorName} · {apt.type}</p>
                  </div>
                  <StatusBadge status={apt.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6">
          <div />
          <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setForm(EMPTY_FORM); setAptErrors({}) } }}>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="mr-2 h-4 w-4" />
                {t('createButton')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{t('createDialog.title')}</DialogTitle>
                <DialogDescription>{t('createDialog.description')}</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>{t('createDialog.patient')}</Label>
                  <Select
                    value={form.patientId}
                    onValueChange={(v) => { setForm({ ...form, patientId: v }); if (aptErrors.patientId) setAptErrors(p => ({ ...p, patientId: '' })) }}
                  >
                    <SelectTrigger className={cn(aptErrors.patientId && "border-destructive")}><SelectValue placeholder={t('createDialog.patientPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.firstName} {p.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aptErrors.patientId && <p className="text-xs text-destructive mt-1">{aptErrors.patientId}</p>}
                </div>
                <div className="space-y-2">
                  <Label>{t('createDialog.doctor')}</Label>
                  <Select
                    value={form.doctorId}
                    onValueChange={(v) => { setForm({ ...form, doctorId: v }); if (aptErrors.doctorId) setAptErrors(p => ({ ...p, doctorId: '' })) }}
                  >
                    <SelectTrigger className={cn(aptErrors.doctorId && "border-destructive")}><SelectValue placeholder={t('createDialog.doctorPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {doctors.map((d) => (
                        <SelectItem key={d.id} value={d.id}>Dr. {d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {aptErrors.doctorId && <p className="text-xs text-destructive mt-1">{aptErrors.doctorId}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('createDialog.date')}</Label>
                    <Input
                      type="date"
                      value={form.date}
                      onChange={(e) => { setForm({ ...form, date: e.target.value }); if (aptErrors.date) setAptErrors(p => ({ ...p, date: '' })) }}
                      className={cn(aptErrors.date && "border-destructive")}
                    />
                    {aptErrors.date && <p className="text-xs text-destructive mt-1">{aptErrors.date}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label>{t('createDialog.time')}</Label>
                    <Input
                      type="time"
                      value={form.time}
                      onChange={(e) => { setForm({ ...form, time: e.target.value }); if (aptErrors.time) setAptErrors(p => ({ ...p, time: '' })) }}
                      className={cn(aptErrors.time && "border-destructive")}
                    />
                    {aptErrors.time && <p className="text-xs text-destructive mt-1">{aptErrors.time}</p>}
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>{t('createDialog.visitType')}</Label>
                    <Select
                      value={form.type}
                      onValueChange={(v) => setForm({ ...form, type: v })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="kontroll">{t('visitTypes.kontroll')}</SelectItem>
                        <SelectItem value="trajtim">{t('visitTypes.trajtim')}</SelectItem>
                        <SelectItem value="emergjence">{t('visitTypes.emergjence')}</SelectItem>
                        <SelectItem value="konsulte">{t('visitTypes.konsulte')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('createDialog.duration')}</Label>
                    <Input
                      type="number"
                      value={form.duration}
                      onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>{t('createDialog.notes')}</Label>
                  <Textarea
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder={t('createDialog.notesPlaceholder')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsOpen(false)}>{t('createDialog.cancel')}</Button>
                <Button onClick={handleAdd} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  {t('createDialog.submit')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <SearchInput
                placeholder={t('search.placeholder')}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                containerClassName="flex-1 max-w-sm"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder={t('search.statusFilterPlaceholder')} />
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
          <CardContent className="p-0">
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.patient')}</TableHead>
                  <TableHead className="hidden sm:table-cell">{t('table.doctor')}</TableHead>
                  <TableHead>{t('table.dateTime')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('table.type')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAppointments.map((appointment) => {
                  const patient = patients.find((p) => p.id === appointment.patientId)
                  const doctor = staff.find((s) => s.id === appointment.doctorId)
                  return (
                    <TableRow key={appointment.id}>
                      <TableCell>
                        <p className="font-medium">
                          {patient ? `${patient.firstName} ${patient.lastName}` : appointment.patientName}
                        </p>
                        <p className="text-xs text-muted-foreground sm:hidden">
                          Dr. {doctor?.name || appointment.doctorName}
                        </p>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">Dr. {doctor?.name || appointment.doctorName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-0.5">
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3 shrink-0" />
                            {fmtDate(appointment.date)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Clock className="h-3 w-3 shrink-0" />
                            {appointment.time}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell capitalize">{appointment.type}</TableCell>
                      <TableCell>
                        <Select
                          value={appointment.status}
                          onValueChange={(v) =>
                            handleStatusChange(appointment.id, v as Appointment["status"])
                          }
                        >
                          <SelectTrigger className="w-36 h-8 text-xs border-0 bg-transparent p-0 shadow-none focus:ring-0">
                            <StatusBadge status={appointment.status} />
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
                    </TableRow>
                  )
                })}
                {filteredAppointments.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      {t('empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
