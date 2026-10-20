"use client"

import { useState } from 'react'
import { ToggleGroup, ToggleGroupItem } from '@core/components/ui/toggle-group'
import { ToothChart } from './tooth-chart'
import { ToothChart3D } from './tooth-chart-3d-dynamic'
import type { ToothConditionType } from '@/types/specialty'

interface ToothChartSwitcherProps {
  selectedTeeth?: number[]
  onTeethSelect?: (teeth: number[]) => void
  treatedTeeth?: number[]
  plannedTeeth?: number[]
  conditions?: Partial<Record<number, ToothConditionType>>
  onConditionChange?: (tooth: number, condition: ToothConditionType) => void
  className?: string
}

// Drop-in replacement for <ToothChart> anywhere it's currently used — same
// props, same behavior, just with a 2D/3D toggle on top. Defaults to 2D
// since it's the lighter-weight, proven option; 3D loads its WebGL/model
// dependencies lazily (via the dynamic import in tooth-chart-3d-dynamic)
// only once actually switched to, so picking 2D costs nothing extra here.
export function ToothChartSwitcher(props: ToothChartSwitcherProps) {
  const [mode, setMode] = useState<'2d' | '3d'>('2d')

  return (
    <div className="space-y-3">
      <div className="flex justify-center">
        <ToggleGroup
          type="single"
          variant="outline"
          value={mode}
          onValueChange={(value) => value && setMode(value as '2d' | '3d')}
        >
          <ToggleGroupItem value="2d" className="text-xs px-4">2D</ToggleGroupItem>
          <ToggleGroupItem value="3d" className="text-xs px-4">3D</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {mode === '2d' ? <ToothChart {...props} /> : <ToothChart3D {...props} />}
    </div>
  )
}
