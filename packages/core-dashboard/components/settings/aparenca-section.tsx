"use client"

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@core/components/ui/tabs'
import { toast } from 'sonner'
import { Upload, ImageIcon, MonitorSmartphone, Loader2, MessageCircle, Languages, Check, Palette, Clock, Coins, Layers, Sparkles, Type, Trash2, FileType } from 'lucide-react'
import { AL, GB, EU, US } from 'country-flag-icons/react/3x2'
import { Input } from '@core/components/ui/input'
import { uploadClinicLogo, uploadClinicFavicon, uploadClinicSidebarIcon, uploadClinicChatbotIcon, uploadClinicCustomFont, removeClinicCustomFont, setClinicTheme, setClinicSurfaceStyle, setClinicFontStyle, setClinicHours } from '@core/lib/api/settings'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { useCurrency } from '@core/context/currency-context'
import { SUPPORTED_LOCALES, LOCALE_COOKIE, type Locale } from '@core/lib/i18n-config'
import { SUPPORTED_CURRENCIES, type Currency } from '@core/lib/currency'
import { THEME_PRESET_KEYS, THEME_PRESETS, type ThemePreset, SURFACE_STYLES, type SurfaceStyle, FONT_PRESET_KEYS, FONT_PRESET_VARS, type FontPreset, CUSTOM_FONT_FAMILY, buildCustomPalette } from '@core/lib/theme-presets'
import { isValidHex, normalizeHex } from '@core/lib/color-utils'
import { cn } from '@core/lib/utils'

const FLAG_COMPONENTS: Record<string, React.ComponentType<{ className?: string; title?: string }>> = { AL, GB, EU, US }
const CURRENCY_FLAGS: Record<Currency, string> = { LEK: 'AL', EUR: 'EU', USD: 'US', GBP: 'GB' }

