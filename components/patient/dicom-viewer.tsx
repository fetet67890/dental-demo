"use client"

import { useEffect, useId, useRef, useState } from 'react'
import * as cornerstone from '@cornerstonejs/core'
import type { Types } from '@cornerstonejs/core'
import * as cornerstoneTools from '@cornerstonejs/tools'
import cornerstoneDICOMImageLoader from '@cornerstonejs/dicom-image-loader'
import { cn } from '@core/lib/utils'
import { ZoomIn, Ruler, RotateCcw, Sun } from 'lucide-react'
import { useTranslations } from 'next-intl'

// Cornerstone's init()/addTool() calls are global (module-level) state, not
// per-component — memoized once per page lifetime so mounting several
// viewers (or React re-mounting one in dev) doesn't re-register everything.
let initPromise: Promise<void> | null = null

function ensureInitialized() {
  if (!initPromise) {
    initPromise = (async () => {
      cornerstoneDICOMImageLoader.init()
      await cornerstone.init()
      cornerstoneTools.init()
      const tools = [
        cornerstoneTools.PanTool,
        cornerstoneTools.ZoomTool,
        cornerstoneTools.WindowLevelTool,
        cornerstoneTools.StackScrollTool,
        cornerstoneTools.LengthTool,
      ]
      for (const Tool of tools) {
        try {
          cornerstoneTools.addTool(Tool)
        } catch {
          // already added — happens on dev hot-reload re-mounts
        }
      }
    })()
  }
  return initPromise
}

interface DicomViewerProps {
  src: string
  className?: string
}

type PrimaryMode = 'windowlevel' | 'length'

// Zoom (right-click drag), Pan (middle-click drag), and stack-scroll (wheel)
// stay active on their own dedicated mouse buttons at all times — only the
// *left*-click behavior needs to toggle, since Window/Level and the Length
// measurement tool both naturally want the primary button and would
// conflict if both were active on it simultaneously.
export function DicomViewer({ src, className }: DicomViewerProps) {
  const t = useTranslations('dicom-viewer')
  const elementRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<cornerstone.RenderingEngine | null>(null)
  const idBase = useId().replace(/[^a-zA-Z0-9]/g, '')
  const viewportId = `dicom-viewport-${idBase}`
  const renderingEngineId = `dicom-engine-${idBase}`
  const toolGroupId = `dicom-toolgroup-${idBase}`

  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState('')
  const [primaryMode, setPrimaryMode] = useState<PrimaryMode>('windowlevel')

  useEffect(() => {
    let cancelled = false

    async function setup() {
      setStatus('loading')
      try {
        await ensureInitialized()
        if (cancelled || !elementRef.current) return

        const renderingEngine = new cornerstone.RenderingEngine(renderingEngineId)
        engineRef.current = renderingEngine

        renderingEngine.enableElement({
          viewportId,
          type: cornerstone.Enums.ViewportType.STACK,
          element: elementRef.current,
        })

        const toolGroup = cornerstoneTools.ToolGroupManager.createToolGroup(toolGroupId)
        if (!toolGroup) throw new Error(t('errors.toolGroupFailed'))
        toolGroup.addTool(cornerstoneTools.PanTool.toolName)
        toolGroup.addTool(cornerstoneTools.ZoomTool.toolName)
        toolGroup.addTool(cornerstoneTools.WindowLevelTool.toolName)
        toolGroup.addTool(cornerstoneTools.StackScrollTool.toolName)
        toolGroup.addTool(cornerstoneTools.LengthTool.toolName)
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

        const imageId = `wadouri:${src}`
        const viewport = renderingEngine.getViewport<Types.IStackViewport>(viewportId)
        await viewport.setStack([imageId])
        viewport.resetCamera()
        renderingEngine.render()

        if (!cancelled) setStatus('ready')
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMessage(err instanceof Error ? err.message : t('errors.imageLoadFailed'))
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
      engineRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src])

  const setPrimary = (mode: PrimaryMode) => {
    const toolGroup = cornerstoneTools.ToolGroupManager.getToolGroup(toolGroupId)
    if (!toolGroup) return
    setPrimaryMode(mode)
    const primaryBinding = { bindings: [{ mouseButton: cornerstoneTools.Enums.MouseBindings.Primary }] }
    if (mode === 'windowlevel') {
      toolGroup.setToolActive(cornerstoneTools.WindowLevelTool.toolName, primaryBinding)
      toolGroup.setToolPassive(cornerstoneTools.LengthTool.toolName)
    } else {
      toolGroup.setToolActive(cornerstoneTools.LengthTool.toolName, primaryBinding)
      toolGroup.setToolPassive(cornerstoneTools.WindowLevelTool.toolName)
    }
  }

  const resetView = () => {
    const viewport = engineRef.current?.getViewport<Types.IStackViewport>(viewportId)
    viewport?.resetCamera()
    engineRef.current?.render()
  }

  return (
    <div className={cn('relative w-full h-full bg-black rounded-xl overflow-hidden', className)}>
      <div ref={elementRef} className="w-full h-full" />

      {status === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm">
          {t('loadingImage')}
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
            <button
              type="button"
              onClick={() => setPrimary('windowlevel')}
              title={t('windowLevelTitle')}
              className={cn('p-1.5 rounded transition-colors', primaryMode === 'windowlevel' ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary')}
            >
              <Sun className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setPrimary('length')}
              title={t('lengthTitle')}
              className={cn('p-1.5 rounded transition-colors', primaryMode === 'length' ? 'bg-accent text-accent-foreground' : 'hover:bg-secondary')}
            >
              <Ruler className="h-4 w-4" />
            </button>
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
            <ZoomIn className="h-3 w-3" />
            <span>{t('helpText')}</span>
          </div>
        </>
      )}
    </div>
  )
}
