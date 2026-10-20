"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@core/components/ui/dialog"
import { Button } from "@core/components/ui/button"
import { Textarea } from "@core/components/ui/textarea"
import { ScrollArea } from "@core/components/ui/scroll-area"
import { Brain, Plus, Calendar, Loader2 } from "lucide-react"
import type { Patient } from "@core/types"

const MEMORY_PREFIX = "[MEMORIE]"

interface PatientMemoryDialogProps {
  patient: Patient | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (patientId: string, updatedHistory: string[]) => Promise<void>
}

export function PatientMemoryDialog({ patient, open, onOpenChange, onSave }: PatientMemoryDialogProps) {
  const t = useTranslations('patient-memory-dialog')
  const [newNote, setNewNote] = useState("")
  const [isSaving, setIsSaving] = useState(false)

  if (!patient) return null

  const memories = patient.medicalHistory.filter((h) => h.startsWith(MEMORY_PREFIX))
  const otherHistory = patient.medicalHistory.filter((h) => !h.startsWith(MEMORY_PREFIX))

  const handleAddNote = async () => {
    if (!newNote.trim()) return
    setIsSaving(true)
    try {
      const date = new Date().toLocaleDateString("sq-AL", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      })
      const entry = `${MEMORY_PREFIX} ${date}: ${newNote.trim()}`
      await onSave(patient.id, [...otherHistory, ...memories, entry])
      setNewNote("")
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    setNewNote("")
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-accent" />
            {t('title')} — {patient.firstName} {patient.lastName}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-72 pr-1">
          {memories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">
              {t('empty')}
            </p>
          ) : (
            <div className="space-y-2 pb-2">
              {memories.map((note, i) => {
                const content = note.replace(MEMORY_PREFIX, "").trim()
                const colonIdx = content.indexOf(": ")
                const date = colonIdx > -1 ? content.substring(0, colonIdx) : ""
                const text = colonIdx > -1 ? content.substring(colonIdx + 2) : content
                return (
                  <div key={i} className="p-3 bg-secondary/60 rounded-xl border border-border/40">
                    {date && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Calendar className="h-3 w-3" />
                        {date}
                      </div>
                    )}
                    <p className="text-sm">{text}</p>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        <div className="space-y-2 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('newNote')}</p>
          <Textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t('newNotePlaceholder')}
            className="rounded-xl min-h-[80px]"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            {t('close')}
          </Button>
          <Button
            onClick={handleAddNote}
            disabled={!newNote.trim() || isSaving}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('saving')}
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-2" />
                {t('addNote')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
