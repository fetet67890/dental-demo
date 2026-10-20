"use client"

import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { FollowupPanel } from '@core/components/followups/followup-panel'
import { FollowupTemplateManager } from '@core/components/followups/followup-template-manager'

export default function AdminFollowupsPage() {
  const t = useTranslations('admin-kontrollet-pas-operative')
  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        <FollowupPanel showDoctorColumn />
        <FollowupTemplateManager />
      </div>
    </>
  )
}
