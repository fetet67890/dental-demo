"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { Sparkles, Loader2, Plus, X, Globe, Crown, ChevronDown } from "lucide-react"
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Textarea } from "@core/components/ui/textarea"
import { SearchInput } from "@core/components/ui/search-input"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@core/components/ui/collapsible"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import {
  getSiteLocales, addSiteLocale, removeSiteLocale, setDefaultSiteLocale,
  getAllSiteContent, upsertSiteContent, translateSiteContent,
  type SiteLocale, type GroupedContent, type ContentKeyEntry,
} from "@core/lib/api/content-keys"
import { cn } from "@core/lib/utils"

// Controls display order only — content that hasn't been migrated to a key
// yet just doesn't have a page_group here, so new groups fall to the end
// automatically as more of Hypocrates-Web gets migrated. Extended from the
// original nav/header/footer-only slice once Home/About/Services/Team/Blog/
// Booking were wired up too — see this file's own history for the rollout.
const PAGE_GROUP_ORDER = ['nav', 'header', 'footer', 'home', 'about', 'services', 'team', 'blog', 'booking', 'login', 'signup']

function humanizeKey(key: string): string {
  const last = key.split('.').pop() || key
  return last.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/^./, (c) => c.toUpperCase())
}

const cellId = (key: string, locale: string) => `${key}:${locale}`

// A value counts as "long" once it stops reading as a label/button and
// starts reading as a sentence — past that point a single-line Input just
// hides most of what's being edited behind horizontal scroll. Textarea's
// field-sizing-content (see components/ui/textarea.tsx) then grows it to
// fit instead of a fixed row count that's wrong for half the entries.
const LONG_VALUE_THRESHOLD = 60

