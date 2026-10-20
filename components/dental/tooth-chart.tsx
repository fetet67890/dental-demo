"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { cn } from '@core/lib/utils'
import { Popover, PopoverContent, PopoverTrigger } from '@core/components/ui/popover'
import type { ToothConditionType } from '@/types/specialty'

interface ToothChartProps {
  selectedTeeth?: number[]
  onTeethSelect?: (teeth: number[]) => void
  treatedTeeth?: number[]
  plannedTeeth?: number[]
  conditions?: Partial<Record<number, ToothConditionType>>
  onConditionChange?: (tooth: number, condition: ToothConditionType) => void
  className?: string
}

const upperTeeth = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28]
const lowerTeeth = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38]

const CONDITION_STYLES: Record<ToothConditionType, string> = {
  shendoshe:     'bg-card text-foreground border-border',
  mungon:        'bg-[var(--p-neutral-bg)] text-[var(--p-neutral-txt)] border-[var(--p-neutral)]/40 line-through',
  mbushje:       'bg-[var(--p-sky-bg)] text-[var(--p-sky-txt)] border-[var(--p-sky)]/40',
  kurore:        'bg-[var(--p-amber-bg)] text-[var(--p-amber-txt)] border-[var(--p-amber)]/40',
  ure:           'bg-[var(--p-purple-bg)] text-[var(--p-purple-txt)] border-[var(--p-purple)]/40',
  implant:       'bg-[var(--p-indigo-bg)] text-[var(--p-indigo-txt)] border-[var(--p-indigo)]/40',
  kanal_rrenjor: 'bg-[var(--p-orange-bg)] text-[var(--p-orange-txt)] border-[var(--p-orange)]/40',
}

