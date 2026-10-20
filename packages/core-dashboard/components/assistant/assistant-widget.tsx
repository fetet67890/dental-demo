"use client"

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { useTranslations, useLocale } from 'next-intl'
import { MessageCircle, X, Send, Trash2 } from 'lucide-react'
import { Button } from '@core/components/ui/button'
import { Textarea } from '@core/components/ui/textarea'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@core/components/ui/alert-dialog'
import { sendAssistantMessage, getAssistantUsageStatus, type PendingDeleteAction, type AssistantUsageStatus } from '@core/lib/api/assistant'
import { getIntegrations } from '@core/lib/api/integrations'
import { deletePatient } from '@core/lib/api/patients'
import { deleteAppointment } from '@core/lib/api/appointments'
import { deleteTreatment } from '@core/lib/api/treatments'
import { deletePrescription } from '@core/lib/api/prescriptions'
import { deleteInvoice } from '@core/lib/api/invoices'
import { deleteService } from '@core/lib/api/services'
import { deleteRoom } from '@core/lib/api/rooms'
import { deleteClinic } from '@core/lib/api/clinics'
import { deleteInventoryItem } from '@core/lib/api/inventory'
import { deleteInstallmentPlan } from '@core/lib/api/installments'
import { deletePatientService } from '@core/lib/api/patient-services'
import { deleteFollowup } from '@core/lib/api/treatment-followups'
import { deleteFollowupTemplate } from '@core/lib/api/followup-templates'
import { deleteOrthoStageTemplate } from '@core/lib/api/ortho-stage-templates'
import { deleteFaqEntry } from '@core/lib/api/faq'
import { deleteClinicDocument } from '@core/lib/api/clinic-documents'
import { deleteDocument } from '@core/lib/api/documents'
import { deleteOrthoProgression } from '@core/lib/api/ortho-progressions'
import { deleteTestimonial } from '@core/lib/api/testimonials'
import { deleteBlogPost } from '@core/lib/api/blog-posts'
import { deleteGalleryImage } from '@core/lib/api/gallery'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { usePresence } from '@core/hooks/use-presence'
import { cn } from '@core/lib/utils'
import type { AssistantMessage } from '@core/types'
import { useSpecialtyConfig } from '../../context/specialty-config-context'

interface DisplayMessage {
  role: 'user' | 'assistant'
  text: string
  pendingAction?: PendingDeleteAction | null
  actionHandled?: boolean
}

// Every entry here calls the exact same REST endpoint (and hits the exact
// same audit/notification path) a human clicking the real "Fshi" button
// elsewhere in the app would — the assistant never deletes anything itself,
// it only ever proposes a target (see delete_* tools in assistant-tools.js).
// A specialty's own entity types (Dental's implant_plan/cosmetic_plan/
// periodontal_record, etc.) are NOT listed here — they're merged in from
// useSpecialtyConfig().entityDeleteHandlers inside the component below, so
// this file never needs a case added for a new specialty's entities.
const GENERIC_DELETE_FNS: Record<string, (id: string) => Promise<unknown>> = {
  patient:        deletePatient,
  appointment:    deleteAppointment,
  treatment:      deleteTreatment,
  prescription:   deletePrescription,
  invoice:        deleteInvoice,
  service:        deleteService,
  room:           deleteRoom,
  clinic:         deleteClinic,
  inventory_item: deleteInventoryItem,
  installment_plan:     deleteInstallmentPlan,
  patient_service:      deletePatientService,
  treatment_followup:   deleteFollowup,
  followup_template:    deleteFollowupTemplate,
  ortho_stage_template: deleteOrthoStageTemplate,
  faq_entry:            deleteFaqEntry,
  clinic_document:      deleteClinicDocument,
  patient_document:     deleteDocument,
  ortho_progression:    deleteOrthoProgression,
  testimonial:          deleteTestimonial,
  blog_post:            deleteBlogPost,
  gallery_image:        deleteGalleryImage,
}