export function PermbajtjaSection() {
  const t = useTranslations('permbajtja-section')
  const [locales, setLocales] = useState<SiteLocale[]>([])
  const [content, setContent] = useState<GroupedContent>({})
  const [loading, setLoading] = useState(true)

  // Per-cell draft values, keyed by "key:locale" — lets typing feel instant
  // without touching the rest of the list, and tracks a save/translate
  // in flight per cell independently of every other one.
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [savingCell, setSavingCell] = useState<string | null>(null)
  const [translatingCell, setTranslatingCell] = useState<string | null>(null)

  const [newLocaleCode, setNewLocaleCode] = useState('')
  const [newLocaleLabel, setNewLocaleLabel] = useState('')
  const [addingLocale, setAddingLocale] = useState(false)
  const [addLocaleOpen, setAddLocaleOpen] = useState(false)
  const [removeTarget, setRemoveTarget] = useState<SiteLocale | null>(null)
  const [removingLocale, setRemovingLocale] = useState(false)
  const [defaultTarget, setDefaultTarget] = useState<SiteLocale | null>(null)
  const [settingDefault, setSettingDefault] = useState(false)

  // Bulk translate, scoped to one section/group at a time. Only ever fills
  // cells that are currently empty in a given target language — an existing
  // translation (however it got there) is a human's work and this never
  // overwrites it. Unlike the single-cell sparkle button it's built on, this
  // saves each result immediately instead of landing in a draft: it's one
  // explicit, confirmed action the admin chose, not N individual ones.
  const [translateGroupTarget, setTranslateGroupTarget] = useState<string | null>(null)
  const [translatingGroup, setTranslatingGroup] = useState<string | null>(null)

  // Filters content keys by their name or by any locale's current text —
  // the list only grows as more of Hypocrates-Web gets migrated, so a way
  // to jump straight to one string matters from day one, not just once
  // there are hundreds of keys.
  const [search, setSearch] = useState('')

  // Collapsed by default — with every page now migrated (not just nav/
  // header/footer) a fully-expanded list is hundreds of fields deep before
  // you've even found the one you want. A search hit force-opens its group
  // (see visibleGroups below) so results are never hidden behind a collapse.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const toggleGroup = (group: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(group)) next.delete(group)
      else next.add(group)
      return next
    })
  }

  const load = useCallback(async () => {
    try {
      const [localesRes, contentRes] = await Promise.all([getSiteLocales(), getAllSiteContent()])
      setLocales(localesRes)
      setContent(contentRes)
    } catch {
      toast.error(t('loadError'))
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => { load() }, [load])

  const draftValue = (entry: ContentKeyEntry, locale: string) => {
    const id = cellId(entry.key, locale)
    return id in drafts ? drafts[id] : (entry.values[locale] ?? '')
  }

  const handleChange = (key: string, locale: string, value: string) => {
    setDrafts((d) => ({ ...d, [cellId(key, locale)]: value }))
  }

  const handleSave = async (entry: ContentKeyEntry, locale: string) => {
    const id = cellId(entry.key, locale)
    const value = draftValue(entry, locale)
    if (value === (entry.values[locale] ?? '')) return // unchanged — skip the round-trip
    setSavingCell(id)
    try {
      await upsertSiteContent(entry.key, locale, value, entry.pageGroup)
      setContent((prev) => ({
        ...prev,
        [entry.pageGroup]: prev[entry.pageGroup].map((e) =>
          e.key === entry.key ? { ...e, values: { ...e.values, [locale]: value } } : e
        ),
      }))
      setDrafts((d) => { const next = { ...d }; delete next[id]; return next })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('saveError'))
    } finally {
      setSavingCell(null)
    }
  }

  const handleTranslate = async (entry: ContentKeyEntry, targetLocale: string) => {
    const defaultLocale = locales.find((l) => l.isDefault)?.code
    if (!defaultLocale) return
    const id = cellId(entry.key, targetLocale)
    setTranslatingCell(id)
    try {
      const { translation } = await translateSiteContent(entry.key, defaultLocale, targetLocale)
      // Lands in the draft, same as if the admin had just typed it — still
      // requires blurring/leaving the field to actually save, so an AI
      // suggestion is never published without a human looking at it first.
      setDrafts((d) => ({ ...d, [id]: translation }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('translateError'))
    } finally {
      setTranslatingCell(null)
    }
  }

  const handleTranslateGroup = async () => {
    const group = translateGroupTarget
    const defaultLocale = locales.find((l) => l.isDefault)?.code
    if (!group || !defaultLocale) return
    setTranslateGroupTarget(null)
    setTranslatingGroup(group)

    const targets = locales.filter((l) => !l.isDefault)
    let translated = 0
    let failed = 0
    for (const entry of content[group] ?? []) {
      const source = entry.values[defaultLocale]
      if (!source) continue
      for (const l of targets) {
        if (entry.values[l.code]) continue // already has text — never overwrite a human's translation
        const id = cellId(entry.key, l.code)
        setTranslatingCell(id)
        try {
          const { translation } = await translateSiteContent(entry.key, defaultLocale, l.code)
          await upsertSiteContent(entry.key, l.code, translation, entry.pageGroup)
          setContent((prev) => ({
            ...prev,
            [group]: prev[group].map((e) =>
              e.key === entry.key ? { ...e, values: { ...e.values, [l.code]: translation } } : e
            ),
          }))
          translated++
        } catch {
          failed++
        }
      }
    }
    setTranslatingCell(null)
    setTranslatingGroup(null)

    if (translated === 0 && failed === 0) toast.info(t('translateAll.none'))
    else if (failed > 0) toast.error(t('translateAll.partial', { translated, failed }))
    else toast.success(t('translateAll.success', { count: translated }))
  }

  const handleAddLocale = async () => {
    const code = newLocaleCode.trim().toLowerCase()
    const label = newLocaleLabel.trim()
    if (!code || !label) return
    setAddingLocale(true)
    try {
      await addSiteLocale(code, label)
      setNewLocaleCode('')
      setNewLocaleLabel('')
      setAddLocaleOpen(false)
      await load()
      toast.success(t('languages.added'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('languages.addError'))
    } finally {
      setAddingLocale(false)
    }
  }

  const handleRemoveLocale = async () => {
    if (!removeTarget) return
    setRemovingLocale(true)
    try {
      await removeSiteLocale(removeTarget.code)
      setRemoveTarget(null)
      await load()
      toast.success(t('languages.removed'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('languages.removeError'))
    } finally {
      setRemovingLocale(false)
    }
  }

  const handleSetDefault = async () => {
    if (!defaultTarget) return
    setSettingDefault(true)
    try {
      await setDefaultSiteLocale(defaultTarget.code)
      setDefaultTarget(null)
      await load()
      toast.success(t('languages.defaultSet'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('languages.defaultSetError'))
    } finally {
      setSettingDefault(false)
    }
  }

  const defaultLocale = locales.find((l) => l.isDefault)?.code
  const orderedGroups = useMemo(() => Object.keys(content).sort((a, b) => {
    const ai = PAGE_GROUP_ORDER.indexOf(a)
    const bi = PAGE_GROUP_ORDER.indexOf(b)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  }), [content])

  // Matches on the key itself, its humanized label, or any locale's current
  // text — so searching "home" finds nav.home even before you know its key
  // name, and searching actual page copy finds the right cell directly.
  const query = search.trim().toLowerCase()
  const matchesSearch = (entry: ContentKeyEntry) => {
    if (!query) return true
    if (entry.key.toLowerCase().includes(query)) return true
    if (humanizeKey(entry.key).toLowerCase().includes(query)) return true
    return Object.values(entry.values).some((v) => v.toLowerCase().includes(query))
  }

  const visibleGroups = useMemo(
    () => orderedGroups
      .map((group) => ({ group, entries: (content[group] ?? []).filter(matchesSearch) }))
      .filter(({ entries }) => entries.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [orderedGroups, content, query]
  )

  const groupLabel = (group: string) => (t.has(`groups.${group}`) ? t(`groups.${group}`) : group)

  // A group is open if the admin toggled it open, or a search is active and
  // it has a match — either way nothing found stays hidden behind a collapse.
  const isOpen = (group: string) => !!query || expandedGroups.has(group)

  // Per-locale fill count for a group's header — lets an admin spot "still
  // needs Italian" across a page without opening it first.
  const completionFor = (group: string, locale: string) => {
    const entries = content[group] ?? []
    const filled = entries.filter((e) => (e.values[locale] ?? '').trim() !== '').length
    return { filled, total: entries.length }
  }

  const allExpanded = orderedGroups.length > 0 && orderedGroups.every((g) => expandedGroups.has(g))
  const toggleExpandAll = () => {
    setExpandedGroups(allExpanded ? new Set() : new Set(orderedGroups))
  }

  if (loading) return <p className="text-sm text-muted-foreground">{t('loading')}</p>

  return (
    <div className="max-w-4xl space-y-6">
      <p className="text-sm text-muted-foreground">{t('intro')}</p>

      {/* Language management — a settings-list pattern (identity left,
          actions right, divided rows) instead of wrapped pills with icon
          buttons crammed inside them. "Add a language" is its own row at
          the bottom of the same list, collapsed to a single "+" affordance
          until clicked, rather than two input fields permanently floating
          under the list with nothing tying them to it. */}
      <Card className="border-border/50 shadow-sm py-0 gap-0 overflow-hidden">
        <CardHeader className="py-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <Globe className="h-5 w-5 text-accent" />
            {t('languages.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="border-t border-border divide-y divide-border">
            {locales.map((l) => (
              <div key={l.code} className="flex items-center gap-3 px-4 sm:px-6 py-3.5 group">
                <span
                  className={cn(
                    'flex items-center justify-center w-10 h-10 rounded-xl text-xs font-bold uppercase shrink-0 tabular-nums',
                    l.isDefault ? 'bg-accent text-accent-foreground' : 'bg-secondary text-muted-foreground'
                  )}
                  aria-hidden
                >
                  {l.code}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{l.label}</p>
                  {l.isDefault ? (
                    <p className="flex items-center gap-1 text-xs font-medium text-accent">
                      <Crown className="h-3 w-3" />
                      {t('languages.default')}
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{l.code}</p>
                  )}
                </div>
                {!l.isDefault && (
                  <div className="flex items-center gap-1 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDefaultTarget(l)}
                      className="h-8 px-2.5 gap-1.5 text-muted-foreground hover:text-accent hover:bg-accent/10"
                    >
                      <Crown className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">{t('languages.setDefaultButton')}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setRemoveTarget(l)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      aria-label={t('languages.removeButton')}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>
            ))}

            {addLocaleOpen ? (
              <div className="flex flex-wrap items-end gap-3 px-4 sm:px-6 py-4 bg-secondary/30">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('languages.codeLabel')}</label>
                  <Input value={newLocaleCode} onChange={(e) => setNewLocaleCode(e.target.value)} placeholder="it" className="w-20 bg-card" maxLength={5} autoFocus />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t('languages.nameLabel')}</label>
                  <Input value={newLocaleLabel} onChange={(e) => setNewLocaleLabel(e.target.value)} placeholder="Italiano" className="w-40 bg-card" />
                </div>
                <Button onClick={handleAddLocale} disabled={addingLocale || !newLocaleCode.trim() || !newLocaleLabel.trim()} size="sm" className="bg-accent hover:bg-accent/90 gap-2">
                  {addingLocale ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  {t('languages.addButton')}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAddLocaleOpen(false); setNewLocaleCode(''); setNewLocaleLabel('') }}>
                  {t('cancel')}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddLocaleOpen(true)}
                className="w-full flex items-center gap-2 px-4 sm:px-6 py-3.5 text-sm font-semibold text-accent hover:bg-accent/5 transition-colors"
              >
                <span className="flex items-center justify-center w-10 h-10 rounded-xl border-2 border-dashed border-accent/40 shrink-0">
                  <Plus className="h-4 w-4" />
                </span>
                {t('languages.addButton')}
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Search + jump-to-group + expand/collapse all */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sticky top-0 z-10 -mx-1 px-1 py-2 bg-background/85 backdrop-blur-sm">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('search.placeholder')}
          containerClassName="w-full sm:max-w-xs"
        />
        <div className="flex flex-wrap items-center gap-1.5">
          {orderedGroups.length > 1 && (
            <>
              {orderedGroups.map((group) => (
                <button
                  key={group}
                  type="button"
                  onClick={() => {
                    setExpandedGroups((prev) => new Set(prev).add(group))
                    document.getElementById(`group-${group}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                  }}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border border-border text-muted-foreground hover:text-foreground hover:border-accent/50 transition-colors"
                >
                  {groupLabel(group)}
                </button>
              ))}
              <span className="w-px h-4 bg-border mx-0.5" aria-hidden />
            </>
          )}
          <button
            type="button"
            onClick={toggleExpandAll}
            className="px-2.5 py-1 rounded-full text-xs font-semibold text-accent hover:bg-accent/10 transition-colors"
          >
            {allExpanded ? t('collapseAll') : t('expandAll')}
          </button>
        </div>
      </div>

      {/* Content keys, grouped by page — each group is a collapsible card so
          a ~150-field site doesn't render as one unbroken scroll. */}
      {visibleGroups.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-8">{t('search.noResults', { query: search })}</p>
      )}
      {visibleGroups.map(({ group, entries }) => {
        const open = isOpen(group)
        return (
          <Card key={group} id={`group-${group}`} className="border-border/50 shadow-sm scroll-mt-20 py-0 overflow-hidden gap-0">
            <Collapsible open={open} onOpenChange={() => toggleGroup(group)}>
              {/* CollapsibleTrigger wraps only the title (asChild renders it
                  as CardTitle's own <div>, not a <button>) — kept separate
                  from CardAction's own real <button> below so the two never
                  nest, which is invalid HTML and breaks the inner click. */}
              <CardHeader className="py-4 hover:bg-secondary/30 transition-colors">
                <CollapsibleTrigger asChild>
                  <CardTitle role="button" tabIndex={0} className="flex items-center gap-2 text-base cursor-pointer select-none outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm">
                    <ChevronDown className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", open && "rotate-180")} />
                    {groupLabel(group)}
                    <span className="text-[10px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                      {query ? t('search.matchCount', { count: entries.length, total: content[group].length }) : entries.length}
                    </span>
                    {/* Per-locale completion — a quiet way to spot "still
                        needs Italian" without opening every card. */}
                    <span className="hidden sm:flex items-center gap-1 ml-1">
                      {locales.map((l) => {
                        const { filled, total } = completionFor(group, l.code)
                        const complete = total > 0 && filled === total
                        return (
                          <span
                            key={l.code}
                            title={`${l.label}: ${filled}/${total}`}
                            className={cn(
                              "text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full tabular-nums",
                              complete ? "text-emerald-700 bg-emerald-500/10 dark:text-emerald-400" : "text-amber-700 bg-amber-500/10 dark:text-amber-400"
                            )}
                          >
                            {l.code} {filled}/{total}
                          </span>
                        )
                      })}
                    </span>
                  </CardTitle>
                </CollapsibleTrigger>
                {locales.some((l) => !l.isDefault) && (
                  <CardAction>
                    <button
                      type="button"
                      onClick={() => setTranslateGroupTarget(group)}
                      disabled={translatingGroup === group}
                      className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg text-accent hover:bg-accent/10 transition-colors disabled:opacity-50"
                    >
                      {translatingGroup === group ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                      {t('translateAll.button')}
                    </button>
                  </CardAction>
                )}
              </CardHeader>
              <CollapsibleContent>
                <CardContent className="space-y-5 pt-2 pb-5">
                  {entries.map((entry) => (
                    <div key={entry.key} className="space-y-2 pb-5 border-b border-border/40 last:border-0 last:pb-0">
                      <p className="text-xs font-semibold text-muted-foreground">
                        {humanizeKey(entry.key)}
                        <span className="ml-2 font-mono font-normal text-[10px] opacity-50">{entry.key}</span>
                      </p>
                      <div className="grid gap-2 grid-cols-1 sm:grid-cols-[repeat(auto-fit,minmax(240px,1fr))]">
                        {locales.map((l) => {
                          const id = cellId(entry.key, l.code)
                          const canTranslate = !l.isDefault && defaultLocale && !!entry.values[defaultLocale]
                          const value = draftValue(entry, l.code)
                          const isLong = value.length > LONG_VALUE_THRESHOLD
                          const Field = isLong ? Textarea : Input
                          return (
                            <div key={l.code} className="flex items-start gap-1.5">
                              <span title={l.label} className="text-[10px] font-bold uppercase text-muted-foreground w-6 shrink-0 pt-2">{l.code}</span>
                              <Field
                                value={value}
                                onChange={(e) => handleChange(entry.key, l.code, e.target.value)}
                                onBlur={() => handleSave(entry, l.code)}
                                className={cn("text-sm", isLong && "min-h-9 py-1.5")}
                                {...(isLong ? { rows: 2 } : {})}
                              />
                              {savingCell === id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0 mt-2" />
                              ) : !l.isDefault ? (
                                <button
                                  type="button"
                                  onClick={() => handleTranslate(entry, l.code)}
                                  disabled={!canTranslate || translatingCell === id || translatingGroup === entry.pageGroup}
                                  title={t('translateButton')}
                                  className="shrink-0 p-1.5 mt-0.5 rounded-lg text-muted-foreground hover:text-accent hover:bg-accent/10 transition-colors disabled:opacity-40"
                                >
                                  {translatingCell === id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                                </button>
                              ) : (
                                <span className="w-[26px] shrink-0" aria-hidden />
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        )
      })}

      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !removingLocale && !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('languages.removeConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {removeTarget && t('languages.removeConfirmBody', { label: removeTarget.label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingLocale}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleRemoveLocale() }} disabled={removingLocale} className="bg-destructive hover:bg-destructive/90 text-white">
              {removingLocale ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('languages.removeConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!defaultTarget} onOpenChange={(o) => !settingDefault && !o && setDefaultTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('languages.setDefaultConfirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {defaultTarget && t('languages.setDefaultConfirmBody', { label: defaultTarget.label })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settingDefault}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleSetDefault() }} disabled={settingDefault} className="bg-accent hover:bg-accent/90">
              {settingDefault ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {t('languages.setDefaultConfirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!translateGroupTarget} onOpenChange={(o) => !translatingGroup && !o && setTranslateGroupTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('translateAll.confirmTitle')}</AlertDialogTitle>
            <AlertDialogDescription>
              {translateGroupTarget && t('translateAll.confirmBody', { group: groupLabel(translateGroupTarget) })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={(e) => { e.preventDefault(); handleTranslateGroup() }} className="bg-accent hover:bg-accent/90">
              {t('translateAll.confirmButton')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
