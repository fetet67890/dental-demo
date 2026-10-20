"use client"

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

function Loading3DChart() {
  const t = useTranslations('tooth-chart-3d-dynamic')
  return (
    <div className="bg-card rounded-2xl border border-border/50 p-6">
      <div className="w-full h-[420px] rounded-xl bg-secondary/20 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">{t('loading')}</p>
      </div>
    </div>
  )
}

// WebGL can't run during server-side rendering — load the actual 3D chart
// client-only. Everything that wants the 3D chart should import from here,
// not directly from tooth-chart-3d.tsx.
export const ToothChart3D = dynamic(
  () => import('./tooth-chart-3d').then((m) => m.ToothChart3D),
  {
    ssr: false,
    loading: Loading3DChart,
  }
)
