"use client"

import { useEffect, useState } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Card, CardContent } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Loader2, RotateCcw, Palette, Check, Save, Trash2 } from "lucide-react"
import {
  listSiteThemes, updateSiteTheme, saveSiteThemeAs, activateSiteTheme, deleteSiteTheme, resetSiteTheme,
  type SiteTheme, type SiteThemeColors,
} from "@core/lib/api/site-theme"
import { isValidHex, normalizeHex } from "@core/lib/color-utils"
import { cn } from "@core/lib/utils"

// The public website's own color palette — a separate axis from Aparenca's
// Dashboard theme (that one only ever restyled the admin panel itself,
// never Hypocrates-Web). Unlike Aparenca's 6 fixed hand-picked presets, this
// is a real library: a protected "Parazgjedhur" (Default) entry seeded from
// the site's shipped colors, plus however many an admin saves — pick one to
// make it live, tweak the live one's colors in place, or save the current
// draft as a brand new entry without losing what was live before.
const FIELDS: { key: keyof SiteThemeColors; labelKey: string }[] = [
  { key: "primary", labelKey: "primary" },
  { key: "secondary", labelKey: "secondary" },
  { key: "background", labelKey: "background" },
  { key: "foreground", labelKey: "foreground" },
  { key: "muted", labelKey: "muted" },
  { key: "card", labelKey: "card" },
]

function colorsOf(t: SiteTheme): SiteThemeColors {
  return { background: t.background, foreground: t.foreground, muted: t.muted, primary: t.primary, secondary: t.secondary, card: t.card }
}

