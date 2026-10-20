"use client"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ExternalLink } from 'lucide-react'
import { Topbar } from '@core/components/layout/topbar'
import { Button } from '@core/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@core/components/ui/tabs'
import { PostimetSection } from '@core/components/settings/postimet-section'
import { DeshmiteSection } from '@core/components/settings/deshmite-section'
import { GaleriaSection } from '@core/components/settings/galeria-section'
import { SajtiSection } from '@core/components/settings/sajti-section'
import { MetaSection } from '@core/components/settings/meta-section'
import { KerkesaSection } from '@core/components/website/kerkesa-section'
import { PermbajtjaSection } from '@core/components/settings/permbajtja-section'
import { PamjaFaqesSection } from '@core/components/settings/pamja-faqes-section'
import { syncUrl } from '@core/lib/utils'

type TabKey = 'postimet' | 'deshmite' | 'galeria' | 'sajti' | 'meta' | 'kerkesa' | 'permbajtja' | 'pamja'
const TAB_KEYS: TabKey[] = ['postimet', 'deshmite', 'galeria', 'sajti', 'meta', 'kerkesa', 'permbajtja', 'pamja']

// Hypocrates-Web serves both the public marketing site and the patient
// portal — same app, same base URL (see next.config.mjs's redirects() for
// the matching NEXT_PUBLIC_PORTAL_URL used there).
const WEBSITE_URL = process.env.NEXT_PUBLIC_PORTAL_URL || 'http://localhost:3001'

export default function WebsitePage() {
  const t = useTranslations('admin-uebsajti')
  const searchParams = useSearchParams()

  const requested = searchParams.get('tab') as TabKey | null
  const [fallback, setFallback] = useState<TabKey>('postimet')
  const tab: TabKey = (requested && TAB_KEYS.includes(requested)) ? requested : fallback

  const setTab = (key: TabKey) => {
    setFallback(key)
    syncUrl(`/admin/uebsajti?tab=${key}`)
  }

  return (
    <>
      <Topbar title={t(`tabs.${tab}.title`)} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          {/* Tab nav and the "Visit Website" link share one row now — used
              to be two stacked rows (the link alone, right-aligned, on its
              own line above the nav), which read as a wide band of empty
              space with a small button floating in the corner of it. */}
          <div className="flex items-center justify-between gap-3 flex-wrap mb-6">
            <TabsList className="flex-wrap h-auto">
              {TAB_KEYS.map((key) => (
                <TabsTrigger key={key} value={key}>{t(`tabs.${key}.label`)}</TabsTrigger>
              ))}
            </TabsList>
            <a href={WEBSITE_URL} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <ExternalLink className="h-3.5 w-3.5" />
                {t('visitWebsite')}
              </Button>
            </a>
          </div>
          <TabsContent value="postimet"><PostimetSection /></TabsContent>
          <TabsContent value="deshmite"><DeshmiteSection /></TabsContent>
          <TabsContent value="galeria"><GaleriaSection /></TabsContent>
          <TabsContent value="sajti"><SajtiSection /></TabsContent>
          <TabsContent value="meta"><MetaSection /></TabsContent>
          <TabsContent value="kerkesa"><KerkesaSection /></TabsContent>
          <TabsContent value="permbajtja"><PermbajtjaSection /></TabsContent>
          <TabsContent value="pamja"><PamjaFaqesSection /></TabsContent>
        </Tabs>
      </div>
    </>
  )
}
