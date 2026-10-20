"use client"

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { toast } from 'sonner'
import { Check, Loader2, Upload, ImageIcon, Languages, Palette, Type, Layers, Sparkles, PartyPopper, Rocket, MonitorSmartphone, FileSpreadsheet, FileText, CheckCircle2, AlertTriangle, Download } from 'lucide-react'
import { AL, GB } from 'country-flag-icons/react/3x2'
import { Button } from '@core/components/ui/button'
import { useSetupWizard } from '@core/context/setup-wizard-context'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { setClinicTheme, setClinicFontStyle, setClinicSurfaceStyle, uploadClinicLogo, uploadClinicFavicon } from '@core/lib/api/settings'
import { parseImportFile, commitImportRows, type ImportEntity, type AnyImportRow } from '@core/lib/api/data-import'
import { IMPORT_ENTITIES, configFor, sampleCsvFor } from '@core/components/settings/import-entity-configs'
import { SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from '@core/lib/i18n-config'
import { THEME_PRESET_KEYS, THEME_PRESETS, FONT_PRESET_KEYS, FONT_PRESET_VARS, SURFACE_STYLES, type ThemePreset, type FontPreset, type SurfaceStyle } from '@core/lib/theme-presets'
import { cn } from '@core/lib/utils'

const FLAG_COMPONENTS: Record<string, React.ComponentType<{ className?: string; title?: string }>> = { AL, GB }

// 'import' sits right before 'finish' on purpose — every step's existing
// "Skip" button already means "stop the wizard here" (see
// setup-wizard-context.tsx's `skip: finish`), not "skip just this step", so
// placing the new step last-before-finish makes that existing button behave
// exactly like a per-step skip without any new skip logic needed.
const STEPS = ['welcome', 'language', 'color', 'font', 'surface', 'logo', 'favicon', 'import', 'finish'] as const
type StepKey = typeof STEPS[number]

// The first-login setup wizard — admin-only, clinic-wide (see
// context/setup-wizard-context.tsx for the auto-launch/blocking-modal
// wiring). Every step applies its choice immediately through the same API
// calls Aparenca itself uses, so "Skip" never has anything to roll back —
// it just stops asking further questions, exactly like skipping mid-way
// through the guided tour leaves whatever was already done in place.
export function SetupWizardOverlay() {
  const { active, finish, skip } = useSetupWizard()
  const { themePreset, fontPreset, surfaceStyle, logoUrl, faviconUrl, reload } = useClinicSettings()
  const locale = useLocale() as Locale
  const router = useRouter()
  const t = useTranslations('setup-wizard')
  const tAparenca = useTranslations('aparenca-section')
  // Reused verbatim from the full Importo page rather than re-translated
  // here — same two strings, one source of truth in both languages.
  const tImport = useTranslations('importo-section')

  const [stepIndex, setStepIndex] = useState(0)

  const [themeSaving, setThemeSaving] = useState<ThemePreset | null>(null)
  const [fontSaving, setFontSaving] = useState<FontPreset | null>(null)
  const [surfaceSaving, setSurfaceSaving] = useState<SurfaceStyle | null>(null)

  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [logoLoading, setLogoLoading] = useState(false)
  const logoInputRef = useRef<HTMLInputElement>(null)

  const [faviconFile, setFaviconFile] = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconLoading, setFaviconLoading] = useState(false)
  const faviconInputRef = useRef<HTMLInputElement>(null)

  // Data-import step — a condensed entry point into the same engine the
  // full Konfigurimi → Importo page uses (see lib/api/data-import.ts,
  // components/settings/import-entity-configs.tsx). Deliberately lighter
  // than that page: no per-row checkbox selection or import-history table,
  // just "pick a file, we import every valid row" — the granular version is
  // one click away later for anyone who wants it (importLaterHint below).
  const [importEntity, setImportEntity] = useState<ImportEntity>('patients')
  const [importRows, setImportRows] = useState<AnyImportRow[] | null>(null)
  const [importTotals, setImportTotals] = useState<{ total: number; valid: number; invalid: number } | null>(null)
  const [importParsing, setImportParsing] = useState(false)
  const [importCommitting, setImportCommitting] = useState(false)
  const [importResult, setImportResult] = useState<{ imported: number; failed: number } | null>(null)
  const importInputRef = useRef<HTMLInputElement>(null)

  if (!active) return null

  const step: StepKey = STEPS[stepIndex]
  const isFirst = stepIndex === 0
  const isLast = stepIndex === STEPS.length - 1

  const next = () => setStepIndex((i) => Math.min(STEPS.length - 1, i + 1))
  const prev = () => setStepIndex((i) => Math.max(0, i - 1))

  const switchLocale = (next: Locale) => {
    if (next === locale) return
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`
    router.refresh()
  }

  const handleThemeChange = async (preset: ThemePreset) => {
    if (preset === themePreset || themeSaving) return
    setThemeSaving(preset)
    try {
      await setClinicTheme(preset)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setThemeSaving(null)
    }
  }

  const handleFontChange = async (preset: FontPreset) => {
    if (preset === fontPreset || fontSaving) return
    setFontSaving(preset)
    try {
      await setClinicFontStyle(preset)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setFontSaving(null)
    }
  }

  const handleSurfaceChange = async (surface: SurfaceStyle) => {
    if (surface === surfaceStyle || surfaceSaving) return
    setSurfaceSaving(surface)
    try {
      await setClinicSurfaceStyle(surface)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setSurfaceSaving(null)
    }
  }

  const handleLogoFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const saveLogo = async () => {
    if (!logoFile) return
    setLogoLoading(true)
    try {
      await uploadClinicLogo(logoFile)
      await reload()
      setLogoFile(null)
      setLogoPreview(null)
      toast.success(t('logo.uploaded'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setLogoLoading(false)
    }
  }

  const handleFaviconFile = (file: File | null) => {
    if (!file || !file.type.startsWith('image/')) return
    setFaviconFile(file)
    setFaviconPreview(URL.createObjectURL(file))
  }

  const saveFavicon = async () => {
    if (!faviconFile) return
    setFaviconLoading(true)
    try {
      await uploadClinicFavicon(faviconFile)
      await reload()
      setFaviconFile(null)
      setFaviconPreview(null)
      toast.success(t('favicon.uploaded'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setFaviconLoading(false)
    }
  }

  const resetImportPreview = () => {
    setImportRows(null)
    setImportTotals(null)
    setImportResult(null)
  }

  const switchImportEntity = (next: ImportEntity) => {
    setImportEntity(next)
    resetImportPreview()
  }

  const handleImportFile = async (file: File | null) => {
    if (!file) return
    setImportParsing(true)
    resetImportPreview()
    try {
      const data = await parseImportFile(importEntity, file)
      setImportRows(data.rows as AnyImportRow[])
      setImportTotals({ total: data.totalRows, valid: data.validRows, invalid: data.invalidRows })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setImportParsing(false)
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const handleImportCommit = async () => {
    if (!importRows) return
    const validRows = importRows.filter((r) => r.valid)
    if (validRows.length === 0) return
    setImportCommitting(true)
    try {
      const res = await commitImportRows(importEntity, validRows as never[])
      setImportResult({ imported: res.imported, failed: res.failed })
      setImportRows(null)
      setImportTotals(null)
      if (res.failed > 0) toast.error(t('import.failedCount', { count: res.failed }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('genericError'))
    } finally {
      setImportCommitting(false)
    }
  }

  const downloadImportSample = () => {
    const config = configFor(importEntity)
    const blob = new Blob([sampleCsvFor(config)], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = config.sampleFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl p-6 sm:p-8 max-h-[90vh] overflow-y-auto">
        <div className="flex gap-1.5 mb-6 justify-center">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={cn('h-1.5 rounded-full transition-all', i === stepIndex ? 'w-6 bg-accent' : 'w-1.5 bg-border')}
            />
          ))}
        </div>

        {step === 'welcome' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <Rocket className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t('welcome.title')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('welcome.body')}</p>
          </div>
        )}

        {step === 'language' && (
          <div>
            <StepHeader icon={<Languages className="h-5 w-5 text-accent" />} title={t('language.title')} body={t('language.body')} />
            <div className="grid grid-cols-2 gap-2">
              {SUPPORTED_LOCALES.map((l) => {
                const Flag = FLAG_COMPONENTS[l.countryCode]
                const active = l.code === locale
                return (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => switchLocale(l.code)}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-3 rounded-xl border text-sm font-medium transition-colors',
                      active ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                    )}
                  >
                    <Flag className="h-4 w-5.5 rounded-[2px] shrink-0" title={l.label} />
                    <span className="flex-1 text-left">{l.label}</span>
                    {active && <Check className="h-3.5 w-3.5 text-accent shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 'color' && (
          <div>
            <StepHeader icon={<Palette className="h-5 w-5 text-accent" />} title={t('color.title')} body={t('color.body')} />
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_PRESET_KEYS.map((key) => {
                const preset = THEME_PRESETS[key]
                const activeTile = key === themePreset
                const saving = themeSaving === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleThemeChange(key)}
                    disabled={!!themeSaving}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60',
                      activeTile ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                    )}
                  >
                    <span className="flex -space-x-1.5 shrink-0">
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: preset.sidebar }} />
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: preset.accent }} />
                    </span>
                    <span className="flex-1 text-left truncate">{tAparenca(`colors.presets.${key}`)}</span>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" /> : activeTile ? <Check className="h-3.5 w-3.5 text-accent shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{t('color.moreHint')}</p>
          </div>
        )}

        {step === 'font' && (
          <div>
            <StepHeader icon={<Type className="h-5 w-5 text-accent" />} title={t('font.title')} body={t('font.body')} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FONT_PRESET_KEYS.map((key) => {
                const activeTile = key === fontPreset
                const saving = fontSaving === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFontChange(key)}
                    disabled={!!fontSaving}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 text-left',
                      activeTile ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                    )}
                  >
                    <span className="flex-1 min-w-0 truncate text-base" style={{ fontFamily: `var(${FONT_PRESET_VARS[key]})` }}>
                      {tAparenca(`font.presets.${key}`)}
                    </span>
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" /> : activeTile ? <Check className="h-3.5 w-3.5 text-accent shrink-0" /> : null}
                  </button>
                )
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">{t('font.moreHint')}</p>
          </div>
        )}

        {step === 'surface' && (
          <div>
            <StepHeader icon={<Layers className="h-5 w-5 text-accent" />} title={t('surface.title')} body={t('surface.body')} />
            <div className="grid grid-cols-2 gap-2">
              {SURFACE_STYLES.map((s) => {
                const activeTile = s === surfaceStyle
                const saving = surfaceSaving === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleSurfaceChange(s)}
                    disabled={!!surfaceSaving}
                    className={cn(
                      'flex items-center justify-center gap-2 px-3 py-3 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60',
                      activeTile ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                    )}
                  >
                    {s === 'glass' ? <Sparkles className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                    {tAparenca(`surface.options.${s}`)}
                    {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : activeTile ? <Check className="h-3.5 w-3.5" /> : null}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {step === 'logo' && (
          <div>
            <StepHeader icon={<MonitorSmartphone className="h-5 w-5 text-accent" />} title={t('logo.title')} body={t('logo.body')} />
            {(logoPreview || logoUrl) && (
              <div className="rounded-xl bg-sidebar p-4 flex items-center justify-center min-h-[64px] mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={logoPreview ?? logoUrl!} alt="Logo preview" className="h-9 max-w-[220px] w-auto object-contain" />
              </div>
            )}
            <div
              className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors border-border hover:border-accent/60"
              onClick={() => logoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleLogoFile(e.dataTransfer.files[0] ?? null) }}
            >
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-center text-muted-foreground">{logoFile ? logoFile.name : t('logo.dropzone')}</p>
              <input ref={logoInputRef} type="file" accept="image/png,image/jpeg,image/svg+xml,image/webp" className="hidden" onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)} />
            </div>
            {logoFile && (
              <Button onClick={saveLogo} disabled={logoLoading} className="mt-3 bg-accent hover:bg-accent/90 gap-2">
                {logoLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t('logo.submit')}
              </Button>
            )}
          </div>
        )}

        {step === 'favicon' && (
          <div>
            <StepHeader icon={<ImageIcon className="h-5 w-5 text-accent" />} title={t('favicon.title')} body={t('favicon.body')} />
            {(faviconPreview || faviconUrl) && (
              <div className="rounded-xl bg-secondary/50 p-3 flex items-center gap-3 mb-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={faviconPreview ?? faviconUrl!} alt="Favicon preview" className="h-8 w-8 object-contain rounded" />
                <p className="text-sm text-muted-foreground">{t('favicon.previewCaption')}</p>
              </div>
            )}
            <div
              className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors border-border hover:border-accent/60"
              onClick={() => faviconInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFaviconFile(e.dataTransfer.files[0] ?? null) }}
            >
              <ImageIcon className="h-7 w-7 text-muted-foreground" />
              <p className="text-sm text-center text-muted-foreground">{faviconFile ? faviconFile.name : t('favicon.dropzone')}</p>
              <input ref={faviconInputRef} type="file" accept="image/png,image/x-icon,image/svg+xml,image/jpeg" className="hidden" onChange={(e) => handleFaviconFile(e.target.files?.[0] ?? null)} />
            </div>
            {faviconFile && (
              <Button onClick={saveFavicon} disabled={faviconLoading} className="mt-3 bg-accent hover:bg-accent/90 gap-2">
                {faviconLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t('favicon.submit')}
              </Button>
            )}
          </div>
        )}

        {step === 'import' && (
          <div>
            <StepHeader icon={<FileSpreadsheet className="h-5 w-5 text-accent" />} title={t('import.title')} body={t('import.body')} />

            <div className="flex flex-wrap gap-1.5 mb-3">
              {IMPORT_ENTITIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => switchImportEntity(c.key)}
                  className={cn(
                    'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors',
                    importEntity === c.key ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                  )}
                >
                  <c.icon className="h-3.5 w-3.5" />
                  {tImport(c.entityLabelKey)}
                </button>
              ))}
            </div>

            {!importTotals && !importResult && (
              <div
                className="border-2 border-dashed rounded-xl p-5 flex flex-col items-center gap-2 cursor-pointer transition-colors border-border hover:border-accent/60"
                onClick={() => importInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleImportFile(e.dataTransfer.files[0] ?? null) }}
              >
                {importParsing ? <Loader2 className="h-7 w-7 text-muted-foreground animate-spin" /> : <FileText className="h-7 w-7 text-muted-foreground" />}
                <p className="text-sm text-center text-muted-foreground">{importParsing ? tImport('reading') : t('import.dropzone')}</p>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={(e) => handleImportFile(e.target.files?.[0] ?? null)}
                />
              </div>
            )}

            {importTotals && (
              <div className="rounded-xl border border-border/50 p-4 space-y-3">
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  <span className="flex items-center gap-1.5 text-muted-foreground">
                    <FileText className="h-3.5 w-3.5" />{t('import.totalRows', { count: importTotals.total })}
                  </span>
                  <span className="flex items-center gap-1.5 ic-green">
                    <CheckCircle2 className="h-3.5 w-3.5" />{t('import.validRows', { count: importTotals.valid })}
                  </span>
                  {importTotals.invalid > 0 && (
                    <span className="flex items-center gap-1.5 ic-red">
                      <AlertTriangle className="h-3.5 w-3.5" />{t('import.invalidRows', { count: importTotals.invalid })}
                    </span>
                  )}
                </div>
                {importTotals.valid > 0 ? (
                  <Button onClick={handleImportCommit} disabled={importCommitting} className="w-full gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                    {importCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    {t('import.importButton', { count: importTotals.valid })}
                  </Button>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">{t('import.noValidRows')}</p>
                )}
                <Button variant="ghost" size="sm" onClick={resetImportPreview} className="w-full text-muted-foreground">
                  {t('import.chooseAnother')}
                </Button>
              </div>
            )}

            {importResult && (
              <div className="rounded-xl border border-border/50 p-4 flex items-center gap-2.5">
                <CheckCircle2 className="h-5 w-5 ic-green shrink-0" />
                <p className="text-sm text-foreground">
                  {t('import.importedCount', { count: importResult.imported })}
                  {importResult.failed > 0 && ` ${t('import.failedCount', { count: importResult.failed })}`}
                </p>
              </div>
            )}

            <div className="flex items-center justify-between gap-2 mt-3">
              <button type="button" onClick={downloadImportSample} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors">
                <Download className="h-3.5 w-3.5" />
                {tImport('downloadSample')}
              </button>
              <p className="text-xs text-muted-foreground text-right">{t('import.laterHint')}</p>
            </div>
          </div>
        )}

        {step === 'finish' && (
          <div className="text-center py-4">
            <div className="mx-auto mb-4 h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center">
              <PartyPopper className="h-7 w-7 text-accent" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">{t('finish.title')}</h2>
            <p className="text-sm text-muted-foreground leading-relaxed">{t('finish.body')}</p>
          </div>
        )}

        <div className="flex items-center gap-2 mt-8">
          {!isFirst && (
            <Button variant="ghost" onClick={prev}>{t('back')}</Button>
          )}
          {!isLast && (
            <Button variant="ghost" onClick={skip} className="text-muted-foreground">{t('skip')}</Button>
          )}
          <Button onClick={isLast ? finish : next} className="ml-auto bg-accent hover:bg-accent/90 text-accent-foreground">
            {isLast ? t('finishButton') : t('next')}
          </Button>
        </div>
      </div>
    </div>
  )
}

function StepHeader({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="mb-4">
      <p className="flex items-center gap-2 text-base font-semibold text-foreground mb-1.5">
        {icon}
        {title}
      </p>
      <p className="text-sm text-muted-foreground">{body}</p>
    </div>
  )
}
