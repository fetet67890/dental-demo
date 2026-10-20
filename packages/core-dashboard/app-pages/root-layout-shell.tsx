import type { Metadata } from 'next'
import { Poppins, Outfit, Inter, Plus_Jakarta_Sans, Manrope, Space_Grotesk } from 'next/font/google'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { Toaster } from '../components/ui/sonner'
import { AuthProvider } from '../context/auth-context'
import { ClinicSettingsProvider } from '../context/clinic-settings-context'
import { QuickActionsProvider } from '../context/quick-actions-context'
import { CurrencyProvider } from '../context/currency-context'
import { TourProvider } from '../context/tour-context'
import { TourOverlay } from '../components/tour/tour-overlay'
import { SetupWizardProvider } from '../context/setup-wizard-context'
import { SetupWizardOverlay } from '../components/setup-wizard/setup-wizard-overlay'
import { BlockingModalProvider } from '../context/blocking-modal-context'
import { ThemeProvider } from '../components/theme-provider'
import { PwaRegister } from '../components/pwa-register'
import { PwaInstallPrompt } from '../components/pwa-install-prompt'
import { SpecialtyConfigProvider } from '../context/specialty-config-context'
import type { DashboardSpecialtyConfig } from '../lib/specialty-config'

// Every option below is self-hosted via next/font/google — all six are
// declared unconditionally as CSS variables on <body> (see className below),
// regardless of which one is active, so switching presets in Aparenca is an
// instant CSS-variable swap with no new network request. All are Google
// Fonts under the SIL Open Font License — free for any commercial use, no
// attribution or licensing concern. See lib/theme-presets.ts (FontPreset)
// for the preset <-> CSS variable mapping.
const poppins = Poppins({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-poppins' })
const outfit = Outfit({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-outfit' })
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-inter' })
const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-jakarta' })
const manrope = Manrope({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-manrope' })
const grotesk = Space_Grotesk({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-grotesk' })

// The favicon is staff-editable (Aparenca settings) and stored in the API's
// clinic_settings table — fetched server-side here so the correct <link
// rel="icon"> is already in the very first HTML response. See
// context/clinic-settings-context.tsx for the client-side, post-upload
// refresh counterpart.
export async function getFaviconUrl(): Promise<string | null> {
  // Front-end-only demo build has no api container at all — see
  // lib/demo/mock-client.ts's own comment; that mock only intercepts
  // browser-side calls, not this server-side generateMetadata() path.
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return null

  // Server-side fetch — runs inside this container, so it must use the
  // Docker-internal service address (API_INTERNAL_URL=http://api:5000), not
  // NEXT_PUBLIC_API_URL (baked in for the *browser*). Falls back to
  // NEXT_PUBLIC_API_URL for plain (non-Docker) local dev.
  const API_BASE = process.env.API_INTERNAL_URL || process.env.NEXT_PUBLIC_API_URL || ''
  try {
    // A hard timeout matters a lot more here than on a normal client-side
    // fetch: this runs during generateMetadata(), which `next build` invokes
    // at build time for every statically-generated page. An unreachable API
    // would otherwise hang the entire production build instead of just
    // failing over to the '/logo.png' fallback below.
    const res = await fetch(`${API_BASE}/api/settings/clinic`, { cache: 'no-store', signal: AbortSignal.timeout(5000) })
    if (!res.ok) return null
    const data = await res.json()
    return data.favicon_url || null
  } catch {
    return null
  }
}

export function buildMetadata(specialtyConfig: DashboardSpecialtyConfig, faviconUrl: string | null): Metadata {
  return {
    title: specialtyConfig.brandName,
    description: specialtyConfig.brandDescriptionSq,
    generator: specialtyConfig.brandName,
    manifest: '/manifest.webmanifest',
    icons: {
      icon: faviconUrl || '/logo.png',
      apple: '/icons/icon-192.png',
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: 'black-translucent',
      // The actual home-screen label after "Add to Home Screen"/install —
      // this and manifest.webmanifest's name/short_name are the three
      // places the installed app's name actually comes from.
      title: specialtyConfig.brandName,
    },
  }
}

export const rootViewport = {
  themeColor: '#122056',
  width: 'device-width',
  initialScale: 1,
} as const

export async function RootLayoutShell({
  children,
}: {
  children: React.ReactNode
}) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} className="bg-background" suppressHydrationWarning>
      {/* Material Symbols Outlined and every font above are self-hosted —
          see the @font-face in globals.css; no external font CDN dependency. */}
      <body className={`${poppins.variable} ${outfit.variable} ${inter.variable} ${jakarta.variable} ${manrope.variable} ${grotesk.variable} font-sans antialiased`}>
        {/* Decorative only, hidden in solid mode — see .glass-ambient-bg in
            globals.css. Gives the glass surfaces above something colorful to
            actually blur; never touches panel opacity/text legibility. */}
        <div className="glass-ambient-bg" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <PwaRegister />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SpecialtyConfigProvider>
            <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
              <AuthProvider>
                <BlockingModalProvider>
                  <TourProvider>
                    <ClinicSettingsProvider>
                      <SetupWizardProvider>
                        <QuickActionsProvider>
                          <CurrencyProvider>
                            {children}
                          </CurrencyProvider>
                          <Toaster position="top-right" />
                          <TourOverlay />
                          <SetupWizardOverlay />
                          <PwaInstallPrompt />
                        </QuickActionsProvider>
                      </SetupWizardProvider>
                    </ClinicSettingsProvider>
                  </TourProvider>
                </BlockingModalProvider>
              </AuthProvider>
            </ThemeProvider>
          </SpecialtyConfigProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
