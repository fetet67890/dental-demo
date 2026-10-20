"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { Progress } from '@core/components/ui/progress'
import { getAssistantUsageStatus, type AssistantUsageStatus } from '@core/lib/api/assistant'

// Compact topbar indicator — the full breakdown lives in Integrimet
// (AssistantUsageStatusCard); this is just an at-a-glance pill so staff never
// have to go looking for it. Refreshes every 60s so it stays roughly live
// while the dashboard is open. Links to Integrimet for admins only — that's
// the only role with a working "integrimet" section on their profili page.
export function AssistantUsageBadge() {
  const t = useTranslations('assistant-usage-badge')
  const { user } = useAuth()
  const [usage, setUsage] = useState<AssistantUsageStatus | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = () => getAssistantUsageStatus().then(u => { if (!cancelled) setUsage(u) }).catch(() => { if (!cancelled) setUsage(null) })
    load()
    const interval = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  if (!usage) return null

  const percent = usage.percentUsed ?? 0
  // Full literal class strings (not concatenated) so Tailwind's static scanner picks them up.
  const barColorClass =
    percent >= 90 ? '[&>div]:bg-destructive' :
    percent >= 70 ? '[&>div]:bg-foreground/70' :
    '[&>div]:bg-foreground/40'
  const label = usage.tier === 'free'
    ? `${usage.requestsToday}${usage.dailyLimit ? `/${usage.dailyLimit}` : ''}`
    : `$${usage.spentThisMonthUSD.toFixed(0)}${usage.monthlyCapUSD ? `/$${usage.monthlyCapUSD.toFixed(0)}` : ''}`

  const content = (
    <div
      className="hidden md:flex h-9 items-center gap-2 px-2.5 rounded-xl bg-secondary/60 text-xs font-medium text-muted-foreground shrink-0 transition-colors hover:bg-secondary"
      title={t('title', { tier: usage.tier === 'free' ? t('freeTrial') : t('premium'), model: usage.model })}
    >
      <span className="material-symbols-outlined select-none leading-none" style={{ fontSize: 15 }}>smart_toy</span>
      <Progress value={percent} className={`h-1.5 w-14 bg-secondary ${barColorClass}`} />
      <span className="tabular-nums">{label}</span>
    </div>
  )

  if (user?.role !== 'admin') return content

  return <Link href="/admin/profili?section=konfigurimi&sub=integrimet">{content}</Link>
}
