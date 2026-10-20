"use client"

// Generic document list — category/subtype labels come entirely from
// useSpecialtyConfig().documentConfig (see ../../lib/specialty-config.ts),
// not hardcoded here. Dental's own imaging needs (DICOM/CBCT detection and
// 3D-reconstruction viewing) are real, substantial, Cornerstone3D-dependent
// complexity that no other specialty needs — rather than threading that
// through this file as more generic "slots," Dental's app has its OWN
// document-list.tsx (a full override, not a config variant) that layers
// that behavior on top of the same shape. See apps/dental/dashboard's copy.
import { useMemo, useState } from 'react'
import { Button } from '@core/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@core/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@core/components/ui/dropdown-menu'
import { cn } from '@core/lib/utils'
import {
  FileImage,
  FileText,
  Eye,
  Download,
  Trash2,
  MoreVertical,
  FolderOpen,
  Plus,
  ChevronLeft,
  ChevronRight,
  Images,
} from 'lucide-react'
import type { PatientDocument } from '@core/types'
import { format } from 'date-fns'
import { sq } from 'date-fns/locale'
import { useTranslations } from 'next-intl'
import { useSpecialtyConfig } from '../../context/specialty-config-context'

const isImageLike = (doc: PatientDocument) => doc.type === 'image'

interface DocumentListProps {
  documents: PatientDocument[]
  onDelete: (id: string) => void
  onUploadClick: () => void
  className?: string
}

