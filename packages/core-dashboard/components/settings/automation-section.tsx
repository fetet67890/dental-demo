"use client"

// Read side of the automation_runs table (see
// packages/core-api/src/utils/automationTracker.js) — the only place any of
// server-factory.js's unattended cron sweeps (recalls, debt alerts,
// appointment reminders, low stock, attendance anomalies, birthday
// greetings, mailbox sync, notification retries, plus whatever the
// specialty adds) were visible before was a console.error line inside
// Docker's rotating log driver.
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { RefreshCw, ChevronDown, Activity } from 'lucide-react'
import { cn } from '@core/lib/utils'
import { getLatestAutomationRuns, getAutomationRunHistory, type AutomationRun } from '@core/lib/api/automation'

function formatDuration(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`
}

export function AutomationSection() {
  const t = useTranslations('automation-section')
  const [runs, setRuns] = useState<AutomationRun[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [expanded, setExpanded] = useState<string | null>(null)
  const [history, setHistory] = useState<Record<string, AutomationRun[]>>({})
  const [historyLoading, setHistoryLoading] = useState<string | null>(null)

  function load(showSpinner: boolean) {
    if (showSpinner) setRefreshing(true)
    getLatestAutomationRuns()
      .then(setRuns)
      .catch(() => toast.error(t('loading')))
      .finally(() => { setLoading(false); setRefreshing(false) })
  }

  useEffect(() => { load(false) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function toggleHistory(jobName: string) {
    if (expanded === jobName) {
      setExpanded(null)
      return
    }
    setExpanded(jobName)
    if (!history[jobName]) {
      setHistoryLoading(jobName)
      try {
        const rows = await getAutomationRunHistory(jobName)
        setHistory((h) => ({ ...h, [jobName]: rows }))
      } finally {
        setHistoryLoading(null)
      }
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">{t('subtitle')}</p>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          {t('refresh')}
        </Button>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-4 lg:p-6">
          {loading ? (
            <p className="text-center py-12 text-muted-foreground">{t('loading')}</p>
          ) : runs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t('empty')}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {runs.map((run) => (
                <div key={run.jobName} className="rounded-xl border border-border/50 bg-secondary/30">
                  <button
                    type="button"
                    onClick={() => toggleHistory(run.jobName)}
                    className="w-full flex flex-col sm:flex-row sm:items-center gap-3 p-4 text-left"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className={cn('p-2 rounded-lg', run.status === 'success' ? 'bg-emerald-500/10' : 'bg-destructive/10')}>
                        <Activity className={cn('h-5 w-5', run.status === 'success' ? 'text-emerald-500' : 'text-destructive')} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-primary truncate">{run.jobName}</p>
                        {run.status === 'failure' && run.detail && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{run.detail}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 sm:ml-auto flex-shrink-0">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                          run.status === 'success' ? 'chip-green' : 'chip-red'
                        )}
                      >
                        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', run.status === 'success' ? 'dot-green' : 'dot-red')} />
                        {run.status === 'success' ? t('success') : t('failure')}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {t('lastRun')}: {new Date(run.startedAt).toLocaleString()}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {formatDuration(run.durationMs)}
                      </span>
                      <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', expanded === run.jobName && 'rotate-180')} />
                    </div>
                  </button>
                  {expanded === run.jobName && (
                    <div className="px-4 pb-4">
                      {historyLoading === run.jobName ? (
                        <p className="text-sm text-muted-foreground py-2">{t('loading')}</p>
                      ) : (history[run.jobName]?.length ?? 0) === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">{t('noHistory')}</p>
                      ) : (
                        <div className="rounded-lg border border-border/50 divide-y divide-border/50 overflow-hidden">
                          {history[run.jobName].map((h) => (
                            <div key={h.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                              <span className="text-muted-foreground whitespace-nowrap">{new Date(h.startedAt).toLocaleString()}</span>
                              <span className={cn('font-medium', h.status === 'success' ? 'text-emerald-500' : 'text-destructive')}>
                                {h.status === 'success' ? t('success') : t('failure')}
                              </span>
                              <span className="text-muted-foreground whitespace-nowrap">{formatDuration(h.durationMs)}</span>
                              {h.status === 'failure' && h.detail && (
                                <span className="text-muted-foreground truncate flex-1 text-right">{h.detail}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
