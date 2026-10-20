"use client"

import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { FollowupPanel } from '@core/components/followups/followup-panel'

export default function ReceptionFollowupsPage() {
  const t = useTranslations('recepsion-kontrollet-pas-operative')
  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <FollowupPanel showDoctorColumn />
      </div>
    </>
  )
}
