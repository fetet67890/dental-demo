"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import { Switch } from "@core/components/ui/switch"
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
import { Plus, Pencil, Trash2, Loader2, Newspaper, X } from "lucide-react"
import { PageLoadingGuard } from "@core/components/ui/page-loading-guard"
import { toast } from "sonner"
import { fmtDate } from "@core/lib/utils"
import { cn } from "@core/lib/utils"
import { ContentImageField } from "./content-image-field"
import {
  getBlogPosts, createBlogPost, updateBlogPost, deleteBlogPost,
  type BlogPost, type BlogSection,
} from "@core/lib/api/blog-posts"

interface FormState {
  title: string
  englishTitle: string
  category: string
  readTime: string
  excerpt: string
  image: string | null
  writerName: string
  writerRole: string
  writerBio: string
  writerAvatar: string | null
  sections: BlogSection[]
  isPublished: boolean
}

const EMPTY_FORM: FormState = {
  title: "", englishTitle: "", category: "", readTime: "", excerpt: "", image: null,
  writerName: "", writerRole: "", writerBio: "", writerAvatar: null,
  sections: [{ heading: "", paragraph: "" }], isPublished: false,
}

export function PostimetSection() {
  const t = useTranslations('postimet-section')
  const [posts, setPosts] = useState<BlogPost[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<BlogPost | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<BlogPost | null>(null)

  const load = () => {
    setLoading(true)
    getBlogPosts().then(setPosts).catch(() => toast.error("Gabim gjatë ngarkimit")).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = posts.filter(
    (p) => p.title.toLowerCase().includes(search.toLowerCase()) || p.category.toLowerCase().includes(search.toLowerCase())
  )

  const closeDialog = () => {
    setIsOpen(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setErrors({})
  }

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = t('validation.titleRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }

    setSaving(true)
    const cleanSections = form.sections.filter((s) => s.paragraph.trim())
    const payload = {
      title: form.title.trim(),
      englishTitle: form.englishTitle.trim() || undefined,
      category: form.category.trim() || undefined,
      readTime: form.readTime.trim() || undefined,
      excerpt: form.excerpt.trim() || undefined,
      image: form.image || undefined,
      writerName: form.writerName.trim() || undefined,
      writerRole: form.writerRole.trim() || undefined,
      writerBio: form.writerBio.trim() || undefined,
      writerAvatar: form.writerAvatar || undefined,
      sections: cleanSections,
      isPublished: form.isPublished,
    }
    try {
      if (editing) {
        await updateBlogPost(editing.id, payload)
        toast.success("Artikulli u përditësua me sukses")
      } else {
        await createBlogPost(payload)
        toast.success("Artikulli u shtua me sukses")
      }
      closeDialog()
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (post: BlogPost) => {
    setEditing(post)
    setForm({
      title: post.title, englishTitle: post.englishTitle, category: post.category,
      readTime: post.readTime, excerpt: post.excerpt, image: post.image,
      writerName: post.writer.name, writerRole: post.writer.role,
      writerBio: post.writer.bio, writerAvatar: post.writer.avatar,
      sections: post.sections.length > 0 ? post.sections : [{ heading: "", paragraph: "" }],
      isPublished: post.isPublished,
    })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteBlogPost(deleting.id)
      toast.success("Artikulli u fshi me sukses")
      load()
    } catch {
      toast.error("Gabim gjatë fshirjes")
    } finally {
      setDeleting(null)
    }
  }

  const updateSection = (idx: number, patch: Partial<BlogSection>) => {
    setForm((f) => ({ ...f, sections: f.sections.map((s, i) => (i === idx ? { ...s, ...patch } : s)) }))
  }
  const addSection = () => setForm((f) => ({ ...f, sections: [...f.sections, { heading: "", paragraph: "" }] }))
  const removeSection = (idx: number) => setForm((f) => ({ ...f, sections: f.sections.filter((_, i) => i !== idx) }))

  return (
    <>
      <PageLoadingGuard cols={4} rows={6}>
        <Dialog open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) closeDialog() }}>
          <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
              <DialogDescription>
                {editing ? t('dialog.editDescription') : t('dialog.addDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <ContentImageField
                label={t('dialog.coverImageLabel')}
                hint={t('dialog.coverImageHint')}
                value={form.image}
                onChange={(url) => setForm({ ...form, image: url })}
              />
              <div className="space-y-2">
                <Label htmlFor="title">{t('dialog.titleLabel')}</Label>
                <Input
                  id="title"
                  value={form.title}
                  onChange={(e) => { setForm({ ...form, title: e.target.value }); if (errors.title) setErrors(p => ({ ...p, title: '' })) }}
                  placeholder={t('dialog.titlePlaceholder')}
                  className={cn(errors.title && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.title && <p className="text-xs text-destructive mt-1">{errors.title}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="category">{t('dialog.categoryLabel')}</Label>
                  <Input id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder={t('dialog.categoryPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="readTime">{t('dialog.readTimeLabel')}</Label>
                  <Input id="readTime" value={form.readTime} onChange={(e) => setForm({ ...form, readTime: e.target.value })} placeholder={t('dialog.readTimePlaceholder')} />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="excerpt">{t('dialog.excerptLabel')}</Label>
                <Textarea id="excerpt" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} placeholder={t('dialog.excerptPlaceholder')} />
              </div>

              <div className="space-y-3 border-t border-border/50 pt-4">
                <Label>{t('dialog.contentLabel')}</Label>
                {form.sections.map((sec, idx) => (
                  <div key={idx} className="relative space-y-2 rounded-xl border border-border/50 p-3">
                    {form.sections.length > 1 && (
                      <button type="button" onClick={() => removeSection(idx)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive">
                        <X className="h-4 w-4" />
                      </button>
                    )}
                    <Input
                      value={sec.heading || ""}
                      onChange={(e) => updateSection(idx, { heading: e.target.value })}
                      placeholder={t('dialog.sectionHeadingPlaceholder')}
                      className="text-sm font-medium"
                    />
                    <Textarea
                      value={sec.paragraph}
                      onChange={(e) => updateSection(idx, { paragraph: e.target.value })}
                      placeholder={t('dialog.sectionParagraphPlaceholder')}
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={addSection} className="gap-1.5">
                  <Plus className="h-3.5 w-3.5" /> {t('dialog.addParagraph')}
                </Button>
              </div>

              <div className="space-y-3 border-t border-border/50 pt-4">
                <Label>{t('dialog.authorLabel')}</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input value={form.writerName} onChange={(e) => setForm({ ...form, writerName: e.target.value })} placeholder={t('dialog.authorNamePlaceholder')} />
                  <Input value={form.writerRole} onChange={(e) => setForm({ ...form, writerRole: e.target.value })} placeholder={t('dialog.authorRolePlaceholder')} />
                </div>
                <Textarea value={form.writerBio} onChange={(e) => setForm({ ...form, writerBio: e.target.value })} placeholder={t('dialog.authorBioPlaceholder')} />
                <ContentImageField
                  label={t('dialog.authorPhotoLabel')}
                  value={form.writerAvatar}
                  onChange={(url) => setForm({ ...form, writerAvatar: url })}
                />
              </div>

              <div className="flex items-center justify-between border-t border-border/50 pt-4">
                <Label htmlFor="published">{t('dialog.publishedLabel')}</Label>
                <Switch id="published" checked={form.isPublished} onCheckedChange={(v) => setForm({ ...form, isPublished: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={closeDialog}>{t('cancel')}</Button>
              <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {editing ? t('dialog.saveChanges') : t('dialog.addTitle')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <SearchInput placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="flex-1 max-w-sm" />
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
                    <TableHead>{t('table.article')}</TableHead>
                    <TableHead>{t('table.category')}</TableHead>
                    <TableHead>{t('table.published')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((post) => (
                    <TableRow key={post.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {post.image ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={post.image} alt={post.title} className="h-10 w-14 object-cover rounded-lg shrink-0" />
                          ) : (
                            <div className="h-10 w-14 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                              <Newspaper className="h-4 w-4 text-muted-foreground" />
                            </div>
                          )}
                          <p className="font-medium truncate max-w-xs">{post.title}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{post.category || "—"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{post.publishedAt ? fmtDate(post.publishedAt) : "—"}</TableCell>
                      <TableCell>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', post.isPublished ? 'chip-green' : 'chip-neutral')}>
                          {post.isPublished ? t('published') : t('draft')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(post)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(post)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && filtered.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('emptyState')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {filtered.map((post) => (
                <div key={post.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{post.title}</p>
                      <p className="text-xs text-muted-foreground">{post.category || "—"}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(post)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleting(post)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', post.isPublished ? 'chip-green' : 'chip-neutral')}>
                      {post.isPublished ? t('published') : t('draft')}
                    </span>
                  </div>
                </div>
              ))}
              {!loading && filtered.length === 0 && (
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
              {t('deleteDialog.description', { title: deleting?.title || '' })}
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
