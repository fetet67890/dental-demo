"use client"

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import { getClinicSettings } from '../lib/api/settings'
import {
  DEFAULT_THEME_PRESET, buildThemeOverrideCss, isThemePreset, type ThemePreset,
  DEFAULT_SURFACE_STYLE, isSurfaceStyle, type SurfaceStyle,
  DEFAULT_FONT_PRESET, buildFontOverrideCss, isFontPreset, type FontPreset,
} from '../lib/theme-presets'
import { useSpecialtyConfig } from './specialty-config-context'

interface ClinicSettingsContextType {
  logoUrl: string | null
  faviconUrl: string | null
  sidebarIconUrl: string | null
  chatbotIconUrl: string | null
  themePreset: ThemePreset
  customThemeColor: string | null
  surfaceStyle: SurfaceStyle
  fontPreset: FontPreset
  customFontUrl: string | null
  customFontName: string | null
  openTime: string
  closeTime: string
  // null = not loaded yet (distinct from a confirmed `false`) — the setup
  // wizard's own auto-launch effect waits for a definitive answer rather
  // than risk popping up on a stale/default guess.
  setupWizardDone: boolean | null
  // Generic per-specialty clinic-wide flags — keys/defaults come from
  // useSpecialtyConfig().featureFlags (empty for a specialty with none).
  // Seeded with that default so gated panels render correctly on first
  // paint instead of flickering once the real values arrive.
  featureFlags: Record<string, boolean>
  reload: () => void
}

const DEFAULT_OPEN_TIME = '08:00'
const DEFAULT_CLOSE_TIME = '17:00'

const ClinicSettingsContext = createContext<ClinicSettingsContextType>({
  logoUrl: null,
  faviconUrl: null,
  sidebarIconUrl: null,
  chatbotIconUrl: null,
  themePreset: DEFAULT_THEME_PRESET,
  customThemeColor: null,
  surfaceStyle: DEFAULT_SURFACE_STYLE,
  fontPreset: DEFAULT_FONT_PRESET,
  customFontUrl: null,
  customFontName: null,
  openTime: DEFAULT_OPEN_TIME,
  closeTime: DEFAULT_CLOSE_TIME,
  setupWizardDone: null,
  featureFlags: {},
  reload: () => {},
})

// Read once, synchronously, so the very first paint (including full-page
// reloads) already shows last-known-good images instead of the generic
// fallback while the network request is in flight — that flash-then-swap
// is what read as images "appearing and disappearing".
//
// Demo mode skips this cache entirely (both read and write) rather than
// participating in it — see lib/demo/mock-client.ts's own independent
// localStorage-backed store for the same data.
const IS_DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true'

function readCached(key: string): string | null {
  if (typeof window === 'undefined' || IS_DEMO_MODE) return null
  try { return window.localStorage.getItem(key) } catch { return null }
}

function writeCached(key: string, value: string | null) {
  if (typeof window === 'undefined' || IS_DEMO_MODE) return
  try {
    if (value) window.localStorage.setItem(key, value)
    else window.localStorage.removeItem(key)
  } catch {}
}

