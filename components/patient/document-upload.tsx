"use client"

import { useState, useRef, useCallback } from 'react'
import { Button } from '@core/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@core/components/ui/dialog'
import { cn } from '@core/lib/utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { Field, FieldLabel } from '@core/components/ui/field'
import type { PatientDocument } from '@core/types'
import { useTranslations } from 'next-intl'
import {
  Upload,
  FileImage,
  FileText,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react'

interface DocumentUploadProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpload: (file: File, category: PatientDocument['category']) => Promise<void>
  onUploadBatch?: (files: File[], imageSubtype: string) => Promise<void>
  patientName: string
}

type UploadState = 'idle' | 'uploading' | 'success' | 'error'

export function DocumentUpload({
  open,
  onOpenChange,
  onUpload,
  onUploadBatch,
  patientName,
}: DocumentUploadProps) {
  const t = useTranslations('document-upload')
  const CATEGORY_LABELS: Record<PatientDocument['category'], string> = {
    general: t('categoryLabels.general'),
    id_card: t('categoryLabels.id_card'),
    insurance_card: t('categoryLabels.insurance_card'),
    xray: t('categoryLabels.xray'),
  }
  const IMAGE_SUBTYPE_LABELS: Record<string, string> = {
    panoramike: t('imageSubtypeLabels.panoramike'),
    periapikale: t('imageSubtypeLabels.periapikale'),
    cbct: t('imageSubtypeLabels.cbct'),
    tjeter: t('imageSubtypeLabels.tjeter'),
  }
  const [isDragging, setIsDragging]     = useState(false)
  const [category, setCategory]         = useState<PatientDocument['category']>('general')
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [imageSubtype, setImageSubtype] = useState('panoramike')
  const [uploadState, setUploadState]   = useState<UploadState>('idle')
  const [errorMessage, setErrorMessage] = useState<string>('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isXray = category === 'xray'
  const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf', 'application/dicom']
  // Browsers don't recognize .dcm as a registered MIME type, so a real DICOM
  // file's `.type` typically comes through as an empty string — has to be
  // detected by extension instead of relying on `file.type` alone.
  const isDicomFile = (f: File) => f.name.toLowerCase().endsWith('.dcm') || f.type === 'application/dicom'

  const pickFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const valid = Array.from(fileList).filter(f => acceptedTypes.includes(f.type) || isDicomFile(f))
    if (valid.length === 0) return
    setSelectedFiles(isXray ? valid : [valid[0]])
    setUploadState('idle')
  }

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    pickFiles(e.dataTransfer.files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXray])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    pickFiles(e.target.files)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isXray])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUpload = useCallback(async () => {
    if (selectedFiles.length === 0) return

    setUploadState('uploading')
    setErrorMessage('')

    try {
      if (isXray && onUploadBatch) {
        await onUploadBatch(selectedFiles, imageSubtype)
      } else {
        await onUpload(selectedFiles[0], category)
      }
      setUploadState('success')
      setTimeout(() => {
        setSelectedFiles([])
        setCategory('general')
        setImageSubtype('panoramike')
        setUploadState('idle')
        onOpenChange(false)
      }, 1500)
    } catch (err: any) {
      setUploadState('error')
      setErrorMessage(err?.message || t('uploadFailedRetry'))
    }
  }, [selectedFiles, category, isXray, imageSubtype, onUpload, onUploadBatch, onOpenChange])

  const getFileIcon = (file: File) =>
    file.type.startsWith('image/') || isDicomFile(file)
      ? <FileImage className="h-8 w-8 ic-blue" />
      : <FileText className="h-8 w-8 ic-red" />

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('dialogTitle')}</DialogTitle>
          <DialogDescription>
            {t('dialogDescription', { patientName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field>
            <FieldLabel>{t('documentType')}</FieldLabel>
            <Select
              value={category}
              onValueChange={(v) => {
                const next = v as PatientDocument['category']
                setCategory(next)
                // Switching category changes single-vs-batch semantics — start over.
                setSelectedFiles([])
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CATEGORY_LABELS) as PatientDocument['category'][]).map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {isXray && (
            <Field>
              <FieldLabel>{t('xrayType')}</FieldLabel>
              <Select value={imageSubtype} onValueChange={setImageSubtype}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(IMAGE_SUBTYPE_LABELS).map(([v, label]) => (
                    <SelectItem key={v} value={v}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {selectedFiles.length === 0 && (
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300",
                isDragging
                  ? "border-accent bg-accent/5 scale-[1.02]"
                  : "border-border hover:border-accent/50 hover:bg-secondary/30"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple={isXray}
                // .dcm is accepted regardless of category — pickFiles() below
                // already validates it that way for drag-and-drop, so the
                // click-to-browse file picker matched that instead of hiding
                // .dcm files just because "X-ray" wasn't the selected type.
                accept=".jpg,.jpeg,.png,.webp,.pdf,.dcm,application/dicom"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Upload className={cn(
                "h-12 w-12 mx-auto mb-4 transition-colors",
                isDragging ? "text-accent" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium text-foreground mb-1">
                {isXray ? t('dropzone.dropImages') : t('dropzone.dropDocument')}
              </p>
              <p className="text-xs text-muted-foreground">
                {isXray ? t('dropzone.clickToSelectMultiple') : t('dropzone.clickToSelect')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {isXray
                  ? t('dropzone.formatsXray')
                  : t('dropzone.formatsDefault')}
              </p>
            </div>
          )}

          {selectedFiles.length > 0 && (
            <div className="space-y-4">
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {selectedFiles.map((file, i) => (
                  <div key={i} className="flex items-center gap-4 p-4 bg-secondary/30 rounded-xl">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatFileSize(file.size)} · {isDicomFile(file) ? 'DICOM' : file.type.split('/')[1]?.toUpperCase()}
                      </p>
                    </div>
                    {uploadState === 'idle' && (
                      <Button variant="ghost" size="icon-sm" onClick={() => removeFile(i)}>
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              {isXray && uploadState === 'idle' && (
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="w-full">
                  <Upload className="h-3.5 w-3.5 mr-2" />
                  {t('addMoreImages')}
                </Button>
              )}

              {uploadState === 'uploading' && (
                <div className="flex items-center gap-3 p-4 bg-secondary/30 rounded-xl">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  <p className="text-sm font-medium">{t('uploading')}</p>
                </div>
              )}

              {uploadState === 'success' && (
                <div className="flex items-center gap-3 p-4 chip-green rounded-xl">
                  <CheckCircle className="h-5 w-5" />
                  <p className="font-medium">
                    {selectedFiles.length > 1 ? t('successImages') : t('successDocument')}
                  </p>
                </div>
              )}

              {uploadState === 'error' && (
                <div className="flex items-center gap-3 p-4 chip-red rounded-xl">
                  <AlertCircle className="h-5 w-5 shrink-0" />
                  <div className="flex-1">
                    <p className="font-medium">{t('uploadFailed')}</p>
                    <p className="text-sm opacity-80">{errorMessage}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUploadState('idle')}
                    className="border-[var(--p-red)]/40 hover:bg-[var(--p-red-bg)]"
                  >
                    {t('tryAgain')}
                  </Button>
                </div>
              )}

              {uploadState === 'idle' && (
                <Button onClick={handleUpload} className="w-full">
                  <Upload className="h-4 w-4 mr-2" />
                  {selectedFiles.length > 1 ? t('uploadCount', { count: selectedFiles.length }) : t('uploadDocumentButton')}
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
