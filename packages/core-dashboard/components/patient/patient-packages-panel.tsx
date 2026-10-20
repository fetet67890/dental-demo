'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Package, ShoppingCart, PlayCircle } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@core/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Field, FieldLabel } from '@core/components/ui/field'
import { useAuth } from '@core/context/auth-context'
import { useData } from '@core/context/data-context'
import { getServicePackages, type ServicePackage } from '@core/lib/api/service-packages'
import { getPackagePurchases, sellPackage, redeemPackageSession, type PackagePurchase } from '@core/lib/api/package-purchases'
import { fmtLEK } from '@core/lib/currency'
import { fmtDate } from '@core/lib/utils'

const STATUS_CHIP: Record<PackagePurchase['status'], string> = {
  active:    'chip-green',
  completed: 'chip-neutral',
  expired:   'chip-red',
}

export function PatientPackagesPanel({ patientId }: { patientId: string }) {
  const t = useTranslations('patient-packages-panel')
  const { user } = useAuth()
  const { staff } = useData()
  const doctors = staff.filter(s => s.role === 'mjek' && s.status === 'aktiv')

  const [purchases, setPurchases] = useState<PackagePurchase[]>([])
  const [catalog, setCatalog]     = useState<ServicePackage[]>([])
  const [loading, setLoading]     = useState(true)

  const [sellOpen, setSellOpen] = useState(false)
  const [selectedPackageId, setSelectedPackageId] = useState('')
  const [selling, setSelling] = useState(false)

  const [redeemTarget, setRedeemTarget] = useState<PackagePurchase | null>(null)
  const [redeemDoctorId, setRedeemDoctorId] = useState('')
  const [redeeming, setRedeeming] = useState(false)

  const load = async () => {
    try {
      const [p, c] = await Promise.all([
        getPackagePurchases(patientId),
        getServicePackages({ activeOnly: true }),
      ])
      setPurchases(p)
      setCatalog(c)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('loadError'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [patientId]) // eslint-disable-line react-hooks/exhaustive-deps

  const openSell = () => { setSelectedPackageId(''); setSellOpen(true) }

  const handleSell = async () => {
    if (!selectedPackageId) return
    setSelling(true)
    try {
      const purchase = await sellPackage(patientId, selectedPackageId)
      setPurchases(prev => [purchase, ...prev])
      toast.success(t('sellSuccess'))
      setSellOpen(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('sellError'))
    } finally {
      setSelling(false)
    }
  }

  const openRedeem = (purchase: PackagePurchase) => {
    // If a doctor is viewing this themselves, default to redeeming under
    // their own name — admin/recepsion still get the full picker since
    // they're acting on a doctor's behalf, not performing the session.
    setRedeemDoctorId(user?.role === 'mjek' ? user.id : '')
    setRedeemTarget(purchase)
  }

  const handleRedeem = async () => {
    if (!redeemTarget || !redeemDoctorId) return
    setRedeeming(true)
    try {
      const updated = await redeemPackageSession(redeemTarget.id, redeemDoctorId)
      setPurchases(prev => prev.map(p => p.id === updated.id ? updated : p))
      toast.success(t('redeemSuccess'))
      setRedeemTarget(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('redeemError'))
    } finally {
      setRedeeming(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground py-6 text-center">{t('loading')}</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">{t('heading')}</p>
        <Button size="sm" className="rounded-xl h-8 text-xs" onClick={openSell} disabled={catalog.length === 0}>
          <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
          {t('sellPackage')}
        </Button>
      </div>

      {purchases.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">{t('noPurchases')}</p>
      ) : (
        <div className="space-y-2">
          {purchases.map((p) => (
            <div key={p.id} className="rounded-xl border border-border p-3 flex items-start gap-3">
              <div className="h-9 w-9 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <Package className="h-4 w-4 text-accent" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">{p.packageName}</p>
                  <span className={`${STATUS_CHIP[p.status]} rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide`}>
                    {t(`status.${p.status}`)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {t('sessionsLine', { used: p.sessionsUsed, total: p.sessionsTotal, service: p.serviceName })}
                </p>
                <p className="text-xs text-muted-foreground/70">
                  {t('purchasedLine', { date: fmtDate(p.purchasedAt), price: fmtLEK(p.pricePaid) })}
                  {p.expiresAt ? ` · ${t('expiresLine', { date: fmtDate(p.expiresAt) })}` : ''}
                </p>
              </div>
              {p.status === 'active' && (
                <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={() => openRedeem(p)}>
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  {t('redeemSession')}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Sell package dialog */}
      <Dialog open={sellOpen} onOpenChange={setSellOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('sellDialog.title')}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel>{t('sellDialog.packageLabel')}</FieldLabel>
            <Select value={selectedPackageId} onValueChange={setSelectedPackageId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('sellDialog.packagePlaceholder')} /></SelectTrigger>
              <SelectContent>
                {catalog.map(pkg => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.name} — {fmtLEK(pkg.price)} ({t('sessionsShort', { count: pkg.sessionCount })})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSellOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleSell} disabled={!selectedPackageId || selling}>
              {selling ? t('selling') : t('sellDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Redeem session dialog */}
      <Dialog open={!!redeemTarget} onOpenChange={(o) => !o && setRedeemTarget(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('redeemDialog.title')}</DialogTitle>
          </DialogHeader>
          <Field>
            <FieldLabel>{t('redeemDialog.doctorLabel')}</FieldLabel>
            <Select value={redeemDoctorId} onValueChange={setRedeemDoctorId}>
              <SelectTrigger className="rounded-xl"><SelectValue placeholder={t('redeemDialog.doctorPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {doctors.map(d => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedeemTarget(null)}>{t('cancel')}</Button>
            <Button onClick={handleRedeem} disabled={!redeemDoctorId || redeeming}>
              {redeeming ? t('redeeming') : t('redeemDialog.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
