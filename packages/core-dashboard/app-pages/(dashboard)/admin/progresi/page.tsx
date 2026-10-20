"use client"

import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { OrthoProgressPanel } from '@core/components/ortho/ortho-progress-panel'
import { OrthoStageTemplateManager } from '@core/components/ortho/ortho-stage-template-manager'

// Multi-session treatment courses (laser series, chemical peels, PRP, etc.
// or orthodontic stages, depending on the specialty) tracked against the
// generic ortho_progressions/ortho_stage_templates tables. Fully shared —
// each app supplies its own admin-progresi.json copy for the page title.
export default function AdminProgressPage() {
  const t = useTranslations('admin-progresi')
  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        <OrthoProgressPanel showDoctorColumn />
        <OrthoStageTemplateManager />
      </div>
    </>
  )
}
