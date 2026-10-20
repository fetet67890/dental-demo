"use client"

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

function CbctViewerLoading() {
  const t = useTranslations('cbct-viewer-dynamic')
  return (
    <div className="w-full h-full min-h-[300px] rounded-xl bg-black/90 flex items-center justify-center">
      <p className="text-sm text-white/70">{t('loading')}</p>
    </div>
  )
}

// WebGL/canvas can't run during server-side rendering — same pattern as the
// 2D DICOM viewer and the 3D tooth chart.
export const CbctViewer = dynamic(
  () => import('./cbct-viewer').then((m) => m.CbctViewer),
  {
    ssr: false,
    loading: CbctViewerLoading,
  }
)
