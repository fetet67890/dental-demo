// Preset color palettes for the dashboard, picked in Aparenca. Each preset
// only overrides *light*-mode CSS variables (see app/globals.css :root) —
// dark mode intentionally stays the existing shared grayscale palette for
// every preset (per the 2026-08-04 decision that dark mode is white/gray/
// black only, no hues), so switching presets never touches `.dark`.
// `destructive`/`destructive-foreground` are also never overridden: that's a
// universal error-state color, not a brand color.

import { normalizeHex, hexToHsl, hslToHex, contrastTextColor, clampL } from './color-utils'

// The 6 hand-picked presets, plus 'custom' — a full palette algorithmically
// derived from one color an admin picks (see buildCustomPalette below).
// Same shape as FontPreset/BuiltinFontPreset in this file: 'custom' is
// deliberately NOT in THEME_PRESET_KEYS, since it isn't a "pick from this
// grid" option, it only exists once a color has actually been chosen.
export type BuiltinThemePreset = 'blue' | 'green' | 'purple' | 'amber' | 'rose' | 'slate'
export type ThemePreset = BuiltinThemePreset | 'custom'

export const DEFAULT_THEME_PRESET: ThemePreset = 'blue'

// Surface style is orthogonal to the color preset above — it swaps the
// *material* (solid vs. translucent/blurred "Glass Morphism") that structural
// surfaces (cards, sidebar, topbar, menus) render with, independent of hue.
// See app/globals.css's `.theme-glass` rules — they derive every glass tint
// from color-mix() against the currently active preset's own --card/--sidebar/
// --popover, so any color preset + either surface style is a valid combination.
export type SurfaceStyle = 'solid' | 'glass'
export const DEFAULT_SURFACE_STYLE: SurfaceStyle = 'solid'
export const SURFACE_STYLES: SurfaceStyle[] = ['solid', 'glass']

export function isSurfaceStyle(value: unknown): value is SurfaceStyle {
  return value === 'solid' || value === 'glass'
}

// Font is a third, independent axis — it swaps the dashboard's UI typeface
// without touching the color preset or surface style. Every option here is
// self-hosted via next/font/google (see app/layout.tsx), so there's zero
// external request and zero licensing concern — every Google Font ships
// under the SIL Open Font License, free for any commercial use. 'default'
// is Poppins (the shipped typeface) with zero injected override, matching
// the "no-op" shape of DEFAULT_THEME_PRESET/DEFAULT_SURFACE_STYLE below.
// The 6 self-hosted Google Fonts, plus 'custom' — a clinic's own uploaded
// font file (see components/settings/aparenca-section.tsx's font card and
// Hypocrates-Api's settings.controller.js uploadCustomFont). 'custom' is
// deliberately NOT in FONT_PRESET_KEYS below — it isn't a "pick from this
// grid" option like the other six, it only exists once something has
// actually been uploaded, and the Aparenca UI shows it as its own separate
// card rather than a 7th grid tile.
export type BuiltinFontPreset = 'default' | 'outfit' | 'inter' | 'jakarta' | 'manrope' | 'grotesk'
export type FontPreset = BuiltinFontPreset | 'custom'
export const DEFAULT_FONT_PRESET: FontPreset = 'default'
export const FONT_PRESET_KEYS: BuiltinFontPreset[] = ['default', 'outfit', 'inter', 'jakarta', 'manrope', 'grotesk']

// CSS variable each built-in preset resolves to — declared on <body> in
// app/layout.tsx via next/font's `variable` option, always present
// regardless of which preset is active (so switching is instant, no new
// network request). 'custom' has no entry here — see buildFontOverrideCss,
// it needs an actual uploaded font URL instead of a compile-time variable.
export const FONT_PRESET_VARS: Record<BuiltinFontPreset, string> = {
  default: '--font-poppins',
  outfit:  '--font-outfit',
  inter:   '--font-inter',
  jakarta: '--font-jakarta',
  manrope: '--font-manrope',
  grotesk: '--font-grotesk',
}

const ALL_FONT_PRESET_KEYS: FontPreset[] = [...FONT_PRESET_KEYS, 'custom']

export function isFontPreset(value: unknown): value is FontPreset {
  return typeof value === 'string' && ALL_FONT_PRESET_KEYS.includes(value as FontPreset)
}

// The font-family name every uploaded custom font is registered under —
// arbitrary but must match between the @font-face rule and --font-active
// below, so it's a shared constant rather than a string repeated in two places.
export const CUSTOM_FONT_FAMILY = 'HypocratesCustomFont'

