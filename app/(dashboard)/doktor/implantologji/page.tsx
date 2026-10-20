"use client"

import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { Topbar } from '@core/components/layout/topbar'
import { ImplantPlanPanel } from '@/components/implantology/implant-plan-panel'

export default function DoctorImplantologyPage() {
  const t = useTranslations('doktor-implantologji')
  const { user } = useAuth()

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        {user?.id && <ImplantPlanPanel doctorId={user.id} />}
      </div>
    </>
  )
}