export function AparencaSection() {
  const t = useTranslations('aparenca-section')
  const router = useRouter()
  const locale = useLocale() as Locale
  const { logoUrl, faviconUrl, sidebarIconUrl, chatbotIconUrl, themePreset, customThemeColor, surfaceStyle, fontPreset, customFontUrl, customFontName, openTime, closeTime, reload } = useClinicSettings()
  const { currency, setCurrency } = useCurrency()

  const switchLocale = (next: Locale) => {
    if (next === locale) return
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000`
    router.refresh()
  }

  const [themeSaving, setThemeSaving] = useState<ThemePreset | null>(null)

  const handleThemeChange = async (preset: ThemePreset) => {
    if (preset === themePreset || themeSaving) return
    setThemeSaving(preset)
    try {
      await setClinicTheme(preset)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('colors.error'))
    } finally {
      setThemeSaving(null)
    }
  }

  // Seeded from whatever's already stored so reopening the picker on an
  // already-custom theme shows the color actually in use, not a fixed default.
  const [customColorDraft, setCustomColorDraft] = useState(customThemeColor || '#3b82f6')
  const [customColorError, setCustomColorError] = useState('')
  const [customColorSaving, setCustomColorSaving] = useState(false)

  useEffect(() => {
    if (customThemeColor) setCustomColorDraft(customThemeColor)
  }, [customThemeColor])

  const handleCustomColorHexInput = (value: string) => {
    setCustomColorDraft(value)
    setCustomColorError(isValidHex(value) ? '' : t('colors.custom.errorFormat'))
  }

  const handleSaveCustomColor = async () => {
    if (!isValidHex(customColorDraft)) { setCustomColorError(t('colors.custom.errorFormat')); return }
    setCustomColorSaving(true)
    try {
      await setClinicTheme('custom', normalizeHex(customColorDraft))
      await reload()
      toast.success(t('colors.custom.saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('colors.error'))
    } finally {
      setCustomColorSaving(false)
    }
  }

  const [surfaceSaving, setSurfaceSaving] = useState<SurfaceStyle | null>(null)

  const handleSurfaceChange = async (surface: SurfaceStyle) => {
    if (surface === surfaceStyle || surfaceSaving) return
    setSurfaceSaving(surface)
    try {
      await setClinicSurfaceStyle(surface)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('surface.error'))
    } finally {
      setSurfaceSaving(null)
    }
  }

  const [fontSaving, setFontSaving] = useState<FontPreset | null>(null)

  const handleFontChange = async (preset: FontPreset) => {
    if (preset === fontPreset || fontSaving) return
    setFontSaving(preset)
    try {
      await setClinicFontStyle(preset)
      await reload()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('font.error'))
    } finally {
      setFontSaving(null)
    }
  }

  const [customFontFile, setCustomFontFile]   = useState<File | null>(null)
  const [customFontLoading, setCustomFontLoading] = useState(false)
  const [customFontRemoving, setCustomFontRemoving] = useState(false)
  const [customFontError, setCustomFontError] = useState('')
  const customFontInputRef = useRef<HTMLInputElement>(null)

  const CUSTOM_FONT_EXTENSIONS = ['.woff2', '.woff', '.ttf', '.otf']

  const handleCustomFontFile = (file: File | null) => {
    if (!file) return
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase()
    if (!CUSTOM_FONT_EXTENSIONS.includes(ext)) {
      setCustomFontError(t('font.custom.errorType'))
      return
    }
    setCustomFontFile(file)
    setCustomFontError('')
  }

  const saveCustomFont = async () => {
    if (!customFontFile) { setCustomFontError(t('font.custom.chooseFile')); return }
    setCustomFontLoading(true)
    try {
      await uploadClinicCustomFont(customFontFile)
      await reload()
      setCustomFontFile(null)
      toast.success(t('font.custom.uploaded'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('font.custom.error'))
    } finally {
      setCustomFontLoading(false)
    }
  }

  const handleRemoveCustomFont = async () => {
    setCustomFontRemoving(true)
    try {
      await removeClinicCustomFont()
      await reload()
      toast.success(t('font.custom.removed'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('font.custom.error'))
    } finally {
      setCustomFontRemoving(false)
    }
  }

  const [openTimeDraft, setOpenTimeDraft]   = useState(openTime)
  const [closeTimeDraft, setCloseTimeDraft] = useState(closeTime)
  const [hoursSaving, setHoursSaving]       = useState(false)

  useEffect(() => { setOpenTimeDraft(openTime) }, [openTime])
  useEffect(() => { setCloseTimeDraft(closeTime) }, [closeTime])

  const hoursChanged = openTimeDraft !== openTime || closeTimeDraft !== closeTime

  const handleSaveHours = async () => {
    setHoursSaving(true)
    try {
      await setClinicHours(openTimeDraft, closeTimeDraft)
      await reload()
      toast.success(t('hours.saved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('hours.error'))
    } finally {
      setHoursSaving(false)
    }
  }

  const [logoFile, setLogoFile]           = useState<File | null>(null)
  const [logoPreview, setLogoPreview]     = useState<string | null>(null)
  const [logoLoading, setLogoLoading]     = useState(false)
  const [logoError, setLogoError]         = useState('')

  const [faviconFile, setFaviconFile]     = useState<File | null>(null)
  const [faviconPreview, setFaviconPreview] = useState<string | null>(null)
  const [faviconLoading, setFaviconLoading] = useState(false)
  const [faviconError, setFaviconError]   = useState('')

  const [sidebarIconFile, setSidebarIconFile]       = useState<File | null>(null)
  const [sidebarIconPreview, setSidebarIconPreview] = useState<string | null>(null)
  const [sidebarIconLoading, setSidebarIconLoading] = useState(false)
  const [sidebarIconError, setSidebarIconError]     = useState('')

  const [chatbotIconFile, setChatbotIconFile]       = useState<File | null>(null)
  const [chatbotIconPreview, setChatbotIconPreview] = useState<string | null>(null)
  const [chatbotIconLoading, setChatbotIconLoading] = useState(false)
  const [chatbotIconError, setChatbotIconError]     = useState('')

  const logoInputRef        = useRef<HTMLInputElement>(null)
  const faviconInputRef     = useRef<HTMLInputElement>(null)
  const sidebarIconInputRef = useRef<HTMLInputElement>(null)
  const chatbotIconInputRef = useRef<HTMLInputElement>(null)

  const handleLogoFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setLogoError(t('errors.chooseImage'))
      return
    }
    setLogoFile(file)
    setLogoError('')
    setLogoPreview(URL.createObjectURL(file))
  }

  const handleFaviconFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setFaviconError(t('errors.chooseImageFavicon'))
      return
    }
    setFaviconFile(file)
    setFaviconError('')
    setFaviconPreview(URL.createObjectURL(file))
  }

  const handleSidebarIconFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setSidebarIconError(t('errors.chooseImageSquare'))
      return
    }
    setSidebarIconFile(file)
    setSidebarIconError('')
    setSidebarIconPreview(URL.createObjectURL(file))
  }

  const handleChatbotIconFile = (file: File | null) => {
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setChatbotIconError(t('errors.chooseImageSquare'))
      return
    }
    setChatbotIconFile(file)
    setChatbotIconError('')
    setChatbotIconPreview(URL.createObjectURL(file))
  }

  const saveLogo = async () => {
    if (!logoFile) { setLogoError(t('errors.chooseLogoFile')); return }
    setLogoLoading(true)
    try {
      await uploadClinicLogo(logoFile)
      await reload()
      setLogoFile(null)
      setLogoPreview(null)
      toast.success('Logo u ndryshua me sukses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të logos')
    } finally {
      setLogoLoading(false)
    }
  }

  const saveFavicon = async () => {
    if (!faviconFile) { setFaviconError(t('errors.chooseFaviconFile')); return }
    setFaviconLoading(true)
    try {
      await uploadClinicFavicon(faviconFile)
      await reload()
      setFaviconFile(null)
      setFaviconPreview(null)
      toast.success('Ikona e browser-it u ndryshua me sukses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të favicon-it')
    } finally {
      setFaviconLoading(false)
    }
  }

  const saveSidebarIcon = async () => {
    if (!sidebarIconFile) { setSidebarIconError(t('errors.chooseIconFile')); return }
    setSidebarIconLoading(true)
    try {
      await uploadClinicSidebarIcon(sidebarIconFile)
      await reload()
      setSidebarIconFile(null)
      setSidebarIconPreview(null)
      toast.success('Ikona e menysë së mbyllur u ndryshua me sukses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të ikonës')
    } finally {
      setSidebarIconLoading(false)
    }
  }

  const saveChatbotIcon = async () => {
    if (!chatbotIconFile) { setChatbotIconError(t('errors.chooseIconFile')); return }
    setChatbotIconLoading(true)
    try {
      await uploadClinicChatbotIcon(chatbotIconFile)
      await reload()
      setChatbotIconFile(null)
      setChatbotIconPreview(null)
      toast.success('Ikona e chatbot-it u ndryshua me sukses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të ikonës')
    } finally {
      setChatbotIconLoading(false)
    }
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">

        {/* Language & Currency */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Languages className="h-5 w-5 text-accent" />
              {t('language.cardTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-3">
              <p className="text-sm font-medium">{t('language.title')}</p>
              <p className="text-sm text-muted-foreground">
                {t('language.hint')}
              </p>
              <Tabs value={locale} onValueChange={(v) => switchLocale(v as Locale)}>
                <TabsList>
                  {SUPPORTED_LOCALES.map((l) => {
                    const Flag = FLAG_COMPONENTS[l.countryCode]
                    return (
                      <TabsTrigger key={l.code} value={l.code} className="gap-2">
                        <Flag className="h-4 w-5.5 rounded-[2px] shrink-0" title={l.label} />
                        {l.label}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Coins className="h-4 w-4 text-accent" />
                {t('currency.title')}
              </p>
              <p className="text-sm text-muted-foreground">
                {t('currency.hint')}
              </p>
              <Tabs value={currency} onValueChange={(v) => setCurrency(v as Currency)}>
                <TabsList>
                  {SUPPORTED_CURRENCIES.map((c) => {
                    const Flag = FLAG_COMPONENTS[CURRENCY_FLAGS[c]]
                    return (
                      <TabsTrigger key={c} value={c} className="gap-2">
                        <Flag className="h-4 w-5.5 rounded-[2px] shrink-0" title={t(`currency.options.${c}`)} />
                        {c}
                      </TabsTrigger>
                    )
                  })}
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>

        {/* Dashboard color palette */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Palette className="h-5 w-5 text-accent" />
              {t('colors.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('colors.hint')}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {THEME_PRESET_KEYS.map((key) => {
                const preset = THEME_PRESETS[key]
                const active = key === themePreset
                const saving = themeSaving === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleThemeChange(key)}
                    disabled={!!themeSaving}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60',
                      active ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                    )}
                  >
                    <span className="flex -space-x-1.5 shrink-0">
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: preset.sidebar }} />
                      <span className="h-4 w-4 rounded-full border border-white/40" style={{ backgroundColor: preset.accent }} />
                    </span>
                    <span className="flex-1 text-left truncate">{t(`colors.presets.${key}`)}</span>
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                    ) : active ? (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            <div className="h-px bg-border" />

            {/* Custom color picker — a 7th option orthogonal to the 6 curated
                presets above: instead of picking from a fixed list, an admin
                picks any one color and the rest of the palette (dark shade,
                background tints, chart steps) is derived from it — see
                lib/theme-presets.ts's buildCustomPalette. The picked color
                becomes the accent verbatim, so what's previewed here is
                exactly what buttons/links will look like. */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <Palette className="h-4 w-4 text-accent" />
                {t('colors.custom.title')}
              </p>
              <p className="text-sm text-muted-foreground">{t('colors.custom.hint')}</p>

              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="color"
                  value={isValidHex(customColorDraft) ? normalizeHex(customColorDraft) : '#3b82f6'}
                  onChange={(e) => handleCustomColorHexInput(e.target.value)}
                  className="h-10 w-14 rounded-lg border border-border cursor-pointer bg-transparent p-0.5 shrink-0"
                  aria-label={t('colors.custom.title')}
                />
                <Input
                  value={customColorDraft}
                  onChange={(e) => handleCustomColorHexInput(e.target.value)}
                  placeholder="#3B82F6"
                  className="w-32 font-mono uppercase"
                  maxLength={7}
                />

                {isValidHex(customColorDraft) && (() => {
                  const preview = buildCustomPalette(customColorDraft)
                  return (
                    <span className="flex -space-x-1.5 shrink-0">
                      <span className="h-6 w-6 rounded-full border border-white/40" style={{ backgroundColor: preview.sidebar }} />
                      <span className="h-6 w-6 rounded-full border border-white/40" style={{ backgroundColor: preview.accent }} />
                    </span>
                  )
                })()}

                <Button
                  onClick={handleSaveCustomColor}
                  disabled={customColorSaving || !isValidHex(customColorDraft)}
                  size="sm"
                  className="bg-accent hover:bg-accent/90 gap-2"
                >
                  {customColorSaving ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : themePreset === 'custom' ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : null}
                  {themePreset === 'custom' ? t('colors.custom.update') : t('colors.custom.use')}
                </Button>
              </div>
              {customColorError && <p className="text-xs text-destructive">{customColorError}</p>}
            </div>
          </CardContent>
        </Card>

        {/* Interface style — surface material, orthogonal to the color palette above */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Layers className="h-5 w-5 text-accent" />
              {t('surface.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('surface.hint')}
            </p>
            <Tabs value={surfaceStyle} onValueChange={(v) => handleSurfaceChange(v as SurfaceStyle)}>
              <TabsList>
                {SURFACE_STYLES.map((s) => {
                  const saving = surfaceSaving === s
                  return (
                    <TabsTrigger key={s} value={s} disabled={!!surfaceSaving} className="gap-2">
                      {s === 'glass' ? <Sparkles className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                      {t(`surface.options.${s}`)}
                      {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>

        {/* Dashboard typeface — orthogonal to both the color palette and the surface style above */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Type className="h-5 w-5 text-accent" />
              {t('font.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('font.hint')}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {FONT_PRESET_KEYS.map((key) => {
                const active = key === fontPreset
                const saving = fontSaving === key
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => handleFontChange(key)}
                    disabled={!!fontSaving}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors disabled:opacity-60 text-left',
                      active ? 'border-accent bg-accent/10 text-foreground' : 'border-border hover:border-accent/60 text-muted-foreground'
                    )}
                  >
                    <span
                      className="flex-1 min-w-0 truncate text-base"
                      style={{ fontFamily: `var(${FONT_PRESET_VARS[key]})` }}
                    >
                      {t(`font.presets.${key}`)}
                    </span>
                    {saving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                    ) : active ? (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    ) : null}
                  </button>
                )
              })}
            </div>

            <div className="h-px bg-border" />

            {/* Custom uploaded typeface — a 7th option orthogonal to the 6
                built-in presets above, only shown as a real, selectable tile
                once something has actually been uploaded (see
                clinic-settings-context.tsx / theme-presets.ts's CUSTOM_FONT_FAMILY
                for how the uploaded file becomes an actual applied @font-face). */}
            <div className="space-y-3">
              <p className="text-sm font-medium flex items-center gap-1.5">
                <FileType className="h-4 w-4 text-accent" />
                {t('font.custom.title')}
              </p>
              <p className="text-sm text-muted-foreground">{t('font.custom.hint')}</p>

              {customFontUrl && (
                <div
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                    fontPreset === 'custom' ? 'border-accent bg-accent/10 text-foreground' : 'border-border text-muted-foreground'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => handleFontChange('custom')}
                    disabled={!!fontSaving}
                    className="flex-1 min-w-0 flex items-center gap-3 text-left disabled:opacity-60"
                  >
                    <span
                      className="flex-1 min-w-0 truncate text-base"
                      style={{ fontFamily: `'${CUSTOM_FONT_FAMILY}'` }}
                    >
                      {customFontName || t('font.custom.unnamed')}
                    </span>
                    {fontSaving === 'custom' ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-accent shrink-0" />
                    ) : fontPreset === 'custom' ? (
                      <Check className="h-3.5 w-3.5 text-accent shrink-0" />
                    ) : null}
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveCustomFont}
                    disabled={customFontRemoving}
                    title={t('font.custom.remove')}
                    className="shrink-0 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-60"
                  >
                    {customFontRemoving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                  </button>
                </div>
              )}

              {/* Drop zone — replaces the currently uploaded font, if any */}
              <div
                className={cn(
                  'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                  customFontError ? 'border-destructive' : 'border-border hover:border-accent/60'
                )}
                onClick={() => customFontInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); handleCustomFontFile(e.dataTransfer.files[0] ?? null) }}
              >
                <FileType className={cn('h-8 w-8', customFontError ? 'text-destructive' : 'text-muted-foreground')} />
                <p className={cn('text-sm text-center', customFontError ? 'text-destructive' : 'text-muted-foreground')}>
                  {customFontFile ? customFontFile.name : t('font.custom.dropzone')}
                </p>
                <input
                  ref={customFontInputRef}
                  type="file"
                  accept=".woff2,.woff,.ttf,.otf"
                  className="hidden"
                  onChange={(e) => handleCustomFontFile(e.target.files?.[0] ?? null)}
                />
              </div>
              {customFontError && <p className="text-xs text-destructive -mt-2">{customFontError}</p>}

              <Button
                onClick={saveCustomFont}
                disabled={customFontLoading || !customFontFile}
                className="bg-accent hover:bg-accent/90"
              >
                {customFontLoading ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('uploading')}</>
                ) : (
                  <><Upload className="h-4 w-4 mr-2" />{t('font.custom.submit')}</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Clinic hours */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-5 w-5 text-accent" />
              {t('hours.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('hours.hint')}
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('hours.opens')}</label>
                <Input
                  type="time"
                  value={openTimeDraft}
                  onChange={(e) => setOpenTimeDraft(e.target.value)}
                  className="w-32"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">{t('hours.closes')}</label>
                <Input
                  type="time"
                  value={closeTimeDraft}
                  onChange={(e) => setCloseTimeDraft(e.target.value)}
                  className="w-32"
                />
              </div>
            </div>
            <Button
              onClick={handleSaveHours}
              disabled={hoursSaving || !hoursChanged}
              className="bg-accent hover:bg-accent/90"
            >
              {hoursSaving ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('hours.saving')}</>
              ) : (
                t('hours.submit')
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Sidebar Logo */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MonitorSmartphone className="h-5 w-5 text-accent" />
              {t('logo.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('logo.hint')}
            </p>

            {/* Current logo */}
            {(logoPreview || logoUrl) && (
              <div className="rounded-xl bg-sidebar p-4 flex items-center justify-center min-h-[72px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={logoPreview ?? logoUrl!}
                  alt="Logo preview"
                  className="h-10 max-w-[240px] w-auto object-contain"
                />
              </div>
            )}

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                logoError ? 'border-destructive' : 'border-border hover:border-accent/60'
              )}
              onClick={() => logoInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleLogoFile(e.dataTransfer.files[0] ?? null) }}
            >
              <ImageIcon className={cn('h-8 w-8', logoError ? 'text-destructive' : 'text-muted-foreground')} />
              <p className={cn('text-sm text-center', logoError ? 'text-destructive' : 'text-muted-foreground')}>
                {logoFile ? logoFile.name : t('logo.dropzone')}
              </p>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => handleLogoFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {logoError && <p className="text-xs text-destructive -mt-2">{logoError}</p>}

            <Button
              onClick={saveLogo}
              disabled={logoLoading || !logoFile}
              className="bg-accent hover:bg-accent/90"
            >
              {logoLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('uploading')}</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />{t('logo.submit')}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Browser Tab Favicon */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5 text-accent" />
              {t('favicon.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('favicon.hint')}
            </p>

            {/* Current favicon */}
            {(faviconPreview || faviconUrl) && (
              <div className="rounded-xl bg-secondary/50 p-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={faviconPreview ?? faviconUrl!}
                  alt="Favicon preview"
                  className="h-8 w-8 object-contain rounded"
                />
                <p className="text-sm text-muted-foreground">{t('favicon.previewCaption')}</p>
              </div>
            )}

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                faviconError ? 'border-destructive' : 'border-border hover:border-accent/60'
              )}
              onClick={() => faviconInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleFaviconFile(e.dataTransfer.files[0] ?? null) }}
            >
              <ImageIcon className={cn('h-8 w-8', faviconError ? 'text-destructive' : 'text-muted-foreground')} />
              <p className={cn('text-sm text-center', faviconError ? 'text-destructive' : 'text-muted-foreground')}>
                {faviconFile ? faviconFile.name : t('favicon.dropzone')}
              </p>
              <input
                ref={faviconInputRef}
                type="file"
                accept="image/png,image/x-icon,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => handleFaviconFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {faviconError && <p className="text-xs text-destructive -mt-2">{faviconError}</p>}

            <Button
              onClick={saveFavicon}
              disabled={faviconLoading || !faviconFile}
              className="bg-accent hover:bg-accent/90"
            >
              {faviconLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('uploading')}</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />{t('favicon.submit')}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Collapsed sidebar icon */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ImageIcon className="h-5 w-5 text-accent" />
              {t('sidebarIcon.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('sidebarIcon.hint')}
            </p>

            {/* Current icon */}
            {(sidebarIconPreview || sidebarIconUrl) && (
              <div className="rounded-xl bg-sidebar p-4 flex items-center justify-center min-h-[72px]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={sidebarIconPreview ?? sidebarIconUrl!}
                  alt="Sidebar icon preview"
                  className="h-10 w-10 object-contain"
                />
              </div>
            )}

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                sidebarIconError ? 'border-destructive' : 'border-border hover:border-accent/60'
              )}
              onClick={() => sidebarIconInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleSidebarIconFile(e.dataTransfer.files[0] ?? null) }}
            >
              <ImageIcon className={cn('h-8 w-8', sidebarIconError ? 'text-destructive' : 'text-muted-foreground')} />
              <p className={cn('text-sm text-center', sidebarIconError ? 'text-destructive' : 'text-muted-foreground')}>
                {sidebarIconFile ? sidebarIconFile.name : t('sidebarIcon.dropzone')}
              </p>
              <input
                ref={sidebarIconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => handleSidebarIconFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {sidebarIconError && <p className="text-xs text-destructive -mt-2">{sidebarIconError}</p>}

            <Button
              onClick={saveSidebarIcon}
              disabled={sidebarIconLoading || !sidebarIconFile}
              className="bg-accent hover:bg-accent/90"
            >
              {sidebarIconLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('uploading')}</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />{t('sidebarIcon.submit')}</>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Chatbot toggle icon */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageCircle className="h-5 w-5 text-accent" />
              {t('chatbotIcon.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {t('chatbotIcon.hint')}
            </p>

            {/* Current icon */}
            {(chatbotIconPreview || chatbotIconUrl) && (
              <div className="rounded-xl bg-secondary/50 p-4 flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={chatbotIconPreview ?? chatbotIconUrl!}
                  alt="Chatbot icon preview"
                  className="h-10 w-10 object-contain rounded-full"
                />
                <p className="text-sm text-muted-foreground">{t('chatbotIcon.previewCaption')}</p>
              </div>
            )}

            {/* Drop zone */}
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-6 flex flex-col items-center gap-3 cursor-pointer transition-colors',
                chatbotIconError ? 'border-destructive' : 'border-border hover:border-accent/60'
              )}
              onClick={() => chatbotIconInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); handleChatbotIconFile(e.dataTransfer.files[0] ?? null) }}
            >
              <ImageIcon className={cn('h-8 w-8', chatbotIconError ? 'text-destructive' : 'text-muted-foreground')} />
              <p className={cn('text-sm text-center', chatbotIconError ? 'text-destructive' : 'text-muted-foreground')}>
                {chatbotIconFile ? chatbotIconFile.name : t('chatbotIcon.dropzone')}
              </p>
              <input
                ref={chatbotIconInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                className="hidden"
                onChange={(e) => handleChatbotIconFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {chatbotIconError && <p className="text-xs text-destructive -mt-2">{chatbotIconError}</p>}

            <Button
              onClick={saveChatbotIcon}
              disabled={chatbotIconLoading || !chatbotIconFile}
              className="bg-accent hover:bg-accent/90"
            >
              {chatbotIconLoading ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />{t('uploading')}</>
              ) : (
                <><Upload className="h-4 w-4 mr-2" />{t('chatbotIcon.submit')}</>
              )}
            </Button>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
