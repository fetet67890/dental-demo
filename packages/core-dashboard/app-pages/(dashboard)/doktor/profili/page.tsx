"use client"

import { useTranslations } from "next-intl"
import { Topbar } from "@core/components/layout/topbar"
import { ProfileSettings } from "@core/components/profile/profile-settings"

export default function DoktorProfili() {
  const t = useTranslations('doktor-profili')
  return (
    <>
      <Topbar />
      <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
        </div>
        <ProfileSettings />
      </div>
    </>
  )
}
