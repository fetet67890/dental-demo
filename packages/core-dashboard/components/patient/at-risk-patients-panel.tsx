"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Badge } from '@core/components/ui/badge'
import { Button } from '@core/components/ui/button'
import { AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'
import { getAllPatientRisks, type PatientRisk } from '@core/lib/api/patient-risk'

// Shared between admin and recepsion Pacientët pages — used to live at its
// own /pacientet-ne-rrezik route, folded in here per request so at-risk
// patients surface right where staff are already looking, instead of a
// separate rarely-visited page.
export function AtRiskPatientsPanel({ basePath }: { basePath: string }) {
  const [risks, setRisks]     = useState<PatientRisk[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    getAllPatientRisks()
      .then(setRisks)
      .catch(() => toast.error('Gabim gjatë ngarkimit të rreziqeve'))
      .finally(() => setLoading(false))
  }, [])

  if (loading || risks.length === 0) return null

  const high   = risks.filter(r => r.level === 'larte')
  const medium = risks.filter(r => r.level === 'mesatar')

  return (
    <Card className="border-0 shadow-sm mb-6">
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 ic-amber" />
            Pacientë në Rrezik
            {high.length > 0 && <Badge variant="destructive">{high.length} lartë</Badge>}
            {medium.length > 0 && <Badge variant="secondary">{medium.length} mesatar</Badge>}
          </CardTitle>
          <Button variant="ghost" size="icon-sm">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </Button>
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="space-y-5">
          {[
            { label: 'Rrezik i Lartë', items: high, color: 'red' as const },
            { label: 'Rrezik Mesatar', items: medium, color: 'amber' as const },
          ].map(({ label, items, color }) => items.length > 0 && (
            <div key={label}>
              <p className={`text-xs font-semibold uppercase tracking-wide mb-2 ${color === 'red' ? 'ic-red' : 'ic-amber'}`}>
                {label}
              </p>
              <ul className="space-y-3">
                {items.map(risk => (
                  <li key={risk.patientId} className="border-b pb-3 last:border-0">
                    <Link href={`${basePath}/${risk.patientId}`} className="font-medium hover:underline">
                      {risk.patientName}
                    </Link>
                    <ul className="text-sm text-muted-foreground mt-1 space-y-0.5">
                      {risk.reasons.map((reason, i) => <li key={i}>· {reason}</li>)}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  )
}