export function DocumentList({
  documents,
  onDelete,
  onUploadClick,
  className,
}: DocumentListProps) {
  const t = useTranslations('document-list')
  const { documentConfig } = useSpecialtyConfig()
  const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
    documentConfig.categories.map(cat => [cat, t(`categoryLabels.${cat}`)])
  )
  const IMAGE_SUBTYPE_LABELS: Record<string, string> = Object.fromEntries(
    documentConfig.imageSubtypes.map(sub => [sub, t(`imageSubtypeLabels.${sub}`)])
  )
  const [previewDoc, setPreviewDoc] = useState<PatientDocument | null>(null)
  const [gallery, setGallery] = useState<{ studyId: string; index: number } | null>(null)

  const { studies, standaloneDocs } = useMemo(() => {
    const studyMap: Record<string, PatientDocument[]> = {}
    const standalone: PatientDocument[] = []
    for (const doc of documents) {
      if (doc.studyId) {
        if (!studyMap[doc.studyId]) studyMap[doc.studyId] = []
        studyMap[doc.studyId].push(doc)
      } else {
        standalone.push(doc)
      }
    }
    return { studies: Object.entries(studyMap), standaloneDocs: standalone }
  }, [documents])

  const getFileIcon = (doc: PatientDocument) =>
    doc.type === 'image'
      ? <FileImage className="h-5 w-5 ic-blue" />
      : <FileText className="h-5 w-5 ic-red" />

  const handleView = (doc: PatientDocument) => {
    if (isImageLike(doc)) {
      setPreviewDoc(doc)
    } else {
      // Simulate opening PDF in new tab
      window.open(doc.url, '_blank')
    }
  }

  const handleDownload = (doc: PatientDocument) => {
    // Simulate download
    const link = document.createElement('a')
    link.href = doc.url
    link.download = doc.name
    link.click()
  }

  const formatDate = (dateStr: string) => {
    try {
      return format(new Date(dateStr), 'd MMM yyyy, HH:mm', { locale: sq })
    } catch {
      return dateStr
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const galleryDocs = gallery ? studies.find(([id]) => id === gallery.studyId)?.[1] : undefined
  const galleryDoc = galleryDocs?.[gallery?.index ?? 0]

  const navigateGallery = (dir: number) => {
    if (!gallery || !galleryDocs) return
    const next = (gallery.index + dir + galleryDocs.length) % galleryDocs.length
    setGallery({ ...gallery, index: next })
  }

  if (documents.length === 0) {
    return (
      <div className={cn("text-center py-12", className)}>
        <div className="w-16 h-16 mx-auto mb-4 bg-secondary/50 rounded-2xl flex items-center justify-center">
          <FolderOpen className="h-8 w-8 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground mb-4">{t('empty')}</p>
        <Button onClick={onUploadClick} variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          {t('uploadDocument')}
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className={cn("space-y-3", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {documents.length === 1
              ? t('documentCountOne', { count: documents.length })
              : t('documentCountOther', { count: documents.length })}
          </p>
          <Button onClick={onUploadClick} size="sm" variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            {t('add')}
          </Button>
        </div>

        {/* Photo series (batch uploads sharing one studyId) */}
        {studies.length > 0 && (
          <div className="grid gap-3 sm:grid-cols-2">
            {studies.map(([studyId, docs]) => {
              const first = docs[0]
              const subtypeLabel = IMAGE_SUBTYPE_LABELS[first.imageSubtype || 'tjeter']
              return (
                <div
                  key={studyId}
                  className="group p-4 bg-secondary/30 rounded-xl border border-border/50 hover:border-accent/30 hover:bg-secondary/50 transition-all cursor-pointer"
                  onClick={() => setGallery({ studyId, index: 0 })}
                >
                  <div className="flex items-center gap-3">
                    <div className="p-3 rounded-xl ibg-purple shrink-0">
                      <Images className="h-5 w-5 ic-purple" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate text-sm">{subtypeLabel}</p>
                        <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-accent shrink-0">
                          {docs.length === 1
                            ? t('imageCountOne', { count: docs.length })
                            : t('imageCountOther', { count: docs.length })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{formatDate(first.uploadedAt)}</p>
                    </div>
                  </div>
                  {/* Thumbnail strip */}
                  <div className="flex gap-1.5 mt-3 overflow-hidden">
                    {docs.slice(0, 4).map((d, i) => (
                      <div key={d.id} className="relative w-14 h-14 rounded-lg overflow-hidden bg-secondary shrink-0 border border-border/50">
                        {d.type === 'image' ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={d.url} alt={d.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><FileText className="h-5 w-5 ic-red" /></div>
                        )}
                        {i === 3 && docs.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-white text-xs font-semibold">
                            +{docs.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Standalone documents */}
        <div className="grid gap-3 sm:grid-cols-2">
          {standaloneDocs.map((doc) => (
            <div
              key={doc.id}
              className="group flex items-center gap-3 p-4 bg-secondary/30 rounded-xl border border-border/50 hover:border-accent/30 hover:bg-secondary/50 transition-all"
            >
              {/* Icon */}
              <div className={cn(
                "p-3 rounded-xl",
                doc.type === 'image' ? 'ibg-blue' : 'ibg-red'
              )}>
                {getFileIcon(doc)}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium truncate text-sm">{doc.name}</p>
                  {doc.category && doc.category !== 'general' && (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-accent/10 text-accent shrink-0">
                      {CATEGORY_LABELS[doc.category]}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                  <span className="uppercase">{doc.type === 'image' ? t('fileType.image') : t('fileType.pdf')}</span>
                  <span>-</span>
                  <span>{formatFileSize(doc.size)}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDate(doc.uploadedAt)}
                </p>
              </div>

              {/* Actions */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleView(doc)}>
                    <Eye className="h-4 w-4 mr-2" />
                    {t('actions.view')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleDownload(doc)}>
                    <Download className="h-4 w-4 mr-2" />
                    {t('actions.download')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onDelete(doc.id)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    {t('actions.delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ))}
        </div>
      </div>

      {/* Image Preview Modal (standalone documents) */}
      <Dialog open={!!previewDoc} onOpenChange={() => setPreviewDoc(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewDoc?.name}</DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="relative aspect-video bg-secondary/30 rounded-xl overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewDoc.url}
                alt={previewDoc.name}
                className="w-full h-full object-contain"
              />
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => previewDoc && handleDownload(previewDoc)}
            >
              <Download className="h-4 w-4 mr-2" />
              {t('actions.download')}
            </Button>
            <Button onClick={() => setPreviewDoc(null)}>
              {t('actions.close')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Study gallery (photo series) with prev/next navigation */}
      <Dialog open={!!gallery} onOpenChange={(open) => !open && setGallery(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {galleryDoc && IMAGE_SUBTYPE_LABELS[galleryDoc.imageSubtype || 'tjeter']}
              {galleryDocs && galleryDocs.length > 1 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  {(gallery?.index ?? 0) + 1} / {galleryDocs.length}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          {galleryDoc && (
            <div className="relative aspect-video bg-secondary/30 rounded-xl overflow-hidden">
              {galleryDoc.type === 'image' ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={galleryDoc.url} alt={galleryDoc.name} className="w-full h-full object-contain" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Button variant="outline" onClick={() => window.open(galleryDoc.url, '_blank')}>
                    {t('actions.openPdf')}
                  </Button>
                </div>
              )}
              {galleryDocs && galleryDocs.length > 1 && (
                <>
                  <button
                    onClick={() => navigateGallery(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                    aria-label={t('gallery.previousImage')}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => navigateGallery(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 hover:bg-black/60 rounded-full text-white transition-colors"
                    aria-label={t('gallery.nextImage')}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>
          )}
          <div className="flex items-center justify-between gap-2">
            {galleryDoc && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { onDelete(galleryDoc.id); setGallery(null) }}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('actions.deleteImage')}
              </Button>
            )}
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => galleryDoc && handleDownload(galleryDoc)}>
                <Download className="h-4 w-4 mr-2" />
                {t('actions.download')}
              </Button>
              <Button onClick={() => setGallery(null)}>
                {t('actions.close')}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
