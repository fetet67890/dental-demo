"use client"

import { fmtLEK, fmtEUR } from '@core/lib/currency'
import { cn } from '@core/lib/utils'

interface DualPriceProps {
  amount: number
  className?: string
  size?: 'sm' | 'md'
}

export function DualPrice({ amount, className, size = 'md' }: DualPriceProps) {
  return (
    <span className={cn('inline-flex flex-col leading-tight', className)}>
      <span className={size === 'sm' ? 'text-sm font-medium' : 'font-medium'}>
        {fmtLEK(amount)}
      </span>
      <span className="text-xs text-muted-foreground">{fmtEUR(amount)}</span>
    </span>
  )
}
