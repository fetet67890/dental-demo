"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Label } from '@core/components/ui/label'
import { Input } from '@core/components/ui/input'
import { Button } from '@core/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@core/components/ui/tabs'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@core/components/ui/dialog'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@core/components/ui/table'
import { Percent, CheckCircle2, BadgeCheck } from 'lucide-react'
import { fmtLEK } from '@core/lib/currency'
import { fmtDate } from '@core/lib/utils'
import { getClinicSettings, setCommissionBasis } from '@core/lib/api/settings'
import { getCommissions, createCommissionPayout, type StaffCommission } from '@core/lib/api/commissions'

function currentMonthValue() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthToRange(month: string) {
  const [y, m] = month.split('-').map(Number)
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(y, m, 0).getDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

export function CommissionsSection() {
  const t = useTranslations('admin-komisionet')
  const [month, setMonth] = useState(currentMonthValue())
  const [basis, setBasis] = useState<'cost' | 'payment'>('cost')
  const [savingBasis, setSavingBasis] = useState(false)
  const [rows, setRows] = useState<StaffCommission[]>([])
  const [loading, setLoading] = useState(true)
  const [payTarget, setPayTarget] = useState<StaffCommission | null>(null)
  const [paying, setPaying] = useState(false)

  useEffect(() => {
    getClinicSettings().then(s => setBasis((s.commission_basis as 'cost' | 'payment') || 'cost')).catch(() => {})
  }, [])

  const load = () => {
    setLoading(true)
    const { from, to } = monthToRange(month)
    getCommissions(from, to)
      .then(res => { setRows(res.staff); setBasis(res.basis) })
      .catch(() => toast.error(t('loadError')))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [month]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleBasisChange = async (value: 'cost' | 'payment') => {
    setSavingBasis(true)
    try {
      await setCommissionBasis(value)
      setBasis(value)
      toast.success(t('basisSaved'))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setSavingBasis(false)
    }
  }

  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0)
  const totalCommission = rows.reduce((sum, r) => sum + r.commission, 0)

  const handlePay = async () => {
    if (!payTarget) return
    setPaying(true)
    try {
      const { from, to } = monthToRange(month)
      const payout = await createCommissionPayout(payTarget.staffId, from, to)
      setRows(prev => prev.map(r => r.staffId === payTarget.staffId
        ? { ...r, payoutId: payout.id, paidAt: payout.paidAt }
        : r))
      toast.success(t('paySuccess'))
      setPayTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('payError'))
    } finally {
      setPaying(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>{t('period')}</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="w-40" />
            </div>
            <div className="space-y-1.5">
              <Label>{t('basisLabel')}</Label>
              <Tabs value={basis} onValueChange={(v) => handleBasisChange(v as 'cost' | 'payment')}>
                <TabsList>
                  <TabsTrigger value="cost" disabled={savingBasis}>{t('basisCost')}</TabsTrigger>
                  <TabsTrigger value="payment" disabled={savingBasis}>{t('basisPayment')}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">{basis === 'cost' ? t('basisCostHint') : t('basisPaymentHint')}</p>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <p className="text-sm text-muted-foreground p-6 text-center">{t('loading')}</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground p-6 text-center">{t('empty')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.staff')}</TableHead>
                    <TableHead>{t('table.rateType')}</TableHead>
                    <TableHead className="text-right">{t('table.serviceCount')}</TableHead>
                    <TableHead className="text-right">{t('table.revenue')}</TableHead>
                    <TableHead className="text-right">{t('table.commission')}</TableHead>
                    <TableHead className="text-right">{t('table.payout')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map(r => (
                    <TableRow key={r.staffId}>
                      <TableCell className="font-medium">{r.staffName}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.rateType === 'flat'
                          ? t('table.flatWithRate', { rate: r.rate ?? 0 })
                          : t('table.perService')}
                      </TableCell>
                      <TableCell className="text-right">{r.serviceCount}</TableCell>
                      <TableCell className="text-right">{fmtLEK(r.revenue)}</TableCell>
                      <TableCell className="text-right font-semibold ic-green flex items-center justify-end gap-1">
                        <Percent className="h-3.5 w-3.5" />{fmtLEK(r.commission)}
                      </TableCell>
                      <TableCell className="text-right">
                        {r.paidAt ? (
                          <span className="chip-green rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide inline-flex items-center gap-1">
                            <BadgeCheck className="h-3 w-3" />{t('table.paidOn', { date: fmtDate(r.paidAt) })}
                          </span>
                        ) : r.commission > 0 ? (
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setPayTarget(r)}>
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                            {t('table.markPaid')}
                          </Button>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-secondary/40 font-semibold">
                    <TableCell colSpan={3}>{t('table.total')}</TableCell>
                    <TableCell className="text-right">{fmtLEK(totalRevenue)}</TableCell>
                    <TableCell className="text-right ic-green">{fmtLEK(totalCommission)}</TableCell>
                    <TableCell />
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!payTarget} onOpenChange={(o) => !o && setPayTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('payDialog.title')}</DialogTitle>
            <DialogDescription>
              {payTarget && t('payDialog.description', { name: payTarget.staffName, amount: fmtLEK(payTarget.commission) })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayTarget(null)}>{t('cancel')}</Button>
            <Button onClick={handlePay} disabled={paying}>
              {paying ? t('paying') : t('payDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
