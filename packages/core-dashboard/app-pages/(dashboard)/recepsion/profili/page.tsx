"use client"

import { useTranslations } from "next-intl"
import { Topbar } from "@core/components/layout/topbar"
import { ProfileSettings } from "@core/components/profile/profile-settings"

export default function RecepsionProfili() {
  const t = useTranslations('recepsion-profili')
  return (
    <>
      <Topbar
        title={t('title')}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <ProfileSettings />
      </div>
    </>
  )
}
