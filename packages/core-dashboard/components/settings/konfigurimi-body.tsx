"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { IntegrimetSection } from '@core/components/settings/integrimet-section'
import { SherbimetSection } from '@core/components/settings/sherbimet-section'
import { DhomatSection } from '@core/components/settings/dhomat-section'
import { KlinikatSection } from '@core/components/settings/klinikat-section'
import { ArkivaSection } from '@core/components/settings/arkiva-section'
import { ServicePackagesSection } from '@core/components/settings/service-packages-section'
import { cn, syncUrl } from '@core/lib/utils'

// 'importo' used to be a tab here — it's now its own sidebar page
// (/admin/importo, see app/(dashboard)/admin/importo/page.tsx) since import
// is a frequent enough workflow to deserve direct nav access, not a
// sub-section buried two clicks into Konfigurimi.
type SectionKey = 'integrimet' | 'sherbimet' | 'dhomat' | 'klinikat' | 'arkiva' | 'paketat'

interface SectionDef {
  key: SectionKey
  label: string
  subtitle: string
  icon: string
}

const SECTION_ICONS: Record<SectionKey, string> = {
  integrimet: 'vpn_key',
  sherbimet: 'stethoscope',
  dhomat: 'door_front',
  klinikat: 'business',
  arkiva: 'inventory_2',
  paketat: 'redeem',
}
const SECTION_KEYS: SectionKey[] = ['integrimet', 'sherbimet', 'paketat', 'dhomat', 'klinikat', 'arkiva']

function renderSection(key: SectionKey) {
  switch (key) {
    case 'integrimet': return <IntegrimetSection />
    case 'sherbimet':  return <SherbimetSection />
    case 'paketat':    return <ServicePackagesSection />
    case 'dhomat':     return <DhomatSection />
    case 'klinikat':   return <KlinikatSection />
    case 'arkiva':     return <ArkivaSection />
  }
}

// Extracted from the old standalone /admin/konfigurimi page — now one of
// three sections inside /admin/profili. See sistemi-body.tsx for the
// matching pattern and why `sub` (not `section`) is the query param here.
export function KonfigurimiBody({ onSubtitleChange }: { onSubtitleChange?: (subtitle: string) => void }) {
  const t = useTranslations('admin-konfigurimi')
  const searchParams = useSearchParams()

  const SECTIONS: SectionDef[] = SECTION_KEYS.map(key => ({
    key,
    label: t(`sections.${key}.label`),
    subtitle: t(`sections.${key}.subtitle`),
    icon: SECTION_ICONS[key],
  }))

  const requested = searchParams.get('sub') as SectionKey | null
  const [fallback, setFallback] = useState<SectionKey>('integrimet')
  const active: SectionKey = (requested && SECTIONS.some(s => s.key === requested)) ? requested : fallback

  const setActive = (key: SectionKey) => {
    setFallback(key)
    syncUrl(`/admin/profili?section=konfigurimi&sub=${key}`)
  }

  const activeDef = SECTIONS.find(s => s.key === active)!

  useEffect(() => {
    onSubtitleChange?.(activeDef.subtitle)
  }, [activeDef.subtitle]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      {/* Section nav */}
      <nav className="lg:w-56 shrink-0 flex flex-row flex-wrap lg:flex-col gap-1 lg:sticky lg:top-4 lg:self-start">
        {SECTIONS.map(item => (
          <button
            key={item.key}
            onClick={() => setActive(item.key)}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors text-left',
              'lg:w-full shrink-0',
              active === item.key
                ? 'bg-accent text-accent-foreground shadow-sm'
                : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
            )}
          >
            <span
              className="material-symbols-outlined select-none leading-none shrink-0"
              style={{ fontSize: 18, fontVariationSettings: active === item.key ? "'FILL' 1" : "'FILL' 0" }}
            >
              {item.icon}
            </span>
            {item.label}
          </button>
        ))}
      </nav>

      {/* Active section content */}
      <div className="flex-1 min-w-0">
        {renderSection(active)}
      </div>
    </div>
  )
}
