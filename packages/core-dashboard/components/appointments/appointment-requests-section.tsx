"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useData } from "@core/context/data-context"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@core/components/ui/select"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@core/components/ui/tabs"
import { Loader2, Check, X, Phone, Clock, Stethoscope } from "lucide-react"
import {
  getAppointmentRequests, approveAppointmentRequest, rejectAppointmentRequest,
  type StaffAppointmentRequest,
} from "@core/lib/api/appointment-requests"
import { fmtDate } from "@core/lib/utils"

const STATUS_FILTERS = ["ne_pritje", "miratuar", "refuzuar", "anuluar"] as const

// Admin/recepsion review queue for patient-portal appointment requests
// (patients booking themselves from Hypocrates-Web, not staff-created
// appointments). The backend (patient-portal-admin.controller.js) and its
// API client (lib/api/appointment-requests.ts) were both already fully
// built — conflict detection, transactional approve, audit log, the works —
// there was just no page anywhere that actually called any of it. Shared
// between admin/takimet's "Kërkesat" tab and recepsion/kalendari's, same
// component either way (the backend authorizes both roles identically).
export function AppointmentRequestsSection() {
  const t = useTranslations('appointment-requests-section')
  const { staff, refreshAppointments } = useData()
  const doctors = staff.filter((s) => s.role === "mjek" && s.status === "aktiv")

  const [requests, setRequests] = useState<StaffAppointmentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<typeof STATUS_FILTERS[number]>("ne_pritje")

  const load = () => {
    setLoading(true)
    getAppointmentRequests(statusFilter)
      .then(setRequests)
      .catch(() => toast.error(t("loadError")))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [statusFilter]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Approve ──────────────────────────────────────────────────────────
  const [approving, setApproving] = useState<StaffAppointmentRequest | null>(null)
  const [form, setForm] = useState({ date: "", time: "", duration: 30, doctorId: "", type: "", notes: "" })
  const [saving, setSaving] = useState(false)

  const openApprove = (r: StaffAppointmentRequest) => {
    setApproving(r)
    setForm({
      date: r.preferredDate || "",
      time: r.preferredTime || "",
      duration: 30,
      doctorId: r.doctorId || "",
      type: r.reason || "",
      notes: "",
    })
  }

  const handleApprove = async () => {
    if (!approving) return
    if (!form.date || !form.time || !form.doctorId || !form.type.trim()) {
      toast.error(t("approveDialog.validation"))
      return
    }
    setSaving(true)
    try {
      await approveAppointmentRequest(approving.id, form)
      toast.success(t("approveDialog.success"))
      setApproving(null)
      load()
      refreshAppointments()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"))
    } finally {
      setSaving(false)
    }
  }

  // ── Reject ───────────────────────────────────────────────────────────
  const [rejecting, setRejecting] = useState<StaffAppointmentRequest | null>(null)
  const [rejectNote, setRejectNote] = useState("")
  const [rejectBusy, setRejectBusy] = useState(false)

  const handleReject = async () => {
    if (!rejecting) return
    setRejectBusy(true)
    try {
      await rejectAppointmentRequest(rejecting.id, rejectNote.trim() || undefined)
      toast.success(t("rejectDialog.success"))
      setRejecting(null)
      setRejectNote("")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("genericError"))
    } finally {
      setRejectBusy(false)
    }
  }

  const statusChip: Record<string, string> = {
    ne_pritje: "chip-amber", miratuar: "chip-green", refuzuar: "chip-red", anuluar: "chip-blue",
  }

  return (
    <div className="space-y-4">
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}>
        <TabsList>
          {STATUS_FILTERS.map((s) => (
            <TabsTrigger key={s} value={s}>{t(`statusFilters.${s}`)}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t("loading")}</div>
        ) : requests.length === 0 ? (
          <div className="py-12 text-center text-sm text-muted-foreground">{t("empty")}</div>
        ) : (
          <div className="divide-y divide-border/40">
            {requests.map((r) => (
              <div key={r.id} className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm truncate">{r.patientName}</p>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${statusChip[r.status] || "chip-blue"}`}>
                      {t(`statusFilters.${r.status}`)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground mt-1">
                    {r.patientPhone && (
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{r.patientPhone}</span>
                    )}
                    {r.preferredDate && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />{fmtDate(r.preferredDate)}{r.preferredTime ? ` · ${r.preferredTime}` : ""}
                      </span>
                    )}
                    {r.doctorName && (
                      <span className="flex items-center gap-1"><Stethoscope className="h-3 w-3" />{r.doctorName}</span>
                    )}
                  </div>
                  {r.reason && <p className="text-xs text-muted-foreground mt-1 truncate">{r.reason}</p>}
                  {r.staffNote && (
                    <p className="text-xs text-muted-foreground mt-1 italic">{t("staffNoteLabel")}: {r.staffNote}</p>
                  )}
                </div>
                {r.status === "ne_pritje" && (
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive gap-1.5" onClick={() => setRejecting(r)}>
                      <X className="h-3.5 w-3.5" />
                      {t("reject")}
                    </Button>
                    <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5" onClick={() => openApprove(r)}>
                      <Check className="h-3.5 w-3.5" />
                      {t("approve")}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approve dialog */}
      <Dialog open={!!approving} onOpenChange={(open) => !open && setApproving(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("approveDialog.title")}</DialogTitle>
            <DialogDescription>{t("approveDialog.description", { name: approving?.patientName || "" })}</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="req-date">{t("approveDialog.date")}</Label>
              <Input id="req-date" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-time">{t("approveDialog.time")}</Label>
              <Input id="req-time" type="time" value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label>{t("approveDialog.doctor")}</Label>
              <Select value={form.doctorId} onValueChange={(v) => setForm((f) => ({ ...f, doctorId: v }))}>
                <SelectTrigger><SelectValue placeholder={t("approveDialog.doctorPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {doctors.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="req-duration">{t("approveDialog.duration")}</Label>
              <Input id="req-duration" type="number" min={5} step={5} value={form.duration} onChange={(e) => setForm((f) => ({ ...f, duration: parseInt(e.target.value, 10) || 30 }))} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="req-type">{t("approveDialog.type")}</Label>
              <Input id="req-type" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} placeholder={t("approveDialog.typePlaceholder")} />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label htmlFor="req-notes">{t("approveDialog.notes")}</Label>
              <Textarea id="req-notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproving(null)} disabled={saving}>{t("cancel")}</Button>
            <Button onClick={handleApprove} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("approveDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejecting} onOpenChange={(open) => !open && setRejecting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("rejectDialog.title")}</DialogTitle>
            <DialogDescription>{t("rejectDialog.description", { name: rejecting?.patientName || "" })}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 py-2">
            <Label htmlFor="reject-note">{t("rejectDialog.noteLabel")}</Label>
            <Textarea id="reject-note" value={rejectNote} onChange={(e) => setRejectNote(e.target.value)} rows={3} placeholder={t("rejectDialog.notePlaceholder")} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejecting(null)} disabled={rejectBusy}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={handleReject} disabled={rejectBusy} className="gap-2">
              {rejectBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("rejectDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
