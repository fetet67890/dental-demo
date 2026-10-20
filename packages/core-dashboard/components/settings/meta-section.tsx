"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@core/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Loader2, Search as SearchIcon } from "lucide-react"
import { PageLoadingGuard } from "@core/components/ui/page-loading-guard"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import {
  getPageMetaList, upsertPageMeta, deletePageMeta, type PageMeta,
} from "@core/lib/api/page-meta"

const SUGGESTED_KEYS = ["default", "home", "about", "services", "team", "blog", "book-appointment"]

const EMPTY_FORM = { pageKey: "", title: "", description: "" }

export function MetaSection() {
  const t = useTranslations('meta-section')
  const [items, setItems] = useState<PageMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<PageMeta | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<PageMeta | null>(null)

  const load = () => {
    setLoading(true)
    getPageMetaList().then(setItems).catch(() => toast.error("Gabim gjatë ngarkimit")).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const closeDialog = () => {
    setIsOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.pageKey.trim()) e.pageKey = t('validation.pageKeyRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setSaving(true)
    try {
      await upsertPageMeta(form.pageKey.trim(), { title: form.title.trim(), description: form.description.trim() })
      toast.success("Meta-ja u ruajt me sukses")
      closeDialog()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (item: PageMeta) => {
    setEditing(item)
    setForm({ pageKey: item.pageKey, title: item.title, description: item.description })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deletePageMeta(deleting.pageKey)
      toast.success("Meta-ja u fshi me sukses")
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë fshirjes")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <PageLoadingGuard cols={3} rows={5}>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) closeDialog() }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
              <DialogDescription>
                {t('dialog.description')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="pageKey">{t('dialog.pageKeyLabel')}</Label>
                <Input
                  id="pageKey"
                  value={form.pageKey}
                  onChange={(e) => { setForm({ ...form, pageKey: e.target.value }); if (errors.pageKey) setErrors(p => ({ ...p, pageKey: '' })) }}
                  placeholder={t('dialog.pageKeyPlaceholder')}
                  disabled={!!editing}
                  list="page-keys"
                  className={cn(errors.pageKey && "border-destructive focus-visible:ring-destructive/30")}
                />
                <datalist id="page-keys">
                  {SUGGESTED_KEYS.map((k) => <option key={k} value={k} />)}
                </datalist>
                {errors.pageKey && <p className="text-xs text-destructive mt-1">{errors.pageKey}</p>}
                {!editing && <p className="text-xs text-muted-foreground">{t('dialog.defaultHint')}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaTitle">{t('dialog.titleLabel')}</Label>
                <Input id="metaTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('dialog.titlePlaceholder')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="metaDescription">{t('dialog.descriptionLabel')}</Label>
                <Textarea id="metaDescription" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('dialog.descriptionPlaceholder')} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('save')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground flex-1">
                <SearchIcon className="h-4 w-4" />
                <span>{t('configuredCount', { count: items.length })}</span>
              </div>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 shrink-0" onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('dialog.addTitle')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.page')}</TableHead>
                    <TableHead>{t('table.title')}</TableHead>
                    <TableHead>{t('table.description')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.pageKey}>
                      <TableCell><span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{item.pageKey}</span></TableCell>
                      <TableCell className="truncate max-w-xs">{item.title || "—"}</TableCell>
                      <TableCell className="truncate max-w-xs text-sm text-muted-foreground">{item.description || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button
                            variant="ghost" size="sm" className="text-destructive hover:text-destructive"
                            disabled={item.pageKey === 'default'}
                            onClick={() => setDeleting(item)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && items.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">{t('emptyState')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {items.map((item) => (
                <div key={item.pageKey} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <span className="font-mono text-xs bg-secondary px-2 py-0.5 rounded">{item.pageKey}</span>
                      <p className="text-sm font-medium mt-1 truncate">{item.title || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button
                        variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive"
                        disabled={item.pageKey === 'default'}
                        onClick={() => setDeleting(item)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && items.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('emptyState')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageLoadingGuard>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { pageKey: deleting?.pageKey || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">{t('deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
