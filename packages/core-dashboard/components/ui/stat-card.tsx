"use client"

import { cn } from '@core/lib/utils'
import type { LucideIcon } from 'lucide-react'

type CardColor = 'accent' | 'blue' | 'sky' | 'emerald' | 'amber' | 'rose' | 'purple'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon | string
  color?: CardColor
  trend?: { value: number; isPositive: boolean }
  description?: string
  className?: string
}

const colors: Record<CardColor, { iconBg: string; iconText: string; accent: string }> = {
  // No real semantic meaning (a generic count/metric, not a status) — tracks
  // the clinic's chosen accent preset instead of a fixed hue.
  accent:  { iconBg: 'bg-accent/10', iconText: 'text-accent', accent: 'bg-accent'   },

  blue:    { iconBg: 'ibg-blue',    iconText: 'ic-blue',    accent: 'strip-blue'    },
  emerald: { iconBg: 'ibg-green',   iconText: 'ic-green',   accent: 'strip-green'   },
  amber:   { iconBg: 'ibg-amber',   iconText: 'ic-amber',   accent: 'strip-amber'   },
  rose:    { iconBg: 'ibg-red',     iconText: 'ic-red',     accent: 'strip-red'     },
  sky:     { iconBg: 'ibg-sky',     iconText: 'ic-sky',     accent: 'strip-sky'     },
  purple:  { iconBg: 'ibg-purple',  iconText: 'ic-purple',  accent: 'bg-[var(--p-purple)]' },
}

export function StatCard({ title, value, icon, color = 'accent', trend, description, className }: StatCardProps) {
  const IconComponent = typeof icon !== 'string' ? (icon as React.ComponentType<{ className?: string }>) : null
  const c = colors[color]

  return (
    <div data-slot="card" className={cn(
      'relative bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3 sm:p-4',
      className
    )}>
      {/* Colored top strip */}
      <div className={cn('absolute top-0 left-0 right-0 h-[3px]', c.accent)} />

      <div className="flex items-center justify-between gap-2 mt-1">
        <div className="flex-1 min-w-0">
          <p className="text-xs text-muted-foreground font-medium mb-1 truncate">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-foreground leading-none tracking-tight">{value}</p>
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 mt-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-semibold',
              trend.isPositive ? 'chip-green' : 'chip-red'
            )}>
              <span>{trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
            </div>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </div>

        <div className={cn('w-8 h-8 sm:w-9 sm:h-9 rounded-lg flex items-center justify-center shrink-0', c.iconBg)}>
          {typeof icon === 'string' ? (
            <span
              className={cn('material-symbols-outlined select-none leading-none', c.iconText)}
              style={{ fontSize: 18 }}
            >
              {icon}
            </span>
          ) : IconComponent ? (
            <IconComponent className={cn('h-4 w-4', c.iconText)} />
          ) : null}
        </div>
      </div>
    </div>
  )
}
