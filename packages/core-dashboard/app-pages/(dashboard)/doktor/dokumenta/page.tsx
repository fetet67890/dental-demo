"use client"

import { useState, useEffect, useRef, useCallback, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { syncUrl } from "@core/lib/utils"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import { Badge } from "@core/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@core/components/ui/dialog"
import {
  FileText,
  ImageIcon,
  Upload,
  Eye,
  Download,
  Lock,
  Plus,
  FileStack,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"
import {
  getClinicDocuments,
  uploadClinicDocument,
  openClinicDocument,
} from "@core/lib/api/clinic-documents"
import type { ClinicDocument } from "@core/types"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("sq-AL", {
    day: "2-digit", month: "short", year: "numeric",
  })
}

function FileIcon({ type }: { type: "pdf" | "image" }) {
  return type === "pdf"
    ? <FileText className="h-5 w-5 ic-red" />
    : <ImageIcon className="h-5 w-5 ic-blue" />
}

function DoktorDokumentaInner() {
  const t = useTranslations('doktor-dokumenta')
  const searchParams = useSearchParams()
  const [docs, setDocs]         = useState<ClinicDocument[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [tab, setTab]           = useState<"all" | "preventive" | "personal">("all")

  const [uploadOpen, setUploadOpen]     = useState(false)
  const [viewDoc, setViewDoc]           = useState<ClinicDocument | null>(null)
  const [viewPassword, setViewPassword] = useState("")
  const [viewLoading, setViewLoading]   = useState(false)

  const [name, setName]               = useState("")
  const [description, setDescription] = useState("")
  const [file, setFile]               = useState<File | null>(null)
  const [saving, setSaving]           = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const load = useCallback(async () => {
    try {
      setLoading(true)
      const data = await getClinicDocuments()
      setDocs(data)
    } catch {
      toast.error("Gabim gjatë ngarkimit të dokumentave")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (searchParams.get('action') === 'upload') {
      setName(""); setDescription(""); setFile(null); setUploadOpen(true)
      syncUrl('/doktor/dokumenta')
    }
  }, [searchParams])

  const filtered = docs.filter(d => {
    const matchTab    = tab === "all" || d.category === tab
    const matchSearch = d.name.toLowerCase().includes(search.toLowerCase())
    return matchTab && matchSearch
  })

  const preventiveCount = docs.filter(d => d.category === "preventive").length
  const personalCount   = docs.filter(d => d.category === "personal").length

  const handleUpload = async () => {
    // Unlike admin/recepsion's version of this page, there's no dropzone
    // error-styling here to fill in — just the same missing guard, which is
    // also what TypeScript was catching (FormData.append doesn't accept
    // null). Checked first, as its own early return, so `file` narrows to
    // non-null for the rest of this function.
    if (!file) {
      toast.error(t('errors.fileRequired'))
      return
    }
    if (!name.trim()) {
      toast.error(t('errors.nameRequired'))
      return
    }
    try {
      setSaving(true)
      const fd = new FormData()
      fd.append("file", file)
      fd.append("name", name.trim())
      fd.append("description", description)
      fd.append("category", "preventive")
      const doc = await uploadClinicDocument(fd)
      setDocs(prev => [doc, ...prev])
      toast.success("Dokumenti u ngarkua me sukses")
      setUploadOpen(false)
      setName(""); setDescription(""); setFile(null)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ngarkimit")
    } finally {
      setSaving(false)
    }
  }

  const handleView = async (doc: ClinicDocument, pw?: string) => {
    try {
      setViewLoading(true)
      const url = await openClinicDocument(doc.id, pw)
      window.open(url, "_blank")
      setViewDoc(null)
      setViewPassword("")
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gabim"
      if (msg.includes("Fjalëkalim")) toast.error("Fjalëkalim i gabuar")
      else toast.error(msg)
    } finally {
      setViewLoading(false)
    }
  }

  const handleDownload = async (doc: ClinicDocument) => {
    if (doc.passwordProtected) { setViewDoc(doc); return }
    try {
      const url = await openClinicDocument(doc.id)
      const a = document.createElement("a")
      a.href = url; a.download = doc.name; a.click()
    } catch {
      toast.error("Gabim gjatë shkarkimit")
    }
  }

  return (
    <>
      <Topbar
        title={t('title')}
      />

      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            { label: t('stats.total'),       value: docs.length,      icon: FileStack,   color: "text-accent" },
            { label: t('stats.preventive'),  value: preventiveCount,  icon: FileText,    color: "ic-green" },
            { label: t('stats.personal'),    value: personalCount,    icon: ShieldCheck, color: "ic-blue" },
          ].map(s => (
            <Card key={s.label} className="border-border/50 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="p-2.5 bg-muted rounded-xl">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs + Search */}
        <div className="flex flex-col gap-3">
          <div className="flex gap-1 bg-muted p-1 rounded-xl w-full sm:w-fit">
            {(["all", "preventive", "personal"] as const).map(tabKey => (
              <button
                key={tabKey}
                onClick={() => setTab(tabKey)}
                className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-all outline-none ${
                  tab === tabKey ? "bg-background shadow text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {tabKey === "all" ? t('tabs.all') : tabKey === "preventive" ? t('tabs.preventive') : t('tabs.personal')}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <SearchInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={e => setSearch(e.target.value)}
              containerClassName="flex-1"
            />
            <Button onClick={() => { setName(""); setDescription(""); setFile(null); setUploadOpen(true) }} className="shrink-0">
              <Plus className="mr-2 h-4 w-4" />
              {t('upload')}
            </Button>
          </div>
        </div>

        {/* Document list */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">{t('loading')}</div>
            ) : filtered.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <FileStack className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p>{t('emptyState')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {filtered.map(doc => (
                  <div key={doc.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="p-2.5 bg-muted rounded-xl shrink-0">
                      <FileIcon type={doc.fileType} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium truncate">{doc.name}</p>
                        {doc.passwordProtected && (
                          <Lock className="h-3.5 w-3.5 ic-amber shrink-0" />
                        )}
                        <Badge
                          variant="secondary"
                          className={doc.category === "preventive"
                            ? "chip-green text-xs"
                            : "chip-blue text-xs"}
                        >
                          {doc.category === "preventive" ? t('badges.preventive') : t('badges.personal')}
                        </Badge>
                      </div>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground truncate max-w-md mt-0.5">{doc.description}</p>
                      )}
                      <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                        <span>{formatBytes(doc.fileSize)}</span>
                        <span>⬢</span>
                        <span>{formatDate(doc.uploadedAt)}</span>
                        <span>⬢</span>
                        <span>{doc.uploadedBy}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => doc.passwordProtected ? setViewDoc(doc) : handleView(doc)}
                        title={t('view')}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => handleDownload(doc)}
                        title={t('download')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upload Dialog */}
      <Dialog open={uploadOpen} onOpenChange={open => { setUploadOpen(open); if (!open) { setName(""); setDescription(""); setFile(null) } }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('uploadDialog.title')}</DialogTitle>
            <DialogDescription>{t('uploadDialog.description')}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-accent transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {file ? (
                <div>
                  <p className="font-medium text-sm">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium">{t('uploadDialog.clickToChoose')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('uploadDialog.fileTypes')}</p>
                </div>
              )}
              <input
                ref={fileRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,.webp"
                className="hidden"
                onChange={e => {
                  const f = e.target.files?.[0]
                  if (f) {
                    setFile(f)
                    if (!name) setName(f.name.replace(/\.[^/.]+$/, ""))
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('uploadDialog.nameLabel')}</Label>
              <Input value={name} onChange={e => setName(e.target.value)} placeholder={t('uploadDialog.namePlaceholder')} />
            </div>
            <div className="space-y-2">
              <Label>{t('uploadDialog.descriptionLabel')}</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} className="resize-none" placeholder={t('uploadDialog.descriptionPlaceholder')} />
            </div>
            <div className="flex items-center gap-2 text-sm ic-green ibg-green p-3 rounded-xl">
              <FileText className="h-4 w-4 shrink-0" />
              {t.rich('uploadDialog.preventiveNotice', { strong: (chunks) => <strong>{chunks}</strong> })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>{t('cancel')}</Button>
            <Button onClick={handleUpload} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              <Upload className="mr-2 h-4 w-4" />
              {saving ? t('uploading') : t('upload')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Password Modal */}
      <Dialog open={!!viewDoc} onOpenChange={open => { if (!open) { setViewDoc(null); setViewPassword("") } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 ic-amber" />
              {t('passwordDialog.title')}
            </DialogTitle>
            <DialogDescription>
              {t('passwordDialog.description', { name: viewDoc?.name || '' })}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input
              type="password"
              placeholder={t('passwordDialog.placeholder')}
              value={viewPassword}
              onChange={e => setViewPassword(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && viewDoc) handleView(viewDoc, viewPassword) }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setViewDoc(null); setViewPassword("") }}>{t('cancel')}</Button>
            <Button
              disabled={!viewPassword || viewLoading}
              onClick={() => viewDoc && handleView(viewDoc, viewPassword)}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              {viewLoading ? t('passwordDialog.verifying') : t('passwordDialog.openDocument')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default function DoktorDokumenta() {
  return (
    <Suspense>
      <DoktorDokumentaInner />
    </Suspense>
  )
}
