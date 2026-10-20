"use client"

// Generic settings-section shell. The extra specialty section (Dermatology's
// DermatologjiSection, or none for a specialty without one) comes from
// useSpecialtyConfig().settingsExtraSection instead of being switch-cased
// here — see ../../lib/specialty-config.ts's SettingsExtraSection shape.
import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AuditimetSection } from '@core/components/settings/auditimet-section'
import { KursiSection } from '@core/components/settings/kursi-section'
import { AparencaSection } from '@core/components/settings/aparenca-section'
import { AutomationSection } from '@core/components/settings/automation-section'
import { DemoSection } from '@core/components/settings/demo-section'
import { cn, syncUrl } from '@core/lib/utils'
import { useSpecialtyConfig } from '../../context/specialty-config-context'

interface SectionDef {
  key: string
  label: string
  subtitle: string
  icon: string
}

// Extracted from the old standalone /admin/sistemi page — now one of three
// sections inside /admin/profili (see that page for the outer switcher and
// the onSubtitleChange wiring that puts this section's active-tab subtitle
// into the shared Topbar). Keeps its own `sub` query param (distinct from
// the outer page's `section` param) so deep links like "?section=sistemi&sub=kursi"
// still land on the exact same nested tab the old /admin/sistemi?section=kursi did.
export function SistemiBody({ onSubtitleChange }: { onSubtitleChange?: (subtitle: string) => void }) {
  const t = useTranslations('admin-sistemi')
  const searchParams = useSearchParams()
  const { settingsExtraSection } = useSpecialtyConfig()

  const BASE_SECTIONS: { key: string; icon: string; render: () => React.ReactNode }[] = [
    { key: 'auditimet', icon: 'manage_search',      render: () => <AuditimetSection /> },
    { key: 'kursi',     icon: 'currency_exchange',   render: () => <KursiSection /> },
    { key: 'aparenca',  icon: 'palette',             render: () => <AparencaSection /> },
    ...(settingsExtraSection
      ? [{ key: settingsExtraSection.key, icon: settingsExtraSection.icon, render: () => <settingsExtraSection.Component /> }]
      : []),
    { key: 'automation', icon: 'monitor_heart',      render: () => <AutomationSection /> },
    { key: 'demo',      icon: 'restart_alt',         render: () => <DemoSection /> },
  ]

  const SECTIONS: SectionDef[] = BASE_SECTIONS.map(({ key, icon }) => ({
    key,
    label: t(`sections.${key}.label`),
    subtitle: t(`sections.${key}.subtitle`),
    icon,
  }))

  const requested = searchParams.get('sub')
  const [fallback, setFallback] = useState<string>('auditimet')
  const active: string = (requested && SECTIONS.some(s => s.key === requested)) ? requested : fallback

  const setActive = (key: string) => {
    setFallback(key)
    syncUrl(`/admin/profili?section=sistemi&sub=${key}`)
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
        {BASE_SECTIONS.find(s => s.key === active)?.render()}
      </div>
    </div>
  )
}
