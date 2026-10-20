"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Info } from 'lucide-react'
import { getTreatmentStats, type TreatmentStats } from '@core/lib/api/treatments'
import { fmtLEK, fmtEUR } from '@core/lib/currency'
import type { Service } from '@core/types'

interface TreatmentEstimateProps {
  type: string
  service?: Service
}

// Plain statistical estimate — no AI/ML. Duration is just the catalog
// service's own `duration` (already loaded client-side, nothing to fetch);
// cost is a live historical average fetched from completed treatments
// sharing this exact type name (debounced while the doctor is still typing),
// so this is "what this actually cost before," not a prediction.
export function TreatmentEstimate({ type, service }: TreatmentEstimateProps) {
  const t = useTranslations('treatment-estimate')
  const [stats, setStats] = useState<TreatmentStats | null>(null)

  useEffect(() => {
    const trimmed = type.trim()
    if (!trimmed) { setStats(null); return }

    let cancelled = false
    const timer = setTimeout(() => {
      getTreatmentStats(trimmed)
        .then((s) => { if (!cancelled) setStats(s) })
        .catch(() => { if (!cancelled) setStats(null) })
    }, 500)

    return () => { cancelled = true; clearTimeout(timer) }
  }, [type])

  if (!type.trim()) return null

  return (
    <div className="flex items-start gap-2.5 p-3 ibg-blue border border-[var(--p-blue)]/30 rounded-xl">
      <Info className="h-4 w-4 ic-blue shrink-0 mt-0.5" />
      <div className="min-w-0 space-y-0.5">
        <p className="text-xs font-semibold ic-blue">{t('title')}</p>
        <p className="text-sm ic-blue">
          {t('typicalDuration')}{' '}
          {service ? t('durationFromCatalog', { duration: service.duration }) : t('chooseServiceHint')}
        </p>
        <p className="text-sm ic-blue">
          {stats && stats.count > 0
            ? t('averageCost', { cost: fmtLEK(stats.avgCost || 0), eur: fmtEUR(stats.avgCost || 0), count: stats.count })
            : t('notEnoughData')}
        </p>
      </div>
    </div>
  )
}
