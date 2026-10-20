"use client"

import { useState, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { getExchangeRate } from '@core/lib/api/settings'
import { setExchangeRate, fmtLEK } from '@core/lib/currency'
import { RefreshCw, TrendingUp, ArrowRight, Info } from 'lucide-react'
import { toast } from 'sonner'

const REFERENCE_AMOUNTS = [1, 5, 10, 20, 50, 100, 200, 500, 1000]

export function KursiSection() {
  const t = useTranslations('kursi-section')
  const [rate, setRate]             = useState<number | null>(null)
  const [cached, setCached]         = useState(false)
  const [fallback, setFallback]     = useState(false)
  const [fetchedAt, setFetchedAt]   = useState<Date | null>(null)
  const [loading, setLoading]       = useState(true)

  const load = useCallback(async (force = false) => {
    setLoading(true)
    try {
      const data = await getExchangeRate()
      setRate(data.eur_to_lek)
      setCached(data.cached)
      setFallback(!!data.fallback)
      setFetchedAt(new Date())
      setExchangeRate(data.eur_to_lek)
      if (force) toast.success("Kursi u përditësua")
    } catch {
      toast.error("Nuk u arrit të merret kursi")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const fmtTime = (d: Date) =>
    d.toLocaleTimeString("sq-AL", { hour: "2-digit", minute: "2-digit" }) +
    " · " +
    d.toLocaleDateString("sq-AL", { day: "2-digit", month: "long", year: "numeric" })

  return (
    <div className="space-y-6 max-w-2xl">

      {/* Main rate card */}
      <Card className="relative overflow-hidden border-border/50 shadow-sm">
        <div className="absolute top-0 left-0 right-0 h-[3px] bg-accent" />
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm text-muted-foreground font-medium mb-2">{t('currentRate')}</p>
              {loading ? (
                <div className="h-12 w-48 bg-secondary animate-pulse rounded-lg" />
              ) : (
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl font-bold text-foreground tracking-tight">
                    1 €
                  </span>
                  <ArrowRight className="h-5 w-5 text-muted-foreground shrink-0 mb-1" />
                  <span className="text-4xl font-bold text-accent tracking-tight">
                    {rate?.toLocaleString("sq-AL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                  </span>
                </div>
              )}

              {fetchedAt && !loading && (
                <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3" />
                  {t('updated', { time: fmtTime(fetchedAt) })}
                  {cached && <span className="chip-neutral px-1.5 py-0.5 rounded text-[10px] ml-1">{t('cache')}</span>}
                  {fallback && <span className="chip-amber px-1.5 py-0.5 rounded text-[10px] ml-1">{t('fallback')}</span>}
                </p>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => load(true)}
              disabled={loading}
              className="shrink-0 rounded-xl"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              {t('refresh')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Source info */}
      <div className="flex items-start gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-xl p-3">
        <Info className="h-3.5 w-3.5 shrink-0 mt-0.5 text-accent" />
        <p>
          {t.rich('sourceInfo', {
            bold: (chunks) => <span className="font-medium text-foreground">{chunks}</span>,
            mono: (chunks) => <span className="font-mono">{chunks}</span>,
          })}
        </p>
      </div>

      {/* Conversion reference table */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">{t('conversionTable')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left px-4 py-2.5 font-medium text-muted-foreground">EUR (€)</th>
                <th className="text-right px-4 py-2.5 font-medium text-muted-foreground">LEK (L)</th>
              </tr>
            </thead>
            <tbody>
              {REFERENCE_AMOUNTS.map((eur, i) => (
                <tr
                  key={eur}
                  className={`border-b border-border/30 last:border-0 ${i % 2 === 0 ? "" : "bg-secondary/30"}`}
                >
                  <td className="px-4 py-2.5 font-medium">
                    €{eur.toLocaleString("sq-AL")}
                  </td>
                  <td className="px-4 py-2.5 text-right text-accent font-semibold">
                    {rate
                      ? fmtLEK(Math.round(eur * rate))
                      : <span className="text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

    </div>
  )
}
