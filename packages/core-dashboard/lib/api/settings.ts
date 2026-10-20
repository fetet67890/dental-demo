import api from '../api-client'
import type { ThemePreset, SurfaceStyle, FontPreset } from '../theme-presets'

export function getExchangeRate(): Promise<{
  eur_to_lek: number
  rates: { ALL: number; USD?: number; GBP?: number }
  cached: boolean
  fallback?: boolean
}> {
  return api.get('/api/settings/exchange-rate')
}

export async function getClinicSettings(): Promise<{ logo_url?: string | null; favicon_url?: string | null; sidebar_icon_url?: string | null; chatbot_icon_url?: string | null; theme_preset?: string | null; custom_theme_color?: string | null; theme_surface?: string | null; theme_font?: string | null; custom_font_url?: string | null; custom_font_name?: string | null; clinic_open_time?: string | null; clinic_close_time?: string | null; commission_basis?: 'cost' | 'payment' | null; setup_wizard_done?: boolean; feature_flags?: Record<string, boolean> }> {
  try {
    return await api.get('/api/settings/clinic')
  } catch {
    return { logo_url: null, favicon_url: null, sidebar_icon_url: null, chatbot_icon_url: null, theme_preset: null, custom_theme_color: null, theme_surface: null, theme_font: null, custom_font_url: null, custom_font_name: null, clinic_open_time: null, clinic_close_time: null, commission_basis: null, setup_wizard_done: undefined, feature_flags: undefined }
  }
}

export function setCommissionBasis(basis: 'cost' | 'payment'): Promise<{ commission_basis: 'cost' | 'payment' }> {
  return api.put('/api/settings/commission-basis', { basis })
}

// `color` is only meaningful alongside preset === 'custom' (see
// lib/theme-presets.ts's buildCustomPalette for how it becomes a full
// palette) — omit it when switching to one of the 6 built-in presets, or
// when reselecting 'custom' with a color already stored server-side.
export function setClinicTheme(preset: ThemePreset, color?: string): Promise<{ theme_preset: ThemePreset; custom_theme_color: string | null }> {
  return api.put('/api/settings/theme', { preset, color })
}

export function setClinicSurfaceStyle(surface: SurfaceStyle): Promise<{ theme_surface: SurfaceStyle }> {
  return api.put('/api/settings/surface', { surface })
}

export function setClinicFontStyle(font: FontPreset): Promise<{ theme_font: FontPreset }> {
  return api.put('/api/settings/font', { font })
}

export function setClinicHours(openTime: string, closeTime: string): Promise<{ clinic_open_time: string; clinic_close_time: string }> {
  return api.put('/api/settings/hours', { openTime, closeTime })
}

export async function uploadClinicLogo(file: File): Promise<{ logo_url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<{ logo_url: string }>('/api/settings/logo', fd)
}

export async function uploadClinicFavicon(file: File): Promise<{ favicon_url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<{ favicon_url: string }>('/api/settings/favicon', fd)
}

export async function uploadClinicSidebarIcon(file: File): Promise<{ sidebar_icon_url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<{ sidebar_icon_url: string }>('/api/settings/sidebar-icon', fd)
}

export async function uploadClinicChatbotIcon(file: File): Promise<{ chatbot_icon_url: string }> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<{ chatbot_icon_url: string }>('/api/settings/chatbot-icon', fd)
}

export async function uploadClinicCustomFont(file: File): Promise<{ custom_font_url: string; custom_font_name: string; theme_font: FontPreset }> {
  const fd = new FormData()
  fd.append('file', file)
  return api.upload('/api/settings/custom-font', fd)
}

export function removeClinicCustomFont(): Promise<{ theme_font: FontPreset }> {
  return api.delete('/api/settings/custom-font')
}

// Marks the clinic-wide first-login setup wizard as done — see
// context/setup-wizard-context.tsx. Fired on Finish AND on Skip alike (a
// skipped wizard shouldn't keep reappearing for every admin's next login).
export function completeSetupWizard(): Promise<{ setup_wizard_done: boolean }> {
  return api.put('/api/settings/setup-wizard', { completed: true })
}

// Generic per-specialty clinic-wide on/off flags — the key set comes
// entirely from each app's specialty.config.ts featureFlags (empty for a
// specialty with none). Mirrors core-api's settings.controller.js
// setFeatureFlag() — see that file's own comment for why this replaced a
// specialty-named route+function pair (e.g. the old
// setDermatologyFeature/dermatology-features).
export function setFeatureFlag(key: string, enabled: boolean): Promise<{ key: string; enabled: boolean }> {
  return api.put('/api/settings/feature-flags', { key, enabled })
}
