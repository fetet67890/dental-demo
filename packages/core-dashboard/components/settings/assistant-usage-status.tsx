"use client"

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Progress } from '@core/components/ui/progress'
import { Badge } from '@core/components/ui/badge'
import { Gauge } from 'lucide-react'
import { getAssistantUsageStatus, type AssistantUsageStatus } from '@core/lib/api/assistant'

export function AssistantUsageStatusCard() {
  const [status, setStatus] = useState<AssistantUsageStatus | null>(null)
  const [loading, setLoading] = useState(true)

  // Refreshes periodically so the bar/usage stay live while this card is
  // open, instead of only updating on a full page reload — same pattern as
  // the compact topbar badge (AssistantUsageBadge), just on a shorter
  // interval since this is the detailed view someone's actively looking at.
  useEffect(() => {
    let cancelled = false
    const load = () =>
      getAssistantUsageStatus()
        .then(u => { if (!cancelled) setStatus(u) })
        .catch(() => { if (!cancelled) setStatus(null) })
        .finally(() => { if (!cancelled) setLoading(false) })
    load()
    const interval = setInterval(load, 15000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (loading) return null
  if (!status) return null

  const isPremium = status.tier === 'premium'
  const percent = status.percentUsed ?? 0
  // Full literal class strings (not concatenated) so Tailwind's static scanner picks them up.
  const barColorClass =
    percent >= 90 ? '[&>div]:bg-destructive' :
    percent >= 70 ? '[&>div]:bg-foreground/60' :
    '[&>div]:bg-foreground'

  return (
    <Card className="border-0 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-5 w-5 text-accent" />
          Përdorimi i Asistentit AI
          <Badge variant={isPremium ? 'default' : 'outline'} className="ml-auto">
            {isPremium ? 'Premium' : 'Falas (testim)'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Modeli aktual: <span className="font-mono">{status.model}</span>
        </p>

        {status.tier === 'free' ? (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Kërkesa sot: <strong className="text-foreground">{status.requestsToday}</strong>
                {status.dailyLimit ? ` / ${status.dailyLimit}` : ' (limiti ditor i panjohur për këtë model)'}
              </span>
              <span className="text-xs text-muted-foreground">{status.requestsLastMinute} në minutën e fundit</span>
            </div>
            {status.dailyLimit && <Progress value={status.percentUsed ?? 0} className={barColorClass} />}
            <p className="text-xs text-muted-foreground">
              Nivelet falas janë vetëm për testim — kufizohen nga vetë ofruesi (Google), jo nga Hypocrates.
            </p>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Shpenzuar këtë muaj: <strong className="text-foreground">${status.spentThisMonthUSD.toFixed(2)}</strong>
                {status.monthlyCapUSD ? ` / $${status.monthlyCapUSD.toFixed(2)}` : ' (pa limit të vendosur)'}
              </span>
            </div>
            {status.monthlyCapUSD && <Progress value={status.percentUsed ?? 0} className={barColorClass} />}
            <p className="text-xs text-muted-foreground">
              Kur arrihet limiti mujor, Asistenti AI ndalon plotësisht deri në muajin e ardhshëm — nuk kalon vetvetiu te një model falas.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  )
}
