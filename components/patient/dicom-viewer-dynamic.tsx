"use client"

import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'

function DicomViewerLoading() {
  const t = useTranslations('dicom-viewer-dynamic')
  return (
    <div className="w-full h-full min-h-[300px] rounded-xl bg-black/90 flex items-center justify-center">
      <p className="text-sm text-white/70">{t('loading')}</p>
    </div>
  )
}

// WebGL/canvas can't run during server-side rendering — load the actual
// DICOM viewer client-only, same pattern as the 3D tooth chart.
export const DicomViewer = dynamic(
  () => import('./dicom-viewer').then((m) => m.DicomViewer),
  {
    ssr: false,
    loading: DicomViewerLoading,
  }
)
