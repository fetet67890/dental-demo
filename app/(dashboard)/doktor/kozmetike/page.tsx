"use client"

import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { Topbar } from '@core/components/layout/topbar'
import { CosmeticPlanPanel } from '@/components/cosmetic/cosmetic-plan-panel'

export default function DoctorCosmeticPage() {
  const t = useTranslations('doktor-kozmetike')
  const { user } = useAuth()

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        {user?.id && <CosmeticPlanPanel doctorId={user.id} />}
      </div>
    </>
  )
}
