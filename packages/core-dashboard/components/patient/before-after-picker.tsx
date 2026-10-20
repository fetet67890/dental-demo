"use client"

import { useState } from "react"
import { Button } from "@core/components/ui/button"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import { Images } from "lucide-react"
import { useTranslations } from 'next-intl'
import { BeforeAfterSlider } from "./before-after-slider"
import type { PatientDocument } from "@core/types"

interface Props {
  documents: PatientDocument[]
}

// Lets staff pick any two of a patient's uploaded photos and compare them
// with a draggable before/after slider. Pure UI — reuses documents already
// uploaded through the existing document system, no new storage needed.
export function BeforeAfterPicker({ documents }: Props) {
  const t = useTranslations('before-after-picker')
  const [open, setOpen] = useState(false)
  const [beforeId, setBeforeId] = useState("")
  const [afterId, setAfterId] = useState("")

  const images = documents.filter((d) => d.type === "image")
  const beforeDoc = images.find((d) => d.id === beforeId)
  const afterDoc = images.find((d) => d.id === afterId)

  if (images.length < 2) return null

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Images className="h-3.5 w-3.5" />
        {t('compareButton')}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{t('dialogTitle')}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <Select value={beforeId} onValueChange={setBeforeId}>
              <SelectTrigger><SelectValue placeholder={t('beforePlaceholder')} /></SelectTrigger>
              <SelectContent>
                {images.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={afterId} onValueChange={setAfterId}>
              <SelectTrigger><SelectValue placeholder={t('afterPlaceholder')} /></SelectTrigger>
              <SelectContent>
                {images.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {beforeDoc && afterDoc ? (
            <BeforeAfterSlider beforeUrl={beforeDoc.url} afterUrl={afterDoc.url} />
          ) : (
            <p className="text-sm text-muted-foreground text-center py-10">{t('selectTwoPhotos')}</p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
