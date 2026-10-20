import type { MetadataRoute } from 'next'
import { cookies } from 'next/headers'
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale } from '../lib/i18n-config'
import type { DashboardSpecialtyConfig } from '../lib/specialty-config'

// Replaces the old static public/manifest.webmanifest — a plain JSON file
// has no way to know which language to describe itself in, since it's
// fetched before any app code runs (often before the visitor has ever
// loaded a page at all, if the browser prefetches it for an install
// banner). This Next.js file-convention route (still served at the exact
// same /manifest.webmanifest URL app/layout.tsx already points at) runs
// server-side per request instead, so it CAN read the same locale cookie
// every other page already respects.
export async function buildManifest(specialtyConfig: DashboardSpecialtyConfig): Promise<MetadataRoute.Manifest> {
  const cookieStore = await cookies()
  const requested = cookieStore.get(LOCALE_COOKIE)?.value
  const locale = isSupportedLocale(requested) ? requested : DEFAULT_LOCALE
  const description = locale === 'en' ? specialtyConfig.brandDescriptionEn : specialtyConfig.brandDescriptionSq

  return {
    name: specialtyConfig.brandName,
    short_name: specialtyConfig.brandName,
    description,
    start_url: '/hyrje',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: '#122056',
    theme_color: '#122056',
    lang: locale,
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
