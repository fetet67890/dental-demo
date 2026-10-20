"use client"

import { AlertTriangle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface AllergyAlertProps {
  allergies?: string[]
}

export function AllergyAlert({ allergies }: AllergyAlertProps) {
  const t = useTranslations('allergy-alert')
  if (!allergies || allergies.length === 0) return null

  return (
    <div className="flex items-start gap-2.5 p-3 ibg-red border border-[var(--p-red)]/30 rounded-xl">
      <AlertTriangle className="h-4 w-4 ic-red shrink-0 mt-0.5" />
      <div className="min-w-0">
        <p className="text-xs font-semibold ic-red">{t('title')}</p>
        <p className="text-sm ic-red mt-0.5">{allergies.join(', ')}</p>
      </div>
    </div>
  )
}
