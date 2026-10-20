"use client"

import { useEffect, useId, useRef, useState } from 'react'
import * as cornerstone from '@cornerstonejs/core'
import type { Types } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'
import { cn } from '@core/lib/utils'
import { RotateCcw } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Shares the same init pattern as DicomViewer (module-level, memoized once
// per page lifetime) plus a one-time volume-loader registration, since a
// CBCT study is a whole stack of related slices reconstructed into a 3D
// volume rather than one flat 2D image.
let coreInitPromise: Promise<void> | null = null
let volumeLoaderRegistered = false

function ensureInitialized() {
  if (!coreInitPromise) {
    coreInitPromise = (async () => {
      cornerstoneDICOMImageLoader.init()
      await cornerstone.init()
      cornerstoneTools.init()
      const tools = [
        cornerstoneTools.PanTool,
        cornerstoneTools.ZoomTool,
        cornerstoneTools.WindowLevelTool,
        cornerstoneTools.StackScrollTool,
      ]
      for (const Tool of tools) {
        try {
          cornerstoneTools.addTool(Tool)
        } catch {
          // already added — dev hot-reload re-mount
        }
      }
      if (!volumeLoaderRegistered) {
        // The package's own shipped types declare this loader's `options`
        // param more narrowly (requires `imageIds`) than `VolumeLoaderFn`'s
        // general `Record<string, unknown>` signature promises — confirmed
        // by reading the actual implementation, not guessed; every call
        // here goes through `createAndCacheVolume(volumeId, { imageIds })`
        // below, so the real contract is always satisfied at the call site.
        cornerstone.volumeLoader.registerVolumeLoader(
          'cornerstoneStreamingImageVolume',
          cornerstone.cornerstoneStreamingImageVolumeLoader as unknown as Types.VolumeLoaderFn
        )
        volumeLoaderRegistered = true
      }
    })()
  }
  return coreInitPromise
}

interface CbctViewerProps {
  // URLs of every slice in the CBCT series, in the same order they were
  // uploaded as a study — Cornerstone reconstructs the actual 3D
  // arrangement from each slice's own DICOM position/orientation metadata,
  // not from this array's order, but they all need to be present.
  imageUrls: string[]
  className?: string
}

type Orientation = 'axial' | 'coronal' | 'sagittal'

export function CbctViewer({ imageUrls, className }: CbctViewerProps) {
  const t = useTranslations('cbct-viewer')
  const ORIENTATION_LABELS: Record<Orientation, string> = {
    axial: t('orientation.axial'),
    coronal: t('orientation.coronal'),
    sagittal: t('orientation.sagittal'),
  }
  const elementRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<cornerstone.RenderingEngine | null>(null)
  const idBase = useId().replace(/[^a-zA-Z0-9]/g, '')
  const viewportId = `cbct-viewport-${idBase}`
  const renderingEngineId = `cbct-engine-${idBase}`
  const toolGroupId = `cbct-toolgroup-${idBase}`
  const volumeId = `cornerstoneStreamingImageVolume:cbct-volume-${idBase}`

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [orientation, setOrientationState] = useState<Orientation>('axial')

  useEffect(() => {
    let cancelled = false

    async function setup() {
      setStatus('loading')
      try {
        await ensureInitialized()
        if (cancelled || !elementRef.current) return
        if (imageUrls.length === 0) throw new Error(t('errors.noSlices'))

        const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId)
        engineRef.current = renderingEngine

        renderingEngine.enableElement({
          viewportId,
          type: cornerstone.Enums.ViewportType.ORTHOGRAPHIC,
          element: elementRef.current,
          defaultOptions: { orientation: cornerstone.Enums.OrientationAxis.AXIAL },
        })

        const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)
        if (!toolGroup) throw new Error(t('errors.toolGroupFailed'))
        toolGroup.addTool(cornerstoneTools.PanTool.toolName)
        toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)
        toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName)
        toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName)
        toolGroup.addViewport(viewportId, renderingEngineId)

        toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }],
        })
        toolGroup.setToolActive(cornerstoneTools.ZoomTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Secondary }],
        })
        toolGroup.setToolActive(cornerstoneTools.PanTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Auxiliary }],
        })
        toolGroup.setToolActive(cornerstoneTools.StackScrollTool.toolName, {
          bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Wheel }],
        })

        const imageIds = imageUrls.map((url) => `wadouri:${url}`)
        await cornerstone.volumeLoader.createAndCacheVolume(volumeId, { imageIds })
        await cornerstone.setVolumesForViewports(renderingEngine, [{ volumeId }], [viewportId])

        const viewport = renderingEngine.getViewport<Types.IVolumeViewport>(viewportId)
        viewport.resetCamera()
        renderingEngine.render()

        if (!cancelled) setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(err instanceof Error ? err.message : t('errors.volumeLoadFailed'))
        }
      }
    }

    setup()

    return () => {
      cancelled = true
      try {
        cornerstoneTools.ToolGroupManager.destroyToolGroup(toolGroupId)
      } catch {
        // already gone
      }
      try {
        engineRef.current?.destroy()
      } catch {
        // already gone
      }
      try {
        cornerstone.cache.removeVolumeLoadObject(volumeId)
      } catch {
        // never cached, or already removed
      }
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageUrls])

  const changeOrientation = (next: Orientation) => {
    setOrientationState(next)
    const viewport = engineRef.current?.getViewport<Types.IVolumeViewport>(viewportId)
    if (!viewport) return
    const axisMap: Record<Orientation, cornerstone.Enums.OrientationAxis> = {
      axial: cornerstone.Enums.OrientationAxis.AXIAL,
      coronal: cornerstone.Enums.OrientationAxis.CORONAL,
      sagittal: cornerstone.Enums.OrientationAxis.SAGITTAL,
    }
    viewport.setOrientation(axisMap[next])
    engineRef.current?.render()
  }

  const resetView = () => {
    const viewport = engineRef.current?.getViewport<Types.IVolumeViewport>(viewportId)
    viewport?.resetCamera()
    engineRef.current?.render()
  }

  return (
    <div className={cn('relative w-full h-full bg-black rounded-xl overflow-hidden', className)}>
      <div ref={elementRef} className="w-full h-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm text-center px-4">
          {t('loadingVolume', { count: imageUrls.length })}
        </div>
      )}
      {status === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/85 text-white text-sm p-4 text-center">
          {errorMessage}
        </div>
      )}

      {status === 'ready' && (
        <>
          <div className="absolute top-2 right-2 flex gap-1 bg-background/85 rounded-lg p-1 border border-border/60">
            {(Object.keys(ORIENTATION_LABELS) as Orientation[]).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => changeOrientation(o)}
                className={cn(
                  'px-2 py-1.5 rounded text-[11px] font-medium transition-colors',
                  orientation === o ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary'
                )}
              >
                {ORIENTATION_LABELS[o]}
              </button>
            ))}
            <button
              type="button"
              onClick={resetView}
              title={t('resetView')}
              className="p-1.5 rounded hover:bg-secondary transition-colors"
            >
              <RotateCcw className="h-4 w-4" />
            </button>
          </div>
          <div className="absolute bottom-2 left-2 flex items-center gap-1.5 text-[11px] text-white/70 bg-black/50 rounded-md px-2 py-1">
            <span>{t('helpText')}</span>
          </div>
        </>
      )}
    </div>
  )
}
