"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { Building2, Home, Loader2 } from "lucide-react"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import { Button } from "@core/components/ui/button"
import { toast } from "sonner"
import { setWorkMode, getMyAttendance, type AttendanceRecord, type WorkMode } from "@core/lib/api/attendance"

interface WorkModePromptProps {
  open: boolean
  onAnswered: (record: AttendanceRecord) => void
}

export function WorkModePrompt({ open, onAnswered }: WorkModePromptProps) {
  const t = useTranslations('work-mode-prompt')
  const [submitting, setSubmitting] = useState<WorkMode | 'skip' | null>(null)

  const choose = async (mode: WorkMode | 'skip') => {
    setSubmitting(mode)
    try {
      const record = await setWorkMode(mode)
      onAnswered(record)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      // This dialog has no close button and blocks Escape/click-outside on
      // purpose (it's meant to be answered, not dismissed) — which is
      // exactly what turns "the backend says today was already answered"
      // into a trap if that ever happens anyway (stale local state, another
      // tab already answering, a caller that reopens this after a skip —
      // see topbar.tsx's own fix for the main way that used to happen).
      // Recovering with today's real record and completing the flow as if
      // that answer is the one that applies beats leaving the user stuck
      // behind a dialog with no way out but an error toast.
      if (message.includes('zgjedhur tashmë')) {
        try {
          const fresh = await getMyAttendance()
          if (fresh) { onAnswered(fresh); return }
        } catch { /* fall through to the generic error below */ }
      }
      toast.error(message || t('error'))
    } finally {
      setSubmitting(null)
    }
  }

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-sm" showCloseButton={false} onInteractOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 py-2">
          <button
            onClick={() => choose('fizik')}
            disabled={!!submitting}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50"
          >
            {submitting === 'fizik' ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <Building2 className="h-6 w-6 text-accent" />}
            <span className="text-sm font-medium">{t('physical')}</span>
          </button>
          <button
            onClick={() => choose('largesi')}
            disabled={!!submitting}
            className="flex flex-col items-center gap-2 p-4 rounded-xl border border-border hover:border-accent hover:bg-accent/5 transition-colors disabled:opacity-50"
          >
            {submitting === 'largesi' ? <Loader2 className="h-6 w-6 animate-spin text-accent" /> : <Home className="h-6 w-6 text-accent" />}
            <span className="text-sm font-medium">{t('remote')}</span>
          </button>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => choose('skip')} disabled={!!submitting} className="w-full text-muted-foreground">
            {submitting === 'skip' ? t('skipping') : t('skip')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
