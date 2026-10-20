"use client"

import { useTranslations } from "next-intl"
import { Topbar } from "@core/components/layout/topbar"
import { InboxSection } from "@core/components/inbox/inbox-section"

export default function InboxPage() {
  const t = useTranslations("inbox")
  return (
    <>
      <Topbar title={t("title")} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <InboxSection />
      </div>
    </>
  )
}
