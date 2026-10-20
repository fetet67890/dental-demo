"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { AlertTriangle, RotateCcw, Sparkles, Loader2, ShieldAlert, Compass } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { getDemoResetStatus, restoreSampleData, type RestoreSampleDataResult } from "@core/lib/api/demo-reset"
import { WipeClinicButton } from "@core/components/settings/wipe-clinic-button"
import { useTour } from "@core/context/tour-context"
import { useAuth } from "@core/context/auth-context"

// Every demo-only tool in one place — nothing here exists in a real
// deployment (see ENABLE_DEMO_RESET below), which is also why the navbar no
// longer carries its own shortcuts to any of this: Topbar is meant to be a
// clean, 1:1 match with what a real clinic sees, so wipe/restore/tour-replay
// all live only here, reached through Profili → Sistemi → Demo. The wipe
// button/dialog itself lives in wipe-clinic-button.tsx (one shared
// implementation). The guided tour below is a real, non-demo feature (also
// on the main Profili page for every role, see profile-settings.tsx) —
// it's duplicated here purely for convenience, so a live sales demo never
// has to leave this one tab to reset both the data and the walkthrough.
export function DemoSection() {
  const t = useTranslations('demo-section')
  const tProfile = useTranslations('profile-settings')
  const { user } = useAuth()
  const { start: startTour } = useTour()
  const [enabled, setEnabled] = useState<boolean | null>(null)

  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [restoring, setRestoring] = useState(false)
  const [lastRestore, setLastRestore] = useState<RestoreSampleDataResult | null>(null)

  const loadStatus = useCallback(async () => {
    try {
      const { enabled } = await getDemoResetStatus()
      setEnabled(enabled)
    } catch {
      setEnabled(false)
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleRestore = async () => {
    setRestoring(true)
    try {
      const result = await restoreSampleData()
      setLastRestore(result)
      setRestoreDialogOpen(false)
      toast.success(t('restore.done'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setRestoring(false)
    }
  }

  if (enabled === null) {
    return <p className="text-sm text-muted-foreground">{t('loading')}</p>
  }

  if (!enabled) {
    return (
      <Card className="border-border/50 shadow-sm max-w-2xl">
        <CardContent className="p-5 lg:p-6 flex items-start gap-3">
          <ShieldAlert className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-foreground">{t('disabled.title')}</p>
            <p className="text-sm text-muted-foreground mt-1">{t('disabled.body')}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start gap-3 p-4 rounded-xl border border-[var(--p-amber)]/30 ibg-amber">
        <AlertTriangle className="h-5 w-5 ic-amber shrink-0 mt-0.5" />
        <p className="text-sm text-foreground">{t('bannerWarning')}</p>
      </div>

      <Card className="border-destructive/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <RotateCcw className="h-5 w-5" />
            {t('wipe.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('wipe.description')}</p>
          <p className="text-sm text-muted-foreground">{t('wipe.preserves')}</p>
          <WipeClinicButton variant="full" />
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-accent" />
            {t('restore.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('restore.description')}</p>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => setRestoreDialogOpen(true)}
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {t('restore.button')}
          </Button>
          {lastRestore && (
            <p className="text-xs text-muted-foreground">
              {t('restore.summary', {
                patients: lastRestore.patients,
                appointments: lastRestore.appointments,
                treatments: lastRestore.treatments,
                invoices: lastRestore.invoices,
                items: lastRestore.inventoryItems,
              })}
            </p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-5 w-5 text-accent" />
            {tProfile('guidedTour.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{tProfile('guidedTour.description')}</p>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => user && startTour(user.role)}
          >
            <Compass className="h-4 w-4 mr-2" />
            {tProfile('guidedTour.button')}
          </Button>
        </CardContent>
      </Card>

      <AlertDialog open={restoreDialogOpen} onOpenChange={(o) => !restoring && setRestoreDialogOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('restore.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('restore.confirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoring}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleRestore() }} disabled={restoring}>
              {restoring ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('restore.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
