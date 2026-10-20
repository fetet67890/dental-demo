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
import { createCosmeticPlan } from "@/lib/api/cosmetic-plans"
import type { CosmeticProcedureType } from "@/types"
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

function AddCosmeticPlanContent() {
  const t = useTranslations('doktor-kozmetike-shto')
  const router   = useRouter()
  const params   = useSearchParams()
  const { user } = useAuth()
  const { patients } = useData()

  const procedureLabels: Record<CosmeticProcedureType, string> = {
    faceta:   t('procedures.faceta'),
    zbardhim: t('procedures.zbardhim'),
    bonding:  t('procedures.bonding'),
    tjeter:   t('procedures.tjeter'),
  }

  const preselectedPatient = params.get("pacient")

  const [selectedTeeth, setSelectedTeeth] = useState<number[]>([])
  const [procedureByTooth, setProcedureByTooth] = useState<Record<number, CosmeticProcedureType>>({})
  const [patientId, setPatientId] = useState(preselectedPatient || "")
  const [doctorId, setDoctorId]   = useState(user?.id || "")
  const [cost, setCost]           = useState(0)
  const [notes, setNotes]         = useState("")
  const [errors, setErrors]       = useState<Record<string, string>>({})
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    if (user?.id) setDoctorId(user.id)
  }, [user])

  // Keep the per-tooth procedure map in sync with the tooth chart's
  // selection — new teeth default to "faceta", deselected ones drop out.
  const handleTeethSelect = (teeth: number[]) => {
    setSelectedTeeth(teeth)
    setProcedureByTooth((prev) => {
      const next: Record<number, CosmeticProcedureType> = {}
      for (const tooth of teeth) next[tooth] = prev[tooth] || "faceta"
      return next
    })
  }

  const setProcedure = (tooth: number, proc: CosmeticProcedureType) =>
    setProcedureByTooth((prev) => ({ ...prev, [tooth]: proc }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const nextErrors: Record<string, string> = {}
    if (!patientId) nextErrors.patientId = t('validation.selectPatient')
    if (selectedTeeth.length === 0) nextErrors.teeth = t('validation.selectTooth')
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0) return

    try {
      setSaving(true)
      await createCosmeticPlan({
        patientId,
        doctorId,
        cost,
        notes: notes || undefined,
        teeth: selectedTeeth.map((tooth) => ({ toothNumber: tooth, procedureType: procedureByTooth[tooth] || "faceta" })),
      })
      toast.success("Plani kozmetik u krijua me sukses")
      router.push(`/doktor/pacientet/${patientId}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <Topbar />
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
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

        <div className="grid gap-6 lg:grid-cols-2 max-w-6xl">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 ibg-blue rounded-xl">
                  <Icon name="auto_awesome" size={20} className="ic-blue" />
                </div>
                <div>
                  <CardTitle className="text-base">{t('planDetails')}</CardTitle>
                  <CardDescription>{t('planDetailsDescription')}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit}>
                <FieldGroup className="gap-4">
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
                    {errors.teeth && <p className="text-xs text-destructive mt-1">{errors.teeth}</p>}
                  </Field>

                  {selectedTeeth.length > 0 && (
                    <Field>
                      <FieldLabel>{t('procedurePerTooth')}</FieldLabel>
                      <div className="space-y-2">
                        {selectedTeeth.map((tooth) => (
                          <div key={tooth} className="flex items-center gap-2">
                            <span className="w-10 shrink-0 text-sm font-semibold text-center bg-secondary/40 rounded-lg py-1.5">{tooth}</span>
                            <Select value={procedureByTooth[tooth] || "faceta"} onValueChange={(v) => setProcedure(tooth, v as CosmeticProcedureType)}>
                              <SelectTrigger className="rounded-xl flex-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {(Object.keys(procedureLabels) as CosmeticProcedureType[]).map((p) => (
                                  <SelectItem key={p} value={p}>{procedureLabels[p]}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    </Field>
                  )}

                  <Field>
                    <FieldLabel>{t('costLabel')}</FieldLabel>
                    <Input type="number" step="1" value={cost || ""} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} placeholder="0" className="rounded-xl" />
                  </Field>

                  <Field>
                    <FieldLabel>{t('notesLabel')}</FieldLabel>
                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder={t('notesPlaceholder')} rows={3} className="rounded-xl resize-none" />
                  </Field>

                  <div className="p-3 bg-secondary/40 rounded-xl text-xs text-muted-foreground">
                    {t('beforeAfterHint')}
                  </div>
                </FieldGroup>

                <div className="flex gap-3 mt-6">
                  <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">{t('cancel')}</Button>
                  <Button type="submit" disabled={saving} className="flex-1 bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
                    <Icon name="save" size={16} />
                    {saving ? t('saving') : t('savePlan')}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          <div className="space-y-4">
            <ToothChartSwitcher selectedTeeth={selectedTeeth} onTeethSelect={handleTeethSelect} />
          </div>
        </div>
      </div>
    </>
  )
}

export default function ShtoPlanKozmetik() {
  return (
    <Suspense fallback={<div className="flex-1 flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
      <AddCosmeticPlanContent />
    </Suspense>
  )
}