// Font file extension -> the CSS @font-face format() hint it needs.
export function fontFormatFromUrl(url: string): string {
  const ext = url.split('.').pop()?.toLowerCase()
  if (ext === 'woff2') return 'woff2'
  if (ext === 'woff') return 'woff'
  if (ext === 'ttf') return 'truetype'
  if (ext === 'otf') return 'opentype'
  return 'woff2'
}

// Same override shape as buildThemeOverrideCss: empty string for the default
// (zero injected CSS), otherwise a rule repointing the `--font-active` custom
// property that app/globals.css's `--font-sans` falls back through.
//
// Deliberately targets `body`, not `:root` — the actual --font-poppins/
// --font-outfit/etc. variables are declared on <body> (via next/font's
// `variable` classes in app/layout.tsx), and CSS custom properties are only
// visible to the element they're set on and its descendants, never a parent.
// A `:root { --font-active: var(--font-outfit); }` rule can't see a variable
// declared on <body> (a descendant of <html>), so var(--font-outfit) there
// never resolves and the whole declaration is dropped as invalid — which is
// exactly why every font preset silently fell back to the default no matter
// what was selected. Setting it on `body` puts it in the same scope the
// variables actually live in.
//
// `customFont` is only consulted when preset === 'custom' — it can't be a
// compile-time CSS variable like the built-ins (the file doesn't exist until
// an admin uploads it at runtime), so this branch injects a real @font-face
// rule pointing at wherever the Api served it, then points --font-active at
// that font-family name instead of at a next/font variable.
export function buildFontOverrideCss(preset: FontPreset, customFont?: { url: string } | null): string {
  if (preset === 'custom') {
    if (!customFont?.url) return '' // selected but nothing uploaded (yet, or anymore) — no-op
    return `@font-face {\n  font-family: '${CUSTOM_FONT_FAMILY}';\n  src: url('${customFont.url}') format('${fontFormatFromUrl(customFont.url)}');\n  font-display: swap;\n}\nbody {\n  --font-active: '${CUSTOM_FONT_FAMILY}';\n}`
  }
  if (preset === DEFAULT_FONT_PRESET) return ''
  return `body {\n  --font-active: var(${FONT_PRESET_VARS[preset]});\n}`
}

export interface PresetVars {
  background: string
  foreground: string
  card: string
  'card-foreground': string
  popover: string
  'popover-foreground': string
  primary: string
  'primary-foreground': string
  secondary: string
  'secondary-foreground': string
  muted: string
  'muted-foreground': string
  accent: string
  'accent-foreground': string
  border: string
  input: string
  ring: string
  'chart-1': string
  'chart-2': string
  'chart-3': string
  'chart-4': string
  'chart-5': string
  sidebar: string
  'sidebar-foreground': string
  'sidebar-primary': string
  'sidebar-primary-foreground': string
  'sidebar-accent': string
  'sidebar-accent-foreground': string
  'sidebar-border': string
  'sidebar-ring': string
}

