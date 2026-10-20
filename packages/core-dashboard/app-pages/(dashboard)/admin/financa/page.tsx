"use client"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@core/components/ui/tabs'
import { FinanceOverviewSection } from '@core/components/finance/finance-overview-section'
import { InvoicesSection } from '@core/components/finance/invoices-section'
import { DebtAlertsSection } from '@core/components/finance/debt-alerts-section'
import { CommissionsSection } from '@core/components/finance/commissions-section'
import { syncUrl } from '@core/lib/utils'

type TabKey = 'overview' | 'faturat' | 'borxhet' | 'komisionet'
const TAB_KEYS: TabKey[] = ['overview', 'faturat', 'borxhet', 'komisionet']

export default function FinancePage() {
  const t = useTranslations('admin-financa')
  const tFaturat = useTranslations('admin-faturat')
  const tBorxhet = useTranslations('admin-borxhet')
  const tKomisionet = useTranslations('admin-komisionet')
  const searchParams = useSearchParams()

  const requested = searchParams.get('tab') as TabKey | null
  const [fallback, setFallback] = useState<TabKey>('overview')
  const tab: TabKey = (requested && TAB_KEYS.includes(requested)) ? requested : fallback

  const setTab = (key: TabKey) => {
    setFallback(key)
    syncUrl(`/admin/financa?tab=${key}`)
  }

  const meta: Record<TabKey, { title: string; subtitle: string }> = {
    overview: { title: t('title'), subtitle: t('subtitle') },
    faturat: { title: tFaturat('title'), subtitle: tFaturat('subtitle') },
    borxhet: { title: tBorxhet('title'), subtitle: tBorxhet('subtitle') },
    komisionet: { title: tKomisionet('title'), subtitle: tKomisionet('subtitle') },
  }

  return (
    <>
      <Topbar title={meta[tab].title} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="mb-6">
            <TabsTrigger value="overview">{t('tabs.overview')}</TabsTrigger>
            <TabsTrigger value="faturat">{t('tabs.invoices')}</TabsTrigger>
            <TabsTrigger value="borxhet">{t('tabs.debts')}</TabsTrigger>
            <TabsTrigger value="komisionet">{t('tabs.commissions')}</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <FinanceOverviewSection />
          </TabsContent>
          <TabsContent value="faturat">
            <InvoicesSection />
          </TabsContent>
          <TabsContent value="borxhet">
            <DebtAlertsSection />
          </TabsContent>
          <TabsContent value="komisionet">
            <CommissionsSection />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