export function AssistantWidget() {
  const t = useTranslations('assistant-widget')
  const locale = useLocale()
  const { entityDeleteHandlers } = useSpecialtyConfig()

  const SUGGESTIONS = [
    t('suggestions.activePatients'),
    t('suggestions.searchPatient'),
    t('suggestions.appointmentsToday'),
    t('suggestions.addPatient'),
  ]

  // Merged once per render with whatever this specialty registers — see
  // GENERIC_DELETE_FNS's own comment above for why the specialty entries
  // aren't named in this file.
  const DELETE_FNS: Record<string, (id: string) => Promise<unknown>> = {
    ...GENERIC_DELETE_FNS,
    ...Object.fromEntries(entityDeleteHandlers.map(h => [h.entityType, h.deleteFn])),
  }

  const ENTITY_LABEL: Record<string, string> = {
    patient:        t('entityLabel.patient'),
    appointment:    t('entityLabel.appointment'),
    treatment:      t('entityLabel.treatment'),
    prescription:   t('entityLabel.prescription'),
    invoice:        t('entityLabel.invoice'),
    service:        t('entityLabel.service'),
    room:           t('entityLabel.room'),
    clinic:         t('entityLabel.clinic'),
    inventory_item: t('entityLabel.inventoryItem'),
    installment_plan:     t('entityLabel.installmentPlan'),
    patient_service:      t('entityLabel.patientService'),
    treatment_followup:   t('entityLabel.treatmentFollowup'),
    followup_template:    t('entityLabel.followupTemplate'),
    ortho_stage_template: t('entityLabel.orthoStageTemplate'),
    faq_entry:            t('entityLabel.faqEntry'),
    clinic_document:      t('entityLabel.clinicDocument'),
    patient_document:     t('entityLabel.patientDocument'),
    ortho_progression:    t('entityLabel.orthoProgression'),
    testimonial:          t('entityLabel.testimonial'),
    blog_post:            t('entityLabel.blogPost'),
    gallery_image:        t('entityLabel.galleryImage'),
    ...Object.fromEntries(entityDeleteHandlers.map(h => [h.entityType, t(h.labelKey)])),
  }

  const [open, setOpen]         = useState(false)
  const [history, setHistory]   = useState<AssistantMessage[]>([])
  const [display, setDisplay]   = useState<DisplayMessage[]>([])
  const [input, setInput]       = useState('')
  const [sending, setSending]   = useState(false)
  const [unavailable, setUnavailable] = useState(true)
  const [checkingConfig, setCheckingConfig] = useState(true)
  const [usage, setUsage] = useState<AssistantUsageStatus | null>(null)
  const { chatbotIconUrl } = useClinicSettings()
  const bottomRef = useRef<HTMLDivElement>(null)
  // Keeps the panel mounted through its own exit animation instead of the
  // plain `{open && <div>}` cut — see hooks/use-presence.ts.
  const panelMounted = usePresence(open, 200)

  // Two-stage delete confirmation — on top of the assistant's own text
  // warning, this is warnings #2 and #3. Nothing is deleted until both are
  // explicitly confirmed.
  const [confirmTarget, setConfirmTarget] = useState<{ action: PendingDeleteAction; messageIndex: number } | null>(null)
  const [confirmStage, setConfirmStage]   = useState<1 | 2 | null>(null)
  const [deleting, setDeleting]           = useState(false)

  useEffect(() => {
    if (!open) return
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [display, open])

  useEffect(() => {
    getIntegrations()
      .then(items => setUnavailable(!items.find(i => i.key === 'anthropic_api_key')?.configured))
      .catch(() => setUnavailable(true))
      .finally(() => setCheckingConfig(false))
  }, [])

  useEffect(() => {
    if (!open) return
    getAssistantUsageStatus().then(setUsage).catch(() => setUsage(null))
  }, [open])

  const send = async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || sending) return

    setDisplay(d => [...d, { role: 'user', text: trimmed }])
    setInput('')
    setSending(true)

    const nextHistory: AssistantMessage[] = [...history, { role: 'user', content: trimmed }]
    try {
      const res = await sendAssistantMessage(nextHistory, locale)
      setHistory(res.messages)
      setDisplay(d => [...d, { role: 'assistant', text: res.reply, pendingAction: res.pendingAction }])
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Gabim gjatë komunikimit me Asistentin AI'
      if (message.includes('konfiguruar')) setUnavailable(true)
      toast.error(message)
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send(input)
    }
  }

  const startDeleteFlow = (action: PendingDeleteAction, messageIndex: number) => {
    setConfirmTarget({ action, messageIndex })
    setConfirmStage(1)
  }

  const cancelDeleteFlow = () => {
    setConfirmTarget(null)
    setConfirmStage(null)
  }

  const performDelete = async () => {
    if (!confirmTarget) return
    setDeleting(true)
    try {
      await DELETE_FNS[confirmTarget.action.entityType](confirmTarget.action.entityId)
      toast.success(`U fshi: ${confirmTarget.action.label}`)
      setDisplay(d => d.map((m, i) => i === confirmTarget.messageIndex ? { ...m, actionHandled: true } : m))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    } finally {
      setDeleting(false)
      cancelDeleteFlow()
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(o => !o)}
        size="icon-lg"
        variant="accent"
        aria-label={open ? t('closeAssistant') : t('openAssistant')}
        data-tour="assistant-widget"
        className="fixed bottom-20 right-4 sm:bottom-6 sm:right-6 z-[65] rounded-full shadow-xl"
      >
        {open ? (
          <X className="h-5 w-5" />
        ) : chatbotIconUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={chatbotIconUrl} alt="" className="h-7 w-7 object-contain rounded-full" />
        ) : (
          <MessageCircle className="h-5 w-5" />
        )}
      </Button>

      {panelMounted && (
        <div
          data-slot="assistant-panel"
          data-state={open ? 'open' : 'closed'}
          className={cn(
            'fixed bottom-36 left-4 right-4 sm:bottom-24 sm:left-auto sm:right-6 z-[65] sm:w-96 h-[28rem] max-h-[65vh]',
            'bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden origin-bottom-right',
            // Materialize in/out (matches the dialog/popover treatment
            // elsewhere) — under .theme-glass this surface also picks up the
            // same blur-in + light-sheen as every other floating panel (see
            // globals.css, [data-slot="assistant-panel"] added to that family).
            'duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
            'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
            'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-bottom-4',
          )}
        >
          <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between shrink-0">
            <div>
              <p className="text-sm font-semibold text-foreground">{t('header.title')}</p>
              <p className="text-xs text-muted-foreground">
                {usage?.tier === 'free' && t('header.freeUsage', { requestsToday: usage.requestsToday, dailyLimit: usage.dailyLimit || 0, hasLimit: usage.dailyLimit ? 'yes' : 'no' })}
                {usage?.tier === 'premium' && t('header.premiumUsage', { spent: usage.spentThisMonthUSD.toFixed(2), cap: usage.monthlyCapUSD ? usage.monthlyCapUSD.toFixed(2) : '', hasCap: usage.monthlyCapUSD ? 'yes' : 'no' })}
                {!usage && t('header.internalAssistant')}
              </p>
            </div>
            <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground" aria-label={t('close')}>
              <X className="h-4 w-4" />
            </button>
          </div>

          {!checkingConfig && unavailable && (
            <div className="px-4 py-2.5 text-xs text-muted-foreground border-b border-border/50 flex items-center justify-between gap-2 shrink-0">
              <span>{t('notConfigured')}</span>
              <Link href="/admin/profili?section=konfigurimi&sub=integrimet" onClick={() => setOpen(false)}>
                <Button size="sm" variant="outline" className="h-7 text-xs">{t('integrations')}</Button>
              </Link>
            </div>
          )}

          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {display.length === 0 && (
              <div className="text-xs text-muted-foreground space-y-2">
                <p>{t('tryOneOfThese')}</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUGGESTIONS.map(s => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-[11px] px-2.5 py-1 rounded-full border hover:bg-accent/10 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {display.map((m, i) => (
              <div key={i} className={cn('flex flex-col', m.role === 'user' ? 'items-end' : 'items-start')}>
                <div className={cn(
                  'max-w-[85%] rounded-2xl px-3 py-2 text-xs whitespace-pre-wrap',
                  m.role === 'user' ? 'bg-primary text-primary-foreground' : 'bg-muted'
                )}>
                  {m.text}
                </div>
                {m.pendingAction && !m.actionHandled && (
                  <Button
                    size="sm"
                    variant="destructive"
                    className="mt-1.5 h-7 text-[11px] gap-1.5 max-w-[85%]"
                    onClick={() => startDeleteFlow(m.pendingAction!, i)}
                  >
                    <Trash2 className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{t('deletePrefix')}: {m.pendingAction.label}</span>
                  </Button>
                )}
                {m.actionHandled && (
                  <p className="mt-1 text-[10px] text-muted-foreground italic">✓ {t('deleted')}</p>
                )}
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="max-w-[85%] rounded-2xl px-3 py-2 text-xs bg-muted text-muted-foreground">
                  {t('thinking')}
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border/50 p-2.5 flex items-end gap-2 shrink-0">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={unavailable ? t('placeholderUnavailable') : t('placeholder')}
              disabled={unavailable}
              className="min-h-[38px] max-h-24 resize-none text-xs"
              rows={1}
            />
            <Button
              size="icon-sm"
              className="shrink-0"
              onClick={() => send(input)}
              disabled={sending || unavailable || !input.trim()}
              aria-label={t('send')}
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Warning #2 */}
      <AlertDialog open={confirmStage === 1} onOpenChange={(o) => { if (!o) cancelDeleteFlow() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirmDelete.title', { entity: confirmTarget ? ENTITY_LABEL[confirmTarget.action.entityType] : '' })}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirmDelete.prefix')} <strong>{confirmTarget?.action.label}</strong>? {t('confirmDelete.suffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteFlow}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); setConfirmStage(2) }}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t('continue')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Warning #3 — final confirmation */}
      <AlertDialog open={confirmStage === 2} onOpenChange={(o) => { if (!o) cancelDeleteFlow() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('finalConfirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('finalConfirm.intro')} <strong>{confirmTarget?.action.label}</strong> {t('finalConfirm.outro')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelDeleteFlow} disabled={deleting}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); performDelete() }}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {deleting ? t('deleting') : t('deletePermanently')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