export const THEME_PRESETS: Record<BuiltinThemePreset, PresetVars> = {
  // Matches app/globals.css :root exactly — the shipped default, kept as its
  // own preset so picking "Blue" is a true no-op (zero injected overrides).
  blue: {
    background: '#F8FAFF', foreground: '#0f2155',
    card: '#FFFFFF', 'card-foreground': '#0f2155',
    popover: '#FFFFFF', 'popover-foreground': '#0f2155',
    primary: '#0f2155', 'primary-foreground': '#FFFFFF',
    secondary: '#EFF6FF', 'secondary-foreground': '#0f2155',
    muted: '#EFF6FF', 'muted-foreground': '#64748b',
    accent: '#3b82f6', 'accent-foreground': '#FFFFFF',
    border: '#DBEAFE', input: '#DBEAFE', ring: '#3b82f6',
    'chart-1': '#3b82f6', 'chart-2': '#0f2155', 'chart-3': '#60a5fa', 'chart-4': '#2563eb', 'chart-5': '#93c5fd',
    sidebar: '#0f2155', 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': '#3b82f6', 'sidebar-primary-foreground': '#FFFFFF',
    'sidebar-accent': '#1e3a8a', 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': '#1e3a8a', 'sidebar-ring': '#3b82f6',
  },
  green: {
    background: '#F6FFFA', foreground: '#022c22',
    card: '#FFFFFF', 'card-foreground': '#022c22',
    popover: '#FFFFFF', 'popover-foreground': '#022c22',
    primary: '#022c22', 'primary-foreground': '#FFFFFF',
    secondary: '#ECFDF5', 'secondary-foreground': '#022c22',
    muted: '#ECFDF5', 'muted-foreground': '#64748b',
    accent: '#059669', 'accent-foreground': '#FFFFFF',
    border: '#D1FAE5', input: '#D1FAE5', ring: '#059669',
    'chart-1': '#059669', 'chart-2': '#022c22', 'chart-3': '#34d399', 'chart-4': '#047857', 'chart-5': '#6ee7b7',
    sidebar: '#022c22', 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': '#059669', 'sidebar-primary-foreground': '#FFFFFF',
    'sidebar-accent': '#065f46', 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': '#065f46', 'sidebar-ring': '#059669',
  },
  purple: {
    background: '#FAF8FF', foreground: '#2e1065',
    card: '#FFFFFF', 'card-foreground': '#2e1065',
    popover: '#FFFFFF', 'popover-foreground': '#2e1065',
    primary: '#2e1065', 'primary-foreground': '#FFFFFF',
    secondary: '#F5F3FF', 'secondary-foreground': '#2e1065',
    muted: '#F5F3FF', 'muted-foreground': '#64748b',
    accent: '#8b5cf6', 'accent-foreground': '#FFFFFF',
    border: '#EDE9FE', input: '#EDE9FE', ring: '#8b5cf6',
    'chart-1': '#8b5cf6', 'chart-2': '#2e1065', 'chart-3': '#a78bfa', 'chart-4': '#7c3aed', 'chart-5': '#c4b5fd',
    sidebar: '#2e1065', 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': '#8b5cf6', 'sidebar-primary-foreground': '#FFFFFF',
    'sidebar-accent': '#5b21b6', 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': '#5b21b6', 'sidebar-ring': '#8b5cf6',
  },
  amber: {
    background: '#FFFCF5', foreground: '#451a03',
    card: '#FFFFFF', 'card-foreground': '#451a03',
    popover: '#FFFFFF', 'popover-foreground': '#451a03',
    primary: '#451a03', 'primary-foreground': '#FFFFFF',
    secondary: '#FFFBEB', 'secondary-foreground': '#451a03',
    muted: '#FFFBEB', 'muted-foreground': '#64748b',
    accent: '#d97706', 'accent-foreground': '#FFFFFF',
    border: '#FEF3C7', input: '#FEF3C7', ring: '#d97706',
    'chart-1': '#d97706', 'chart-2': '#451a03', 'chart-3': '#fbbf24', 'chart-4': '#b45309', 'chart-5': '#fcd34d',
    sidebar: '#451a03', 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': '#d97706', 'sidebar-primary-foreground': '#FFFFFF',
    'sidebar-accent': '#92400e', 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': '#92400e', 'sidebar-ring': '#d97706',
  },
  rose: {
    background: '#FFF8FA', foreground: '#4c0519',
    card: '#FFFFFF', 'card-foreground': '#4c0519',
    popover: '#FFFFFF', 'popover-foreground': '#4c0519',
    primary: '#4c0519', 'primary-foreground': '#FFFFFF',
    secondary: '#FFF1F2', 'secondary-foreground': '#4c0519',
    muted: '#FFF1F2', 'muted-foreground': '#64748b',
    accent: '#e11d48', 'accent-foreground': '#FFFFFF',
    border: '#FFE4E6', input: '#FFE4E6', ring: '#e11d48',
    'chart-1': '#e11d48', 'chart-2': '#4c0519', 'chart-3': '#fb7185', 'chart-4': '#9f1239', 'chart-5': '#fda4af',
    sidebar: '#4c0519', 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': '#e11d48', 'sidebar-primary-foreground': '#FFFFFF',
    'sidebar-accent': '#9f1239', 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': '#9f1239', 'sidebar-ring': '#e11d48',
  },
  slate: {
    background: '#F8FAFC', foreground: '#0f172a',
    card: '#FFFFFF', 'card-foreground': '#0f172a',
    popover: '#FFFFFF', 'popover-foreground': '#0f172a',
    primary: '#0f172a', 'primary-foreground': '#FFFFFF',
    secondary: '#F1F5F9', 'secondary-foreground': '#0f172a',
    muted: '#F1F5F9', 'muted-foreground': '#64748b',
    accent: '#475569', 'accent-foreground': '#FFFFFF',
    border: '#E2E8F0', input: '#E2E8F0', ring: '#475569',
    'chart-1': '#475569', 'chart-2': '#0f172a', 'chart-3': '#94a3b8', 'chart-4': '#334155', 'chart-5': '#cbd5e1',
    sidebar: '#0f172a', 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': '#475569', 'sidebar-primary-foreground': '#FFFFFF',
    'sidebar-accent': '#1e293b', 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': '#1e293b', 'sidebar-ring': '#475569',
  },
}

