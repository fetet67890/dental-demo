// countryCode maps to an SVG flag component from country-flag-icons (see
// components/layout/language-toggle.tsx) — plain Unicode flag emoji render
// as literal two-letter text ("AL"/"GB") on Windows/Chromium, so a real
// vector icon is used instead of relying on emoji font support.
export const SUPPORTED_LOCALES = [
  { code: 'sq', label: 'Shqip', countryCode: 'AL' },
  { code: 'en', label: 'English', countryCode: 'GB' },
] as const

export type Locale = (typeof SUPPORTED_LOCALES)[number]['code']

export const DEFAULT_LOCALE: Locale = 'sq'
export const LOCALE_COOKIE = 'hypocrates_locale'

export function isSupportedLocale(value: string | undefined): value is Locale {
  return !!value && SUPPORTED_LOCALES.some((l) => l.code === value)
}
