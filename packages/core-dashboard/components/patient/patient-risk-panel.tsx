"use client"

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { getPatientRisk, type PatientRisk } from '@core/lib/api/patient-risk'
import { cn } from '@core/lib/utils'

interface PatientRiskPanelProps {
  patientId: string
  className?: string
}

// Quiet by default — renders nothing for 'ulet' (low/no signal) so this
// doesn't clutter every patient view, only surfaces when there's actually
// something worth a doctor/reception's attention. Plain rule-based scoring,
// not AI/ML — see patient-risk.js on the backend for the exact point system.
export function PatientRiskPanel({ patientId, className }: PatientRiskPanelProps) {
  const [risk, setRisk] = useState<PatientRisk | null>(null)

  useEffect(() => {
    let cancelled = false
    getPatientRisk(patientId)
      .then((r) => { if (!cancelled) setRisk(r) })
      .catch(() => { if (!cancelled) setRisk(null) })
    return () => { cancelled = true }
  }, [patientId])

  if (!risk || risk.level === 'ulet') return null

  const isHigh = risk.level === 'larte'

  return (
    <div
      className={cn(
        'flex items-start gap-2.5 p-3 rounded-xl border',
        isHigh
          ? 'ibg-red border-[var(--p-red)]/30'
          : 'ibg-amber border-[var(--p-amber)]/30',
        className
      )}
    >
      <AlertTriangle className={isHigh ? 'h-4 w-4 ic-red shrink-0 mt-0.5' : 'h-4 w-4 ic-amber shrink-0 mt-0.5'} />
      <div className="min-w-0">
        <p className={isHigh ? 'text-xs font-semibold ic-red' : 'text-xs font-semibold ic-amber'}>
          Pacient me Rrezik {isHigh ? 'të Lartë' : 'Mesatar'}
        </p>
        <ul className={isHigh ? 'text-sm ic-red mt-0.5 space-y-0.5' : 'text-sm ic-amber mt-0.5 space-y-0.5'}>
          {risk.reasons.map((reason, i) => <li key={i}>· {reason}</li>)}
        </ul>
      </div>
    </div>
  )
}