export function PamjaFaqesSection() {
  const t = useTranslations("pamja-faqes-section")
  const [themes, setThemes] = useState<SiteTheme[]>([])
  const [draft, setDraft] = useState<SiteThemeColors | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [activating, setActivating] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<SiteTheme | null>(null)
  const [deletingBusy, setDeletingBusy] = useState(false)
  const [saveAsOpen, setSaveAsOpen] = useState(false)
  const [saveAsName, setSaveAsName] = useState("")
  const [savingAs, setSavingAs] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof SiteThemeColors, string>>>({})

  const active = themes.find((th) => th.isActive) || null

  const load = () => {
    setLoading(true)
    listSiteThemes()
      .then((data) => {
        setThemes(data)
        const activeTheme = data.find((th) => th.isActive)
        if (activeTheme) setDraft(colorsOf(activeTheme))
      })
      .catch(() => toast.error(t("loadError")))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = (key: keyof SiteThemeColors, value: string) => {
    setDraft((d) => (d ? { ...d, [key]: value } : d))
    setErrors((e) => ({ ...e, [key]: isValidHex(value) ? undefined : t("invalidHex") }))
  }

  const dirty = !!(draft && active && FIELDS.some((f) => draft[f.key] !== active[f.key]))
  const hasErrors = Object.values(errors).some(Boolean)

  const handleSave = async () => {
    if (!draft || !active) return
    if (hasErrors) { toast.error(t("invalidHex")); return }
    const patch: Partial<SiteThemeColors> = {}
    for (const f of FIELDS) {
      if (draft[f.key] !== active[f.key]) patch[f.key] = normalizeHex(draft[f.key])
    }
    if (Object.keys(patch).length === 0) return
    setSaving(true)
    try {
      await updateSiteTheme(patch)
      toast.success(t("saved"))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    setResetting(true)
    try {
      await resetSiteTheme()
      setErrors({})
      toast.success(t("resetDone"))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setResetting(false)
    }
  }

  const handleActivate = async (theme: SiteTheme) => {
    if (theme.isActive || activating) return
    setActivating(theme.id)
    try {
      await activateSiteTheme(theme.id)
      setErrors({})
      toast.success(t("activated", { name: theme.name }))
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setActivating(null)
    }
  }

  const openSaveAs = () => {
    if (hasErrors) { toast.error(t("invalidHex")); return }
    setSaveAsName("")
    setSaveAsOpen(true)
  }

  const handleSaveAs = async () => {
    if (!draft || !saveAsName.trim()) return
    setSavingAs(true)
    try {
      const created = await saveSiteThemeAs(saveAsName.trim(), draft)
      toast.success(t("savedAs", { name: created.name }))
      setSaveAsOpen(false)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setSavingAs(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    setDeletingBusy(true)
    try {
      await deleteSiteTheme(deleting.id)
      toast.success(t("deleted", { name: deleting.name }))
      setDeleting(null)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("saveError"))
    } finally {
      setDeletingBusy(false)
    }
  }

  if (loading || !draft || !active) {
    return <p className="text-sm text-muted-foreground">{t("loading")}</p>
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Theme gallery — every saved theme, click one to make it live */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-accent/10 rounded-xl shrink-0">
              <Palette className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{t("galleryTitle")}</p>
              <p className="text-sm text-muted-foreground mt-0.5">{t("galleryDescription")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {themes.map((theme) => {
              const isActivating = activating === theme.id
              return (
                <div
                  key={theme.id}
                  className={cn(
                    "group flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors",
                    theme.isActive ? "border-accent bg-accent/10 text-foreground" : "border-border hover:border-accent/60 text-muted-foreground"
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleActivate(theme)}
                    disabled={!!activating}
                    className="flex items-center gap-2.5 flex-1 min-w-0 disabled:opacity-60"
                  >
                    <span className="flex -space-x-1.5 shrink-0">
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: theme.primary }} />
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: theme.secondary }} />
                    </span>
                    <span className="flex-1 text-left truncate">{theme.name}</span>
                    {isActivating ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                    ) : theme.isActive ? (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    ) : null}
                  </button>
                  {!theme.isBuiltin && !theme.isActive && (
                    <button
                      type="button"
                      onClick={() => setDeleting(theme)}
                      title={t("delete")}
                      className="shrink-0 p-1 rounded-lg text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Editor for the currently active theme */}
      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-5">
          <div>
            <p className="font-semibold text-foreground">{t("editorTitle", { name: active.name })}</p>
            <p className="text-sm text-muted-foreground mt-0.5">{t("editorDescription")}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key} className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t(`fields.${f.labelKey}`)}</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={isValidHex(draft[f.key]) ? draft[f.key] : "#000000"}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="h-9 w-10 shrink-0 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                    aria-label={t(`fields.${f.labelKey}`)}
                  />
                  <Input
                    value={draft[f.key]}
                    onChange={(e) => handleChange(f.key, e.target.value)}
                    className="font-mono text-sm"
                    maxLength={7}
                  />
                </div>
                {errors[f.key] && <p className="text-xs ic-red">{errors[f.key]}</p>}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Button onClick={handleSave} disabled={saving || !dirty || hasErrors} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("save")}
            </Button>
            <Button variant="outline" onClick={openSaveAs} disabled={hasErrors} className="gap-2">
              <Save className="h-4 w-4" />
              {t("saveAsNew")}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={resetting} className="gap-2">
              {resetting ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
              {t("resetToDefault")}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog open={saveAsOpen} onOpenChange={setSaveAsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("saveAsDialog.title")}</DialogTitle>
            <DialogDescription>{t("saveAsDialog.description")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="theme-name">{t("saveAsDialog.nameLabel")}</Label>
            <Input
              id="theme-name"
              value={saveAsName}
              onChange={(e) => setSaveAsName(e.target.value)}
              placeholder={t("saveAsDialog.namePlaceholder")}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveAsOpen(false)}>{t("cancel")}</Button>
            <Button onClick={handleSaveAs} disabled={savingAs || !saveAsName.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2">
              {savingAs && <Loader2 className="h-4 w-4 animate-spin" />}
              {t("saveAsDialog.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleting} onOpenChange={(open) => { if (!open) setDeleting(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
            <AlertDialogDescription>{t("deleteDialog.description", { name: deleting?.name || "" })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingBusy}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleDelete() }} disabled={deletingBusy} className="bg-destructive hover:bg-destructive/90 text-white">
              {deletingBusy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t("deleteDialog.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
