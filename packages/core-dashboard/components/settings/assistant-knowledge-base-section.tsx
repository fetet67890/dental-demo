"use client"

import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useTranslations } from "next-intl"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import { Switch } from "@core/components/ui/switch"
import { Badge } from "@core/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { BookOpen, Plus, Pencil, Trash2 } from "lucide-react"
import {
  getFaqEntries, createFaqEntry, updateFaqEntry, deleteFaqEntry, type FaqEntry,
} from "@core/lib/api/faq"

const EMPTY_FORM = { question: "", answer: "", category: "", isActive: true }

export function AssistantKnowledgeBaseSection() {
  const t = useTranslations('assistant-knowledge-base')
  const [entries, setEntries] = useState<FaqEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<FaqEntry | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<FaqEntry | null>(null)

  const load = () => {
    setLoading(true)
    getFaqEntries()
      .then(setEntries)
      .catch(() => toast.error("Gabim gjatë ngarkimit të pyetjeve"))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const filtered = entries.filter(
    (f) =>
      f.question.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast.error("Pyetja dhe përgjigja janë të detyrueshme")
      return
    }
    try {
      setSaving(true)
      if (editing) {
        await updateFaqEntry(editing.id, form)
        toast.success("U përditësua me sukses")
      } else {
        await createFaqEntry(form)
        toast.success("U shtua me sukses")
      }
      setIsOpen(false)
      setEditing(null)
      setForm(EMPTY_FORM)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setSaving(false)
    }
  }

  const handleEdit = (entry: FaqEntry) => {
    setEditing(entry)
    setForm({ question: entry.question, answer: entry.answer, category: entry.category, isActive: entry.isActive })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      await deleteFaqEntry(deleting.id)
      toast.success("U fshi me sukses")
      load()
    } catch {
      toast.error("Gabim gjatë fshirjes")
    } finally {
      setDeleting(null)
    }
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-accent" />
            {t('title')}
          </CardTitle>
          <CardDescription>{t('subtitle')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <SearchInput placeholder={t('search.placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="flex-1 max-w-sm" />
            <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 shrink-0" onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4" />
              {t('addButton')}
            </Button>
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{t('empty')}</p>
          ) : (
            <ul className="space-y-3">
              {filtered.map((entry) => (
                <li key={entry.id} className="flex items-start justify-between gap-3 border-b pb-3 last:border-0">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium">{entry.question}</p>
                      {entry.category && <Badge variant="secondary">{entry.category}</Badge>}
                      {!entry.isActive && <Badge variant="outline">{t('inactive')}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{entry.answer}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleting(entry)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) { setEditing(null); setForm(EMPTY_FORM) }
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">{t('dialog.questionLabel')}</Label>
              <Input
                id="question"
                value={form.question}
                onChange={(e) => setForm({ ...form, question: e.target.value })}
                placeholder={t('dialog.questionPlaceholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="answer">{t('dialog.answerLabel')}</Label>
              <Textarea
                id="answer"
                value={form.answer}
                onChange={(e) => setForm({ ...form, answer: e.target.value })}
                placeholder={t('dialog.answerPlaceholder')}
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('dialog.categoryLabel')}</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder={t('dialog.categoryPlaceholder')}
              />
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/40 rounded-xl">
              <div>
                <p className="text-sm font-medium text-foreground">{t('dialog.activeLabel')}</p>
                <p className="text-xs text-muted-foreground">{t('dialog.activeHint')}</p>
              </div>
              <Switch checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>{t('dialog.cancel')}</Button>
            <Button onClick={handleSave} disabled={saving} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? t('dialog.submitting') : editing ? t('dialog.saveChanges') : t('dialog.addQuestion')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { question: deleting?.question || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">{t('deleteDialog.confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
