"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { getCosmeticPlans, deleteCosmeticPlan } from '@/lib/api/cosmetic-plans'
import type { CosmeticPlan, CosmeticProcedureType } from '@/types/specialty'
import { fmtLEK } from '@core/lib/currency'

interface CosmeticPlanPanelProps {
  // Embedded on a single patient's page: pass patientId, add-button links
  // pre-filled for that patient. Standalone "all my patients" view (the
  // doctor nav page): pass doctorId instead, patient name shown per row.
  patientId?: string
  doctorId?: string
}

export function CosmeticPlanPanel({ patientId, doctorId }: CosmeticPlanPanelProps) {
  const t = useTranslations('cosmetic-plan-panel')
  const PROCEDURE_LABELS: Record<CosmeticProcedureType, string> = {
    faceta:   t('procedures.faceta'),
    zbardhim: t('procedures.zbardhim'),
    bonding:  t('procedures.bonding'),
    tjeter:   t('procedures.tjeter'),
  }
  const [plans, setPlans]     = useState<CosmeticPlan[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    getCosmeticPlans(patientId ? { patientId } : doctorId ? { doctorId } : undefined)
      .then(setPlans)
      .catch(() => toast.error('Gabim gjatë ngarkimit të planeve kozmetike'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [patientId, doctorId])

  const remove = async (plan: CosmeticPlan) => {
    try {
      await deleteCosmeticPlan(plan.id)
      toast.success('Plani kozmetik u fshi')
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base">{t('title')}</CardTitle>
        {patientId && (
          <Link href={`/doktor/kozmetike/shto?pacient=${patientId}`}>
            <Button size="sm">{t('addPlan')}</Button>
          </Link>
        )}
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t('loading')}</p>
        ) : plans.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('empty')}</p>
        ) : (
          <ul className="space-y-4">
            {plans.map((plan) => (
              <li key={plan.id} className="border-b pb-4 last:border-0 last:pb-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-sm min-w-0">
                    <p className="font-medium">{!patientId && `${plan.patientName} · `}{fmtLEK(plan.cost)}</p>
                    {plan.notes && <p className="text-muted-foreground italic truncate">{plan.notes}</p>}
                  </div>
                  <Button size="sm" variant="outline" onClick={() => remove(plan)} className="shrink-0">{t('delete')}</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {plan.teeth.map((t) => (
                    <span key={t.id} className="text-xs px-2 py-1 rounded-lg bg-secondary/40">
                      {t.toothNumber} · {PROCEDURE_LABELS[t.procedureType]}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