export function ToothChart({
  selectedTeeth = [],
  onTeethSelect,
  treatedTeeth = [],
  plannedTeeth = [],
  conditions = {},
  onConditionChange,
  className,
}: ToothChartProps) {
  const t = useTranslations('tooth-chart')
  const [hoveredTooth, setHoveredTooth] = useState<number | null>(null)

  const CONDITION_LABELS: Record<ToothConditionType, string> = {
    shendoshe:     t('conditions.shendoshe'),
    mungon:        t('conditions.mungon'),
    mbushje:       t('conditions.mbushje'),
    kurore:        t('conditions.kurore'),
    ure:           t('conditions.ure'),
    implant:       t('conditions.implant'),
    kanal_rrenjor: t('conditions.kanal_rrenjor'),
  }

  const getToothStatus = (tooth: number) => {
    if (selectedTeeth.includes(tooth)) return 'selected'
    if (plannedTeeth.includes(tooth)) return 'planned'
    if (treatedTeeth.includes(tooth)) return 'treated'
    return 'normal'
  }

  const getToothStyles = (tooth: number, status: string) => {
    const condition = conditions[tooth]
    if (condition && condition !== 'shendoshe') return CONDITION_STYLES[condition]

    switch (status) {
      case 'selected':
        return 'bg-accent text-accent-foreground border-accent shadow-lg scale-110'
      case 'planned':
        return 'bg-[var(--p-purple-bg)] text-[var(--p-purple-txt)] border-[var(--p-purple)]/40 border-dashed'
      case 'treated':
        return 'bg-[var(--p-green-bg)] text-[var(--p-green-txt)] border-[var(--p-green)]/40'
      default:
        return 'bg-card text-foreground border-border hover:border-accent hover:bg-accent/10'
    }
  }

  const handleClick = (tooth: number) => {
    if (!onTeethSelect) return
    if (selectedTeeth.includes(tooth)) {
      onTeethSelect(selectedTeeth.filter(t => t !== tooth))
    } else {
      onTeethSelect([...selectedTeeth, tooth])
    }
  }

  const renderTooth = (tooth: number) => {
    const status = getToothStatus(tooth)
    const isHovered = hoveredTooth === tooth
    const condition = conditions[tooth]

    const button = (
      <button
        key={tooth}
        type={onConditionChange ? 'button' : undefined}
        onClick={() => !onConditionChange && handleClick(tooth)}
        onMouseEnter={() => setHoveredTooth(tooth)}
        onMouseLeave={() => setHoveredTooth(null)}
        className={cn(
          'w-9 h-10 rounded-lg border-2 text-xs font-bold transition-all duration-200',
          getToothStyles(tooth, status),
          isHovered && status === 'normal' && 'scale-105',
          (onTeethSelect || onConditionChange) && 'cursor-pointer'
        )}
        title={condition ? CONDITION_LABELS[condition] : undefined}
      >
        {tooth}
      </button>
    )

    if (!onConditionChange) return button

    return (
      <Popover key={tooth}>
        <PopoverTrigger asChild>{button}</PopoverTrigger>
        <PopoverContent className="w-44 p-2">
          <p className="text-xs font-semibold text-muted-foreground mb-1.5 px-1">{t('toothNumber', { tooth })}</p>
          <div className="flex flex-col gap-0.5">
            {(Object.keys(CONDITION_LABELS) as ToothConditionType[]).map((c) => (
              <button
                key={c}
                onClick={() => onConditionChange(tooth, c)}
                className={cn(
                  'text-left text-xs px-2 py-1.5 rounded-md hover:bg-accent/10 transition-colors',
                  condition === c && 'bg-accent/15 font-semibold'
                )}
              >
                {CONDITION_LABELS[c]}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    )
  }

  return (
    <div className={cn('bg-card rounded-2xl border border-border/50 p-6', className)}>
      <div className="text-center mb-6">
        <h3 className="text-lg font-bold text-foreground">{t('dentalChart')}</h3>
        <p className="text-sm text-muted-foreground">
          {onConditionChange ? t('clickToothHint') : t('selectTeethHint')}
        </p>
      </div>

      {/* Upper Jaw Label */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground font-semibold px-2">{t('upperJaw')}</span>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Upper Teeth */}
      <div className="flex justify-center gap-1.5 mb-8">
        {upperTeeth.map(renderTooth)}
      </div>

      {/* Center Line */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground">{t('right')}</span>
          <div className="w-px h-4 bg-muted-foreground/30" />
        </div>
        <div className="w-4 h-4 rounded-full bg-accent/20 border-2 border-accent" />
        <div className="flex flex-col items-center">
          <span className="text-[10px] text-muted-foreground">{t('left')}</span>
          <div className="w-px h-4 bg-muted-foreground/30" />
        </div>
        <div className="flex-1 border-t-2 border-dashed border-muted-foreground/30" />
      </div>

      {/* Lower Teeth */}
      <div className="flex justify-center gap-1.5 mb-3">
        {lowerTeeth.map(renderTooth)}
      </div>

      {/* Lower Jaw Label */}
      <div className="flex items-center justify-center gap-2 mb-4">
        <div className="h-px bg-border flex-1" />
        <span className="text-xs text-muted-foreground font-semibold px-2">{t('lowerJaw')}</span>
        <div className="h-px bg-border flex-1" />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded border-2 border-border bg-card" />
          <span className="text-xs text-muted-foreground">{t('normal')}</span>
        </div>
        {onConditionChange ? (
          (Object.keys(CONDITION_LABELS) as ToothConditionType[])
            .filter(c => c !== 'shendoshe')
            .map(c => (
              <div key={c} className="flex items-center gap-2">
                <div className={cn('w-4 h-4 rounded border-2', CONDITION_STYLES[c])} />
                <span className="text-xs text-muted-foreground">{CONDITION_LABELS[c]}</span>
              </div>
            ))
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-accent bg-accent" />
              <span className="text-xs text-muted-foreground">{t('selected')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-[var(--p-purple)]/40 border-dashed bg-[var(--p-purple-bg)]" />
              <span className="text-xs text-muted-foreground">{t('planned')}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded border-2 border-[var(--p-green)]/40 bg-[var(--p-green-bg)]" />
              <span className="text-xs text-muted-foreground">{t('treated')}</span>
            </div>
          </>
        )}
      </div>

      {/* Selected Teeth Info */}
      {selectedTeeth.length > 0 && (
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
