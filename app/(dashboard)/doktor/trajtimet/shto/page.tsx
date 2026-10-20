"use client"

import { useState, useEffect, Suspense } from "react"
import { useTranslations } from 'next-intl'
import { fmtLEK, fmtEUR } from "@core/lib/currency"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Textarea } from "@core/components/ui/textarea"
import { ToothChartSwitcher } from "@/components/dental/tooth-chart-switcher"
import { AllergyAlert } from "@core/components/patient/allergy-alert"
import { TreatmentEstimate } from "@core/components/treatment/treatment-estimate"
import { DictateButton } from "@core/components/ui/dictate-button"
import { LoadingSpinner } from "@core/components/ui/loading"
import { FieldGroup, Field, FieldLabel } from "@core/components/ui/field"
import { Switch } from "@core/components/ui/switch"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@core/components/ui/select"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@core/lib/utils"
import { ApiError } from "@core/lib/api-client"

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

function AddTreatmentContent() {
  const t           = useTranslations('doktor-trajtimet-shto')
  const router      = useRouter()
  const params      = useSearchParams()
  const { user }    = useAuth()
  const { patients, services, treatments, addTreatment, addPatientService, updateAppointment } = useData()

  const preselectedPatient = params.get("pacient")
  const appointmentId      = params.get("takim")

  const [selectedTeeth, setSelectedTeeth]     = useState<number[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState("__none__")
  const [trtErrors, setTrtErrors] = useState<Record<string, string>>({})
  const [useSoap, setUseSoap] = useState(false)
  const [allergyWarning, setAllergyWarning] = useState<string | null>(null)
  const [treatment, setTreatment] = useState({
    patientId:   preselectedPatient || "",
    doctorId:    user?.id || "",
    date:        (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}` })(),
    type:        "",
    description: "",
    treatmentArea: "",
    cost:        0,
    notes:       "",
    status:      "perfunduar" as "planifikuar" | "ne_proces" | "perfunduar",
    soapSubjective: "",
    soapObjective: "",
    soapAssessment: "",
    soapPlan: "",
  })

  // NOTE (dental-specific): this parses treatmentArea as a comma-separated
  // list of tooth numbers to feed the ToothChartSwitcher below — that
  // convention is dental-only. A non-dental fork should remove
  // ToothChartSwitcher and these two derived lists together; the
  // treatmentArea field itself (a plain string) stays generic either way.
  // See SPECIALTY-ADAPTATION.md.
  const patientTreatedTeeth = (treatments || [])
    .filter((t) => t.patientId === treatment.patientId && t.status !== "planifikuar")
    .flatMap((t) => (t.treatmentArea || "").split(",").map((n) => parseInt(n.trim())))
    .filter((n) => n > 0)

  const patientPlannedTeeth = (treatments || [])
    .filter((t) => t.patientId === treatment.patientId && t.status === "planifikuar")
    .flatMap((t) => (t.treatmentArea || "").split(",").map((n) => parseInt(n.trim())))
    .filter((n) => n > 0)

  useEffect(() => {
    if (user?.id) setTreatment((p) => ({ ...p, doctorId: user.id }))
  }, [user])

  useEffect(() => {
    setTreatment((p) => ({ ...p, treatmentArea: selectedTeeth.join(', ') }))
  }, [selectedTeeth])

  const handleServiceSelect = (id: string) => {
    setSelectedServiceId(id)
    if (id === "__none__") return
    const svc = services.find((s) => s.id === id)
    if (svc) setTreatment((p) => ({ ...p, type: svc.name, cost: svc.price }))
  }

  const submitTreatment = async (acknowledgeAllergies = false) => {
    await addTreatment({
      patientId:     treatment.patientId,
      doctorId:      treatment.doctorId,
      doctorName:    user?.name || "",
      appointmentId: appointmentId || undefined,
      date:          treatment.date,
      type:          treatment.type,
      description:   treatment.description,
      treatmentArea: treatment.treatmentArea || "",
      cost:          treatment.cost || 0,
      notes:         treatment.notes || "",
      status:        treatment.status,
      soapSubjective: useSoap ? treatment.soapSubjective : undefined,
      soapObjective:  useSoap ? treatment.soapObjective : undefined,
      soapAssessment: useSoap ? treatment.soapAssessment : undefined,
      soapPlan:       useSoap ? treatment.soapPlan : undefined,
      acknowledgeAllergies,
    })

    if (selectedServiceId && selectedServiceId !== "__none__") {
      const svc = services.find((s) => s.id === selectedServiceId)
      if (svc) {
        await addPatientService({
          patientId:     treatment.patientId,
          serviceId:     selectedServiceId,
          serviceName:   svc.name,
          quantity:      1,
          priceSnapshot: svc.price,
          date:          treatment.date,
          doctorId:      treatment.doctorId,
          doctorName:    user?.name || "",
          appointmentId: appointmentId || "",
          notes:         treatment.notes || "",
          invoiced:      false,
        })
      }
    }

    if (appointmentId && treatment.status === "perfunduar") await updateAppointment(appointmentId, { status: "perfunduar" })

    toast.success("Trajtimi u shtua me sukses")
    router.push("/doktor/trajtimet")
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await submitTreatment(false)
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setAllergyWarning(err.message)
      } else {
        toast.error("Gabim gjatë ruajtjes")
      }
    }
  }

  const handleConfirmAllergy = async () => {
    setAllergyWarning(null)
    try {
      await submitTreatment(true)
    } catch {
      toast.error("Gabim gjatë ruajtjes")
    }
  }

  return (
    <>
      <Topbar />
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('header.title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('header.subtitle')}</p>
          </div>
          <Link href="/doktor/trajtimet">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Icon name="arrow_back" size={15} />
              {t('back')}
            </Button>
          </Link>
        </div>
        <div className="grid gap-6 lg:grid-cols-2 max-w-6xl">

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 ibg-blue rounded-xl">
                  <Icon name="stethoscope" size={20} className="ic-blue" />
                </div>
                <div>
                  <CardTitle className="text-base">{t('card.title')}</CardTitle>
                  <CardDescription>{t('card.description')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel>{t('fields.patient')}</FieldLabel>
                      <Select value={treatment.patientId} onValueChange={(v) => { setTreatment({ ...treatment, patientId: v }); if (trtErrors.patientId) setTrtErrors(p => ({ ...p, patientId: '' })) }}>
                        <SelectTrigger className={cn("rounded-xl", trtErrors.patientId && "border-destructive")}><SelectValue placeholder={t('fields.patientPlaceholder')} /></SelectTrigger>
                        <SelectContent>
                          {(patients || []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {trtErrors.patientId && <p className="text-xs text-destructive mt-1">{trtErrors.patientId}</p>}
                    </Field>
                    <Field>
                      <FieldLabel>{t('fields.date')}</FieldLabel>
                      <Input type="date" value={treatment.date} onChange={(e) => setTreatment({ ...treatment, date: e.target.value })} className="rounded-xl" />
                    </Field>
                  </div>

                  <AllergyAlert allergies={patients.find((p) => p.id === treatment.patientId)?.allergies} />

                  {services.length > 0 && (
                    <Field>
                      <FieldLabel>{t('fields.catalogService')}</FieldLabel>
                      <Select value={selectedServiceId} onValueChange={handleServiceSelect}>
                        <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('fields.catalogServicePlaceholder')} /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{t('fields.noCatalogService')}</SelectItem>
                          {services.filter((s) => s.isActive).map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name} — {fmtLEK(s.price)} ({fmtEUR(s.price)})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                  )}

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel>{t('fields.treatmentType')}</FieldLabel>
                      <Input value={treatment.type} onChange={(e) => { setTreatment({ ...treatment, type: e.target.value }); if (trtErrors.type) setTrtErrors(p => ({ ...p, type: '' })) }} placeholder={t('fields.treatmentTypePlaceholder')} className={cn("rounded-xl", trtErrors.type && "border-destructive focus-visible:ring-destructive/30")} />
                      {trtErrors.type && <p className="text-xs text-destructive mt-1">{trtErrors.type}</p>}
                    </Field>
                    <Field>
                      <FieldLabel>{t('fields.treatmentArea')}</FieldLabel>
                      <Input value={treatment.treatmentArea} onChange={(e) => setTreatment({ ...treatment, treatmentArea: e.target.value })} placeholder={t('fields.treatmentAreaPlaceholder')} className="rounded-xl" />
                    </Field>
                  </div>

                  <TreatmentEstimate
                    type={treatment.type}
                    service={selectedServiceId !== "__none__" ? services.find((s) => s.id === selectedServiceId) : undefined}
                  />

                  <Field>
                    <div className="flex items-center justify-between">
                      <FieldLabel>{t('fields.description')}</FieldLabel>
                      <DictateButton onTranscript={(text) => setTreatment((p) => ({ ...p, description: (p.description ? p.description + ' ' : '') + text }))} />
                    </div>
                    <Textarea value={treatment.description} onChange={(e) => { setTreatment({ ...treatment, description: e.target.value }); if (trtErrors.description) setTrtErrors(p => ({ ...p, description: '' })) }} placeholder={t('fields.descriptionPlaceholder')} rows={4} className={cn("rounded-xl resize-none", trtErrors.description && "border-destructive focus-visible:ring-destructive/30")} />
                    {trtErrors.description && <p className="text-xs text-destructive mt-1">{trtErrors.description}</p>}
                  </Field>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Field>
                      <FieldLabel>{t('fields.cost')}</FieldLabel>
                      <Input type="number" step="1" value={treatment.cost || ""} onChange={(e) => setTreatment({ ...treatment, cost: parseFloat(e.target.value) || 0 })} placeholder="0" className="rounded-xl" />
                    </Field>
                    <Field>
                      <FieldLabel>{t('fields.status')}</FieldLabel>
                      <Select value={treatment.status} onValueChange={(v) => setTreatment({ ...treatment, status: v as typeof treatment.status })}>
                        <SelectTrigger className="rounded-xl"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="planifikuar">{t('status.planifikuar')}</SelectItem>
                          <SelectItem value="ne_proces">{t('status.neProces')}</SelectItem>
                          <SelectItem value="perfunduar">{t('status.perfunduar')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </Field>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-foreground">{t('soap.toggleTitle')}</p>
                      <p className="text-xs text-muted-foreground">{t('soap.toggleSubtitle')}</p>
                    </div>
                    <Switch checked={useSoap} onCheckedChange={setUseSoap} />
                  </div>

                  {useSoap ? (
                    <div className="space-y-3">
                      {([
                        ['soapSubjective', t('soap.subjective.label'), t('soap.subjective.placeholder')],
                        ['soapObjective', t('soap.objective.label'), t('soap.objective.placeholder')],
                        ['soapAssessment', t('soap.assessment.label'), t('soap.assessment.placeholder')],
                        ['soapPlan', t('soap.plan.label'), t('soap.plan.placeholder')],
                      ] as const).map(([field, label, placeholder]) => (
                        <Field key={field}>
                          <div className="flex items-center justify-between">
                            <FieldLabel>{label}</FieldLabel>
                            <DictateButton onTranscript={(text) => setTreatment((p) => ({ ...p, [field]: (p[field] ? p[field] + ' ' : '') + text }))} />
                          </div>
                          <Textarea
                            value={treatment[field]}
                            onChange={(e) => setTreatment((p) => ({ ...p, [field]: e.target.value }))}
                            placeholder={placeholder}
                            rows={2}
                            className="rounded-xl resize-none"
                          />
                        </Field>
                      ))}
                    </div>
                  ) : (
                    <Field>
                      <div className="flex items-center justify-between">
                        <FieldLabel>{t('notes.label')}</FieldLabel>
                        <DictateButton onTranscript={(text) => setTreatment((p) => ({ ...p, notes: (p.notes ? p.notes + ' ' : '') + text }))} />
                      </div>
                      <Textarea value={treatment.notes} onChange={(e) => setTreatment({ ...treatment, notes: e.target.value })} placeholder={t('notes.placeholder')} rows={2} className="rounded-xl resize-none" />
                    </Field>
                  )}
                </FieldGroup>

                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">{t('actions.cancel')}</Button>
                  <Button type="submit" className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                    <Icon name="save" size={16} />
                    {t('actions.save')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <ToothChartSwitcher selectedTeeth={selectedTeeth} onTeethSelect={setSelectedTeeth} treatedTeeth={patientTreatedTeeth} plannedTeeth={patientPlannedTeeth} />
            {treatment.patientId && patientTreatedTeeth.length > 0 && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                    <Icon name="history" size={15} className="text-accent" />
                    {t('treatedTeethCard')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {patientTreatedTeeth.map((tooth) => (
                      <span key={tooth} className="px-3 py-1 chip-green text-sm font-semibold rounded-lg">
                        {tooth}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <AlertDialog open={!!allergyWarning} onOpenChange={(open) => { if (!open) setAllergyWarning(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('allergyDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>{allergyWarning}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('allergyDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmAllergy} className="bg-destructive hover:bg-destructive/90 text-white">
              {t('allergyDialog.proceed')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function ShtoTrajtim() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    }>
      <AddTreatmentContent />
    </Suspense>
  )
}
