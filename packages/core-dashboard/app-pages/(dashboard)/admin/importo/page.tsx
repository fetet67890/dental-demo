"use client"

import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { ImportoSection } from '@core/components/settings/importo-section'

// Own top-level page now — used to be a tab buried inside Konfigurimi, but
// import is a frequent enough workflow (onboarding a new clinic's existing
// patient/appointment history) to deserve direct sidebar access instead of
// two clicks into settings. ImportoSection itself already has its own
// Patients/Appointments switcher, so this page is just the Topbar shell.
export default function ImportoPage() {
  const t = useTranslations('admin-importo')

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <ImportoSection />
      </div>
    </>
  )
}
