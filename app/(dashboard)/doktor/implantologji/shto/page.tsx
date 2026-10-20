"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Textarea } from "@core/components/ui/textarea"
import { ToothChartSwitcher } from "@/components/dental/tooth-chart-switcher"
import { LoadingSpinner } from "@core/components/ui/loading"
import { FieldGroup, Field, FieldLabel } from "@core/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import { createImplantPlan } from "@/lib/api/implant-plans"
import { toast } from "sonner"
import Link from "next/link"
import { cn } from "@core/lib/utils"

function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <span className={cn("material-symbols-outlined select-none leading-none", className)} style={{ fontSize: size }}>
      {name}
    </span>
  )
}

const STEP_COUNT = 3

// ── Step progress indicator ──────────────────────────────────────────────
function StepIndicator({ step, labels }: { step: number; labels: string[] }) {
  return (
    <div className="flex items-center max-w-2xl">
      {labels.map((label, i) => {
        const num = i + 1
        const active = num === step
        const done = num < step
        return (
          <div key={label} className={cn("flex items-center", i < labels.length - 1 && "flex-1")}>
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-colors shrink-0",
                  done ? "bg-accent text-accent-foreground" : active ? "bg-accent text-accent-foreground" : "bg-secondary text-muted-foreground"
                )}
              >
                {done ? <Icon name="check" size={16} /> : num}
              </div>
              <span className={cn("text-[11px] font-medium text-center max-w-[90px]", active ? "text-foreground" : "text-muted-foreground")}>
                {label}
              </span>
            </div>
            {i < labels.length - 1 && (
              <div className={cn("h-[2px] flex-1 mx-2 mb-5 transition-colors", done ? "bg-accent" : "bg-border")} />
            )}
          </div>
        )
      })}
    </div>
  )
}

