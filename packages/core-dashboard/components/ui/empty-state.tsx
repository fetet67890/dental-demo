"use client"

import { cn } from '@core/lib/utils'
import { LucideIcon } from 'lucide-react'
import { Button } from './button'

interface EmptyStateProps {
  icon: LucideIcon
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center py-12 px-6',
        className
      )}
    >
      <div className="p-4 bg-secondary/50 rounded-2xl mb-4">
        <Icon className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">{title}</h3>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs mb-4">
          {description}
        </p>
      )}
      {action && (
        <Button onClick={action.onClick} variant="outline" className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