export const THEME_PRESET_KEYS = Object.keys(THEME_PRESETS) as BuiltinThemePreset[]

const ALL_THEME_PRESET_KEYS: ThemePreset[] = [...THEME_PRESET_KEYS, 'custom']

export function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && ALL_THEME_PRESET_KEYS.includes(value as ThemePreset)
}

// Derives a full palette from ONE color an admin picks — every hand-written
// preset above is really built from just two tones (a near-black "dark" used
// for foreground/primary/sidebar, and a bright "accent" used for buttons/
// links/chart-1) plus a handful of very light tints of the same hue for
// background/secondary/border, and a couple of lighter/darker steps of the
// accent for the remaining chart colors. This reproduces that same structure
// algorithmically for an arbitrary hue instead of only the 6 hand-picked ones.
//
// The picked color is used AS THE ACCENT VERBATIM, not re-derived — someone
// picking a specific brand color expects buttons/links to be exactly that
// color, not the closest approximation of it. Only the surrounding palette
// (background tints, dark shade, chart steps) is generated from its hue.
export function buildCustomPalette(accentHex: string): PresetVars {
  const accent = normalizeHex(accentHex)
  const { h, s } = hexToHsl(accent)
  const accentForeground = contrastTextColor(accent)

  // Near-black dark tone (foreground/primary/sidebar) — same hue, capped
  // saturation so very saturated picks don't produce a garish "dark" shade,
  // low lightness. Matches e.g. blue's #0f2155 (H≈222, S≈70%, L≈20%).
  const satForDark = Math.min(Math.max(s, 35), 70)
  const dark = hslToHex(h, satForDark, 20)
  // Between dark and accent — used for the sidebar's own hover/border tone.
  const sidebarMid = hslToHex(h, satForDark, 32)

  // Very light hue tints for background/secondary/border — same hue,
  // decreasing lightness as they need to stand out more from the page.
  const background = hslToHex(h, Math.min(s, 60), clampL(98))
  const secondaryMuted = hslToHex(h, Math.min(s, 70), clampL(95))
  const borderInput = hslToHex(h, Math.min(s, 78), clampL(89))

  // Chart steps relative to the accent's OWN lightness, not a fixed value —
  // so this still looks like a coherent ramp whether the picked accent is
  // already light or dark.
  const { l: accentL } = hexToHsl(accent)
  const chart3 = hslToHex(h, s, clampL(accentL + 13))
  const chart4 = hslToHex(h, s, clampL(accentL - 8))
  const chart5 = hslToHex(h, s, clampL(accentL + 22))

  return {
    background, foreground: dark,
    card: '#FFFFFF', 'card-foreground': dark,
    popover: '#FFFFFF', 'popover-foreground': dark,
    primary: dark, 'primary-foreground': '#FFFFFF',
    secondary: secondaryMuted, 'secondary-foreground': dark,
    muted: secondaryMuted, 'muted-foreground': '#64748b',
    accent, 'accent-foreground': accentForeground,
    border: borderInput, input: borderInput, ring: accent,
    'chart-1': accent, 'chart-2': dark, 'chart-3': chart3, 'chart-4': chart4, 'chart-5': chart5,
    sidebar: dark, 'sidebar-foreground': '#FFFFFF',
    'sidebar-primary': accent, 'sidebar-primary-foreground': accentForeground,
    'sidebar-accent': sidebarMid, 'sidebar-accent-foreground': '#FFFFFF',
    'sidebar-border': sidebarMid, 'sidebar-ring': accent,
  }
}

// CSS text for a `<style>` tag that overrides :root only when .dark is NOT
// present. `:root:not(.dark)` has higher specificity than the plain `.dark`
// rule in globals.css, so it safely wins in light mode without ever touching
// dark mode, regardless of where in the document this tag ends up.
//
// `customColor` is only consulted when preset === 'custom' — same shape as
// buildFontOverrideCss's customFont parameter: selected-but-nothing-picked
// (yet, or anymore) is a no-op, not an error.
export function buildThemeOverrideCss(preset: ThemePreset, customColor?: string | null): string {
  if (preset === 'custom') {
    if (!customColor) return ''
    const vars = buildCustomPalette(customColor)
    const lines = Object.entries(vars).map(([key, value]) => `  --${key}: ${value};`)
    return `:root:not(.dark) {\n${lines.join('\n')}\n}`
  }
  if (preset === DEFAULT_THEME_PRESET) return ''
  const vars = THEME_PRESETS[preset]
  const lines = Object.entries(vars).map(([key, value]) => `  --${key}: ${value};`)
  return `:root:not(.dark) {\n${lines.join('\n')}\n}`
}