function AddImplantPlanContent() {
  const t = useTranslations('doktor-implant-shto')
  const router   = useRouter()
  const params   = useSearchParams()
  const { user } = useAuth()
  const { patients } = useData()

  const preselectedPatient = params.get("pacient")

  const defaultStages = [t('defaultStages.consultation'), t('defaultStages.surgery'), t('defaultStages.healing'), t('defaultStages.crownPlacement')]

  const [step, setStep] = useState(1)
  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [patientId, setPatientId] = useState(preselectedPatient || "")
  const [doctorId, setDoctorId]   = useState(user?.id || "")
  const [brand, setBrand]         = useState("")
  const [diameterMm, setDiameterMm] = useState("")
  const [lengthMm, setLengthMm]     = useState("")
  const [cost, setCost]             = useState(0)
  const [notes, setNotes]           = useState("")
  const [stages, setStages] = useState<{ label: string; date: string }[]>(
    defaultStages.map((label) => ({ label, date: "" }))
  )
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (user?.id) setDoctorId(user.id)
  }, [user])

  const updateStageLabel = (i: number, label: string) =>
    setStages((s) => s.map((st, idx) => (idx === i ? { ...st, label } : st)))
  const updateStageDate = (i: number, date: string) =>
    setStages((s) => s.map((st, idx) => (idx === i ? { ...st, date } : st)))
  const addStage = () => setStages((s) => [...s, { label: "", date: "" }])
  const removeStage = (i: number) => setStages((s) => s.filter((_, idx) => idx !== i))

  const validateStep1 = () => {
    const nextErrors: Record<string, string> = {}
    if (!patientId) nextErrors.patientId = t('validation.selectPatient')
    if (selectedTeeth.length === 0) nextErrors.teeth = t('validation.selectTooth')
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const goNext = () => {
    if (step === 1 && !validateStep1()) return
    setStep((s) => Math.min(STEP_COUNT, s + 1))
  }
  const goBack = () => setStep((s) => Math.max(1, s - 1))

  const handleSubmit = async () => {
    if (!validateStep1()) { setStep(1); return }

    try {
      setSaving(true)
      await createImplantPlan({
        patientId,
        doctorId,
        toothNumbers: selectedTeeth.join(", "),
        brand: brand || undefined,
        diameterMm: diameterMm ? parseFloat(diameterMm) : undefined,
        lengthMm: lengthMm ? parseFloat(lengthMm) : undefined,
        cost,
        notes: notes || undefined,
        stages: stages.filter((s) => s.label.trim()).map((s) => ({ stageLabel: s.label.trim(), stageDate: s.date || undefined })),
      })
      toast.success("Plani i implantit u krijua me sukses")
      router.push(`/doktor/pacientet/${patientId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  const stepLabels = [t('steps.patientTeeth'), t('steps.implantSpecs'), t('steps.surgicalStages')]

  return (
    <>
      <Topbar />
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
          </div>
          <Link href={patientId ? `/doktor/pacientet/${patientId}` : "/doktor/pacientet"}>
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Icon name="arrow_back" size={15} />
              {t('back')}
            </Button>
          </Link>
        </div>

        <StepIndicator step={step} labels={stepLabels} />

        <div className="max-w-3xl">
          {/* ── Step 1: Patient & Teeth ── */}
          {step === 1 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 ibg-blue rounded-xl">
                    <Icon name="person" size={20} className="ic-blue" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('steps.patientTeeth')}</CardTitle>
                    <CardDescription>{t('steps.patientTeethDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-5">
                <Field>
                  <FieldLabel>{t('patientLabel')}</FieldLabel>
                  <Select value={patientId} onValueChange={(v) => { setPatientId(v); if (errors.patientId) setErrors((p) => ({ ...p, patientId: "" })) }}>
                    <SelectTrigger className={cn("rounded-xl", errors.patientId && "border-destructive")}><SelectValue placeholder={t('patientPlaceholder')} /></SelectTrigger>
                    <SelectContent>
                      {(patients || []).map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.firstName} {p.lastName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.patientId && <p className="text-xs text-destructive mt-1">{errors.patientId}</p>}
                </Field>
                <div>
                  <FieldLabel>{t('teethLabel')}</FieldLabel>
                  <div className="mt-2">
                    <ToothChartSwitcher selectedTeeth={selectedTeeth} onTeethSelect={setSelectedTeeth} />
                  </div>
                  {errors.teeth && <p className="text-xs text-destructive mt-1">{errors.teeth}</p>}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Step 2: Implant Specs ── */}
          {step === 2 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 ibg-blue rounded-xl">
                    <Icon name="implant" size={20} className="ic-blue" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('planDetails')}</CardTitle>
                    <CardDescription>{t('planDetailsDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <FieldGroup className="gap-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field>
                      <FieldLabel>{t('brandLabel')}</FieldLabel>
                      <Input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder={t('brandPlaceholder')} className="rounded-xl" />
                    </Field>
                    <Field>
                      <FieldLabel>{t('diameterLabel')}</FieldLabel>
                      <Input type="number" step="0.1" value={diameterMm} onChange={(e) => setDiameterMm(e.target.value)} placeholder="p.sh. 4.1" className="rounded-xl" />
                    </Field>
                    <Field>
                      <FieldLabel>{t('lengthLabel')}</FieldLabel>
                      <Input type="number" step="0.1" value={lengthMm} onChange={(e) => setLengthMm(e.target.value)} placeholder="p.sh. 10" className="rounded-xl" />
                    </Field>
                  </div>

                  <Field>
                    <FieldLabel>{t('costLabel')}</FieldLabel>
                    <Input type="number" step="1" value={cost || ""} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} placeholder="0" className="rounded-xl" />
                  </Field>

                  <Field>
                    <FieldLabel>{t('notesLabel')}</FieldLabel>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} rows={3} className="rounded-xl resize-none" />
                  </Field>
                </FieldGroup>
              </CardContent>
            </Card>
          )}

          {/* ── Step 3: Surgical Stages ── */}
          {step === 3 && (
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 ibg-blue rounded-xl">
                    <Icon name="event_note" size={20} className="ic-blue" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{t('surgicalStages')}</CardTitle>
                    <CardDescription>{t('steps.surgicalStagesDescription')}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Field>
                  <div className="flex items-center justify-between">
                    <FieldLabel>{t('surgicalStages')}</FieldLabel>
                    <Button type="button" variant="outline" size="sm" onClick={addStage} className="h-7 gap-1 rounded-lg text-xs">
                      <Icon name="add" size={13} />
                      {t('addStage')}
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {stages.map((stage, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Input value={stage.label} onChange={(e) => updateStageLabel(i, e.target.value)} placeholder={t('stageNamePlaceholder')} className="rounded-xl flex-1" />
                        <Input type="date" value={stage.date} onChange={(e) => updateStageDate(i, e.target.value)} className="rounded-xl w-44" />
                        <Button type="button" variant="ghost" size="icon-sm" onClick={() => removeStage(i)}>
                          <Icon name="close" size={15} />
                        </Button>
                      </div>
                    ))}
                    {stages.length === 0 && (
                      <p className="text-sm text-muted-foreground py-2">{t('steps.noStagesYet')}</p>
                    )}
                  </div>
                </Field>
              </CardContent>
            </Card>
          )}

          {/* ── Navigation ── */}
          <div className="flex gap-3 mt-6">
            <Button type="button" variant="outline" onClick={step === 1 ? () => router.back() : goBack} className="flex-1">
              {step === 1 ? t('cancel') : t('steps.previous')}
            </Button>
            {step < STEP_COUNT ? (
              <Button type="button" onClick={goNext} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                {t('steps.next')}
                <Icon name="arrow_forward" size={16} />
              </Button>
            ) : (
              <Button type="button" onClick={handleSubmit} disabled={saving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                <Icon name="save" size={16} />
                {saving ? t('saving') : t('savePlan')}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShtoPlanImplanti() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <AddImplantPlanContent />
    </Suspense>
  )
}
