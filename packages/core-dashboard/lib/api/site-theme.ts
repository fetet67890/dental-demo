import api from '../api-client'

// Colors only — same shape whether it's the active theme's read or one
// entry in the library list below.
export interface SiteThemeColors {
  background: string
  foreground: string
  muted: string
  primary: string
  secondary: string
  card: string
}

export interface SiteTheme extends SiteThemeColors {
  id: string
  name: string
  isBuiltin: boolean
  isActive: boolean
}

// The whole saved-theme library (builtin Default + whatever's been saved),
// for the Pamja tab's theme gallery.
export function listSiteThemes(): Promise<SiteTheme[]> {
  return api.get<SiteTheme[]>('/api/site-theme/list')
}

// "Tweak" — partial update of the ACTIVE theme's own colors in place.
export function updateSiteTheme(patch: Partial<SiteThemeColors>): Promise<SiteTheme> {
  return api.put<SiteTheme>('/api/site-theme', patch)
}

// "Save as new theme" — snapshots the given colors (any field left out
// falls back to whatever's currently active) as a new library entry, and
// makes it active.
export function saveSiteThemeAs(name: string, colors: Partial<SiteThemeColors>): Promise<SiteTheme> {
  return api.post<SiteTheme>('/api/site-theme/save-as', { name, ...colors })
}

// Switch the live site to a different saved theme, unchanged.
export function activateSiteTheme(id: string): Promise<SiteTheme> {
  return api.post<SiteTheme>(`/api/site-theme/${id}/activate`, {})
}

// Remove a saved theme — never the builtin Default, never the active one.
export function deleteSiteTheme(id: string): Promise<{ removed: string }> {
  return api.delete<{ removed: string }>(`/api/site-theme/${id}`)
}

// Restores + activates the builtin Default theme.
export function resetSiteTheme(): Promise<SiteTheme> {
  return api.post<SiteTheme>('/api/site-theme/reset', {})
}
