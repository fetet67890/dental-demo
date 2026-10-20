"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { RotateCcw, Loader2 } from "lucide-react"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { getDemoResetStatus, wipeClinicData } from "@core/lib/api/demo-reset"
import { useAuth } from "@core/context/auth-context"

const CONFIRM_PHRASE = "FSHIJE"

// The wipe trigger + its type-to-confirm dialog, factored out of
// demo-section.tsx so the exact same button/flow can also sit in the
// navbar (Topbar, admin-only slot that used to be the tour restart icon) —
// one canonical implementation of a genuinely irreversible action, not two
// copies that could drift apart. Renders nothing at all if the server-side
// gate (ENABLE_DEMO_RESET) is off, in either variant.
export function WipeClinicButton({ variant = 'full' }: { variant?: 'full' | 'icon' }) {
  const t = useTranslations('demo-section')
  const { logout } = useAuth()
  const [enabled, setEnabled] = useState<boolean | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [wiping, setWiping] = useState(false)

  const loadStatus = useCallback(async () => {
    try {
      const { enabled } = await getDemoResetStatus()
      setEnabled(enabled)
    } catch {
      setEnabled(false)
    }
  }, [])

  useEffect(() => { loadStatus() }, [loadStatus])

  const handleWipe = async () => {
    if (confirmText !== CONFIRM_PHRASE) return
    setWiping(true)
    try {
      await wipeClinicData()
      // See demo-section.tsx's original comment: logs out on purpose rather
      // than reloading in place — the account survives (users is a
      // preserved table), but the setup wizard is only meant to reappear
      // right after a genuine fresh login, not an arbitrary reload while
      // still authenticated.
      logout()
      window.location.replace('/hyrje')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
      setWiping(false)
    }
  }

  if (!enabled) return null

  const openDialog = () => { setConfirmText(''); setDialogOpen(true) }

  return (
    <>
      {variant === 'icon' ? (
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={openDialog}
          aria-label={t('wipe.button')}
          title={t('wipe.button')}
          className="hidden sm:flex w-9 h-9"
        >
          <RotateCcw className="h-5 w-5 text-destructive" />
        </Button>
      ) : (
        <Button type="button" variant="destructive" className="rounded-xl" onClick={openDialog}>
          <RotateCcw className="h-4 w-4 mr-2" />
          {t('wipe.button')}
        </Button>
      )}

      <AlertDialog open={dialogOpen} onOpenChange={(o) => !wiping && setDialogOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">{t('wipe.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>{t('wipe.confirmBody')}</AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <label className="text-xs font-medium text-muted-foreground">
              {t('wipe.confirmInputLabel', { phrase: CONFIRM_PHRASE })}
            </label>
            <Input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder={CONFIRM_PHRASE}
              autoFocus
              className="font-mono"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={wiping}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleWipe() }}
              disabled={confirmText !== CONFIRM_PHRASE || wiping}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {wiping ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('wipe.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
