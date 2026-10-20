"use client"

import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { Topbar } from '@core/components/layout/topbar'
import { FollowupPanel } from '@core/components/followups/followup-panel'

export default function DoctorFollowupsPage() {
  const t = useTranslations('doktor-kontrollet-pas-operative')
  const { user } = useAuth()

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        {user?.id && <FollowupPanel doctorId={user.id} />}
      </div>
    </>
  )
}
