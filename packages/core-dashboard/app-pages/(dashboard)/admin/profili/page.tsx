"use client"

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { ProfileSettings } from '@core/components/profile/profile-settings'
import { SistemiBody } from '@core/components/settings/sistemi-body'
import { KonfigurimiBody } from '@core/components/settings/konfigurimi-body'
import { Tabs, TabsList, TabsTrigger } from '@core/components/ui/tabs'
import { syncUrl } from '@core/lib/utils'

type TopSection = 'profili' | 'sistemi' | 'konfigurimi'
const TOP_SECTIONS: TopSection[] = ['profili', 'sistemi', 'konfigurimi']

// Unified home for everything account/clinic-settings related — was three
// separate pages (Profili, Sistemi, Konfigurimi), each with its own sidebar
// entry. Sistemi and Konfigurimi kept their own internal section nav (see
// sistemi-body.tsx / konfigurimi-body.tsx) — they just collapse to one
// section each here instead of a whole top-level page, so this is a two-level
// nav: this outer 3-way switcher, then each section's own existing sub-nav.
export default function ProfiliPage() {
  const t = useTranslations('admin-profili')
  const tSistemi = useTranslations('admin-sistemi')
  const tKonfig = useTranslations('admin-konfigurimi')
  const searchParams = useSearchParams()

  const requested = searchParams.get('section') as TopSection | null
  const [fallback, setFallback] = useState<TopSection>('profili')
  const active: TopSection = (requested && TOP_SECTIONS.includes(requested)) ? requested : fallback

  const setActive = (key: TopSection) => {
    setFallback(key)
    syncUrl(`/admin/profili?section=${key}`)
  }

  // Nested sub-section subtitle (Sistemi/Konfigurimi report theirs up) so the
  // shared Topbar still shows the precise "you are here", same as before the merge.
  const [subSubtitle, setSubSubtitle] = useState('')
  useEffect(() => { setSubSubtitle('') }, [active])

  const topLabel: Record<TopSection, string> = {
    profili: t('title'),
    sistemi: tSistemi('title'),
    konfigurimi: tKonfig('title'),
  }
  const topSubtitle: Record<TopSection, string> = {
    profili: t('subtitle'),
    sistemi: subSubtitle,
    konfigurimi: subSubtitle,
  }

  return (
    <>
      <Topbar title={topLabel[active]} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <Tabs value={active} onValueChange={(v) => setActive(v as TopSection)} className="mb-6">
          <TabsList className="w-fit">
            {TOP_SECTIONS.map((key) => (
              <TabsTrigger key={key} value={key}>{topLabel[key]}</TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {active === 'profili' && <ProfileSettings />}
        {active === 'sistemi' && <SistemiBody onSubtitleChange={setSubSubtitle} />}
        {active === 'konfigurimi' && <KonfigurimiBody onSubtitleChange={setSubSubtitle} />}
      </div>
    </>
  )
}