export function ClinicSettingsProvider({ children }: { children: ReactNode }) {
  const { featureFlags: defaultFeatureFlags } = useSpecialtyConfig()
  const [logoUrl, setLogoUrl] = useState<string | null>(() => readCached('hypocrates_logo_url'))
  const [faviconUrl, setFaviconUrl] = useState<string | null>(() => readCached('hypocrates_favicon_url'))
  const [sidebarIconUrl, setSidebarIconUrl] = useState<string | null>(() => readCached('hypocrates_sidebar_icon_url'))
  const [chatbotIconUrl, setChatbotIconUrl] = useState<string | null>(() => readCached('hypocrates_chatbot_icon_url'))
  const [themePreset, setThemePreset] = useState<ThemePreset>(() => {
    const cached = readCached('hypocrates_theme_preset')
    return isThemePreset(cached) ? cached : DEFAULT_THEME_PRESET
  })
  const [customThemeColor, setCustomThemeColor] = useState<string | null>(() => readCached('hypocrates_custom_theme_color'))
  const [surfaceStyle, setSurfaceStyle] = useState<SurfaceStyle>(() => {
    const cached = readCached('hypocrates_surface_style')
    return isSurfaceStyle(cached) ? cached : DEFAULT_SURFACE_STYLE
  })
  const [fontPreset, setFontPreset] = useState<FontPreset>(() => {
    const cached = readCached('hypocrates_font_preset')
    return isFontPreset(cached) ? cached : DEFAULT_FONT_PRESET
  })
  const [customFontUrl, setCustomFontUrl] = useState<string | null>(() => readCached('hypocrates_custom_font_url'))
  const [customFontName, setCustomFontName] = useState<string | null>(() => readCached('hypocrates_custom_font_name'))
  const [openTime, setOpenTime] = useState<string>(() => readCached('hypocrates_open_time') || DEFAULT_OPEN_TIME)
  const [closeTime, setCloseTime] = useState<string>(() => readCached('hypocrates_close_time') || DEFAULT_CLOSE_TIME)
  const [setupWizardDone, setSetupWizardDone] = useState<boolean | null>(null)
  const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>(defaultFeatureFlags)
  const pathname = usePathname()

  const load = useCallback(async () => {
    try {
      const data = await getClinicSettings()
      setLogoUrl(data.logo_url ?? null)
      setFaviconUrl(data.favicon_url ?? null)
      setSidebarIconUrl(data.sidebar_icon_url ?? null)
      setChatbotIconUrl(data.chatbot_icon_url ?? null)
      const preset = isThemePreset(data.theme_preset) ? data.theme_preset : DEFAULT_THEME_PRESET
      setThemePreset(preset)
      setCustomThemeColor(data.custom_theme_color ?? null)
      const surface = isSurfaceStyle(data.theme_surface) ? data.theme_surface : DEFAULT_SURFACE_STYLE
      setSurfaceStyle(surface)
      const font = isFontPreset(data.theme_font) ? data.theme_font : DEFAULT_FONT_PRESET
      setFontPreset(font)
      setCustomFontUrl(data.custom_font_url ?? null)
      setCustomFontName(data.custom_font_name ?? null)
      const open = data.clinic_open_time || DEFAULT_OPEN_TIME
      const close = data.clinic_close_time || DEFAULT_CLOSE_TIME
      setOpenTime(open)
      setCloseTime(close)
      // Undefined (a fetch failure — see getClinicSettings' catch branch)
      // defaults to "done" rather than "not done": a transient network error
      // should never be the reason an intrusive setup wizard pops up.
      setSetupWizardDone(data.setup_wizard_done ?? true)
      setFeatureFlags(data.feature_flags ?? defaultFeatureFlags)
      writeCached('hypocrates_logo_url', data.logo_url ?? null)
      writeCached('hypocrates_favicon_url', data.favicon_url ?? null)
      writeCached('hypocrates_sidebar_icon_url', data.sidebar_icon_url ?? null)
      writeCached('hypocrates_chatbot_icon_url', data.chatbot_icon_url ?? null)
      writeCached('hypocrates_theme_preset', preset)
      writeCached('hypocrates_custom_theme_color', data.custom_theme_color ?? null)
      writeCached('hypocrates_surface_style', surface)
      writeCached('hypocrates_font_preset', font)
      writeCached('hypocrates_custom_font_url', data.custom_font_url ?? null)
      writeCached('hypocrates_custom_font_name', data.custom_font_name ?? null)
      writeCached('hypocrates_open_time', open)
      writeCached('hypocrates_close_time', close)
    } catch {}
  }, [defaultFeatureFlags])

  useEffect(() => { load() }, [load])

  // Re-apply favicon on every navigation — Next.js resets <link rel="icon"> on route changes.
  // Server-rendered layout.tsx now bakes the correct favicon into the initial HTML
  // (see generateMetadata there), so this is just a same-session refresh after an
  // upload in Aparenca, not the primary mechanism anymore. Exact-match "icon" only —
  // `[rel*="icon"]` also matched "apple-touch-icon" and clobbered it with the favicon.
  useEffect(() => {
    if (!faviconUrl) return
    const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]')
    if (links.length > 0) {
      links.forEach(link => { link.href = faviconUrl })
    } else {
      const link = document.createElement('link')
      link.rel = 'icon'
      link.href = faviconUrl
      document.head.appendChild(link)
    }
  }, [faviconUrl, pathname])

  const themeCss = buildThemeOverrideCss(themePreset, customThemeColor)
  const fontCss = buildFontOverrideCss(fontPreset, customFontUrl ? { url: customFontUrl } : null)

  // Surface style is a plain class toggle (same mechanism as next-themes'
  // .dark) rather than injected CSS variables — app/globals.css's
  // `.theme-glass` rules key off this class directly.
  useEffect(() => {
    document.documentElement.classList.toggle('theme-glass', surfaceStyle === 'glass')
  }, [surfaceStyle])

  return (
    <ClinicSettingsContext.Provider value={{ logoUrl, faviconUrl, sidebarIconUrl, chatbotIconUrl, themePreset, customThemeColor, surfaceStyle, fontPreset, customFontUrl, customFontName, openTime, closeTime, setupWizardDone, featureFlags, reload: load }}>
      {/* Always rendered (never conditionally omitted) so the <style> elements
          themselves are structurally identical between SSR and the client's
          first hydration pass — only their *content* can legitimately differ,
          since themePreset/fontPreset are seeded from localStorage (readCached
          above), which doesn't exist during SSR. An empty string is a no-op
          <style> tag, so this is always safe to render. suppressHydrationWarning
          silences the resulting (expected, harmless) text-content mismatch —
          without it, a user who'd previously picked a non-default preset would
          see a real hydration-mismatch error on every page load.

          key={`${themePreset}:${customThemeColor}`}/key={`${fontPreset}:${customFontUrl}`}:
          forces React to unmount and insert a *brand-new* <style> element
          whenever the preset changes, instead of patching the existing one's
          text content in place. Plain text-content patching left the browser
          not reliably re-resolving var()-chains that depend on it after the
          very first load — the font (and, by the same mechanism, the color
          theme) would only actually take effect once something else *also*
          forced a re-render, e.g. clicking a different preset. A fresh
          element is unambiguous: the browser always parses new inserted
          stylesheets immediately. customThemeColor/customFontUrl are folded
          into their respective keys too — staying on 'custom' while picking a
          different color/file needs the same fresh-element treatment, not
          just switching presets. */}
      <style key={`${themePreset}:${customThemeColor ?? ''}`} suppressHydrationWarning>{themeCss}</style>
      <style key={`${fontPreset}:${customFontUrl ?? ''}`} suppressHydrationWarning>{fontCss}</style>
      {children}
    </ClinicSettingsContext.Provider>
  )
}

export function useClinicSettings() {
  return useContext(ClinicSettingsContext)
}
