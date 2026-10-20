"use client"

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@core/components/ui/tabs'
import { RecallsSection } from '@core/components/notifications/recalls-section'
import { AppointmentRemindersSection } from '@core/components/notifications/appointment-reminders-section'
import { ManualNotificationSection } from '@core/components/notifications/manual-notification-section'
import { syncUrl } from '@core/lib/utils'

type TabKey = 'recalls' | 'appointments' | 'notifications'
const TAB_KEYS: TabKey[] = ['recalls', 'appointments', 'notifications']

export default function RecallsPage() {
  const t = useTranslations('admin-rikujtesat')
  const tNjoftimet = useTranslations('admin-njoftimet')
  const searchParams = useSearchParams()

  const requested = searchParams.get('tab') as TabKey | null
  const [fallback, setFallback] = useState<TabKey>('recalls')
  const tab: TabKey = (requested && TAB_KEYS.includes(requested)) ? requested : fallback

  const setTab = (key: TabKey) => {
    setFallback(key)
    syncUrl(`/admin/rikujtesat?tab=${key}`)
  }

  const meta: Record<TabKey, { title: string; subtitle: string }> = {
    recalls: { title: t('title'), subtitle: t('subtitle') },
    appointments: { title: t('appointmentReminders.title'), subtitle: t('appointmentReminders.subtitle') },
    notifications: { title: tNjoftimet('topbar.title'), subtitle: tNjoftimet('topbar.subtitle') },
  }

  return (
    <>
      <Topbar title={meta[tab].title} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
          <TabsList className="mb-6">
            <TabsTrigger value="recalls">{t('tabs.recalls')}</TabsTrigger>
            <TabsTrigger value="appointments">{t('tabs.appointments')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('tabs.notifications')}</TabsTrigger>
          </TabsList>
          <TabsContent value="recalls">
            <RecallsSection />
          </TabsContent>
          <TabsContent value="appointments">
            <AppointmentRemindersSection />
          </TabsContent>
          <TabsContent value="notifications">
            <ManualNotificationSection />
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
