"use client"

import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { Topbar } from '@core/components/layout/topbar'
import { OrthoProgressPanel } from '@core/components/ortho/ortho-progress-panel'

// Multi-session treatment courses (laser series, chemical peels, PRP, etc.
// or orthodontic stages, depending on the specialty) tracked against the
// generic ortho_progressions/ortho_stage_templates tables. Fully shared —
// each app supplies its own doktor-progresi.json copy for the page title.
export default function DoctorProgressPage() {
  const t = useTranslations('doktor-progresi')
  const { user } = useAuth()

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        {user?.id && <OrthoProgressPanel doctorId={user.id} />}
      </div>
    </>
  )
}
