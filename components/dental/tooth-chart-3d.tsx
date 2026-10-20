"use client"

import { Suspense, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { cn } from '@core/lib/utils'
import { TeethModel, formatToothNumber, type NumberingSystem, type ToothPoints } from './teeth-model'
import { CameraRig, DEFAULT_CAMERA_POS } from './camera-rig'
import type { ToothConditionType } from '@/types/specialty'

interface ToothChart3DProps {
  selectedTeeth?: number[]
  onTeethSelect?: (teeth: number[]) => void
  treatedTeeth?: number[]
  plannedTeeth?: number[]
  conditions?: Partial<Record<number, ToothConditionType>>
  onConditionChange?: (tooth: number, condition: ToothConditionType) => void
  className?: string
}

const UPPER_ROW = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_ROW = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

// Hoisted to a stable module-level constant — an inline object literal here
// would be a NEW reference every render (e.g. every tooth hover triggers a
// re-render via TeethModel's `hovered` state), and react-three-fiber
// reconfigures the whole renderer whenever the `camera` prop's reference
// changes, including resetting shadowMap.type to the deprecated
// PCFSoftShadowMap default — which Three.js then "corrects" every single
// frame with a console warning, over and over, until the browser exhausts
// its WebGL context limit and kills the canvas entirely. Confirmed directly
// against the installed three/@react-three/fiber source, not guessed.
const CAMERA_CONFIG = { position: DEFAULT_CAMERA_POS, fov: 40 }

// The tooth's own occlusal/gumline midpoint — used to focus the camera on
// a specific tooth. Points come from TeethModel's onPointsReady callback,
// computed live from the real geometry (not hardcoded), so this works
// correctly for the 4 duplicated wisdom teeth too.
function toothCenter(points: ToothPoints, fdi: number): [number, number, number] | null {
  const p = points[fdi]
  if (!p) return null
  return [p.occlusal[0], (p.occlusal[1] + p.gumline[1]) / 2, p.occlusal[2]]
}

export function ToothChart3D({
  selectedTeeth = [],
  onTeethSelect,
  treatedTeeth = [],
  plannedTeeth = [],
  conditions = {},
  onConditionChange,
  className,
}: ToothChart3DProps) {
  const t = useTranslations('tooth-chart-3d')
  const CONDITION_LABELS: Record<ToothConditionType, string> = {
    shendoshe:     t('conditions.shendoshe'),
    mungon:        t('conditions.mungon'),
    mbushje:       t('conditions.mbushje'),
    kurore:        t('conditions.kurore'),
    ure:           t('conditions.ure'),
    implant:       t('conditions.implant'),
    kanal_rrenjor: t('conditions.kanal_rrenjor'),
  }
  const [activeTooth, setActiveTooth] = useState<number | null>(null)
  const [numberingSystem, setNumberingSystem] = useState<NumberingSystem>('fdi')
  const [toothPoints, setToothPoints] = useState<ToothPoints>({})
  const [focusPoint, setFocusPoint] = useState<[number, number, number] | null>(null)
  const [interactionToken, setInteractionToken] = useState(0)
  const [resetToken, setResetToken] = useState(0)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  const handleSelect = (tooth: number) => {
    const center = toothCenter(toothPoints, tooth)
    if (center) setFocusPoint(center)
    if (onConditionChange) {
      setActiveTooth(tooth)
      return
    }
    if (!onTeethSelect) return
    if (selectedTeeth.includes(tooth)) {
      onTeethSelect(selectedTeeth.filter(t => t !== tooth))
    } else {
      onTeethSelect([...selectedTeeth, tooth])
    }
  }

  const resetView = () => { setFocusPoint(null); setResetToken(t => t + 1) }

  // dollyIn/dollyOut only zoom the direction their name implies when given a
  // scale BELOW 1 (verified directly against the three-stdlib source).
  const ZOOM_STEP = 0.8
  const zoomIn = () => {
    setInteractionToken(t => t + 1)
    controlsRef.current?.dollyIn(ZOOM_STEP)
    controlsRef.current?.update()
  }
  const zoomOut = () => {
    setInteractionToken(t => t + 1)
    controlsRef.current?.dollyOut(ZOOM_STEP)
    controlsRef.current?.update()
  }

  const activeCondition = activeTooth ? conditions[activeTooth] : undefined

  const renderToothButton = (tooth: number) => (
    <button
      key={tooth}
      type="button"
      onClick={() => handleSelect(tooth)}
      className={cn(
        'text-[11px] font-semibold rounded-md border py-1.5 transition-colors',
        (activeTooth === tooth || selectedTeeth.includes(tooth))
          ? 'bg-accent text-accent-foreground border-accent'
          : 'border-border/60 bg-secondary/20 hover:bg-accent/10 text-foreground',
        conditions[tooth] === 'mungon' && 'opacity-50 border-dashed line-through',
      )}
    >
      {formatToothNumber(tooth, numberingSystem)}
    </button>
  )

  return (
    <div className={cn('bg-card rounded-2xl border border-border/50 p-6', className)}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="text-center flex-1">
          <h3 className="text-lg font-bold text-foreground">{t('dentalChart3D')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('controlsHint')}
          </p>
        </div>
        <select
          value={numberingSystem}
          onChange={(e) => setNumberingSystem(e.target.value as NumberingSystem)}
          className="text-xs rounded-md border border-border/60 bg-secondary/20 px-2 py-1.5 text-foreground"
          title={t('numberingSystemTitle')}
        >
          <option value="fdi">FDI</option>
          <option value="universal">Universal</option>
        </select>
      </div>

      <div className="relative w-full h-[420px] rounded-xl overflow-hidden bg-gradient-to-b from-secondary/40 to-secondary/10">
        <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
          <button
            type="button"
            onClick={zoomIn}
            title={t('zoomIn')}
            className="w-8 h-8 rounded-lg bg-background/80 border border-border/60 flex items-center justify-center text-sm hover:bg-accent/10"
          >
            +
          </button>
          <button
            type="button"
            onClick={zoomOut}
            title={t('zoomOut')}
            className="w-8 h-8 rounded-lg bg-background/80 border border-border/60 flex items-center justify-center text-sm hover:bg-accent/10"
          >
            −
          </button>
          <button
            type="button"
            onClick={resetView}
            title={t('resetView')}
            className="w-8 h-8 rounded-lg bg-background/80 border border-border/60 flex items-center justify-center text-sm hover:bg-accent/10"
          >
            ⟲
          </button>
        </div>

        <Canvas shadows="percentage" camera={CAMERA_CONFIG}>
          {/* Dimmed slightly from the original 0.8/1.1/0.4/1.0 — was reading a
              touch too bright/washed-out on the model. */}
          <ambientLight intensity={0.65} />
          <directionalLight position={[3, 5, 4]} intensity={0.9} castShadow />
          <directionalLight position={[-3, 2, -4]} intensity={0.32} />
          <Environment preset="studio" environmentIntensity={0.8} />
          <Suspense fallback={null}>
            <TeethModel
              conditions={conditions}
              selectedTeeth={selectedTeeth}
              treatedTeeth={treatedTeeth}
              plannedTeeth={plannedTeeth}
              onSelect={handleSelect}
              numberingSystem={numberingSystem}
              onPointsReady={setToothPoints}
            />
          </Suspense>
          <CameraRig focusPoint={focusPoint} controlsRef={controlsRef} interactionToken={interactionToken} resetToken={resetToken} />
          <OrbitControls
            ref={controlsRef}
            enablePan
            onStart={() => setInteractionToken(t => t + 1)}
            minDistance={1.2}
            maxDistance={16}
            minPolarAngle={Math.PI * 0.02}
            maxPolarAngle={Math.PI * 0.98}
          />
        </Canvas>
      </div>

      <div className="mt-4 space-y-1.5">
        <div className="grid grid-cols-8 gap-1">
          {UPPER_ROW.map(renderToothButton)}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {LOWER_ROW.map(renderToothButton)}
        </div>
      </div>

      {/* Condition picker — rendered as a normal HTML panel rather than an
          in-3D popover, since positioning a DOM popover against a moving
          orbit-controlled camera is unreliable. */}
      {onConditionChange && activeTooth && (
        <div className="mt-4 p-4 bg-secondary/30 rounded-xl border border-border/50">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-foreground">{t('toothNumber', { tooth: formatToothNumber(activeTooth, numberingSystem) })}</p>
            <button
              type="button"
              onClick={() => setActiveTooth(null)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              {t('close')}
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(Object.keys(CONDITION_LABELS) as ToothConditionType[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => onConditionChange(activeTooth, c)}
                className={cn(
                  'text-xs px-2.5 py-1.5 rounded-lg border transition-colors',
                  activeCondition === c
                    ? 'bg-accent/15 border-accent text-accent font-semibold'
                    : 'border-border hover:bg-accent/10'
                )}
              >
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
      )}

      {!onConditionChange && selectedTeeth.length > 0 && (
        <div className="mt-4 p-3 bg-accent/10 rounded-xl text-center">
          <p className="text-sm font-semibold text-accent">
            {selectedTeeth.length === 1
              ? t('selectedToothSingle', { tooth: selectedTeeth[0] })
              : t('selectedTeethMultiple', { teeth: selectedTeeth.join(', ') })}
          </p>
        </div>
      )}
    </div>
  )
}
