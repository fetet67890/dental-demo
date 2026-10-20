"use client"

import { cn } from '@core/lib/utils'
import Image from 'next/image'

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function LoadingSpinner({ size = 'md', className }: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-3',
    lg: 'h-12 w-12 border-4',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-accent border-t-transparent',
        sizeClasses[size],
        className
      )}
    />
  )
}

interface LoadingScreenProps {
  message?: string
  // Defaults to the app's own logo, but callers with access to
  // useClinicSettings() should pass the clinic's actual configured logo —
  // this screen is the very first thing staff see after logging in, so it
  // should reflect their branding, not always the stock one.
  logoSrc?: string
}

export function LoadingScreen({ message = 'Duke u ngarkuar...', logoSrc = '/logo.png' }: LoadingScreenProps) {
  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center gap-8">
      <div className="relative">
        <Image
          src={logoSrc}
          alt="Hypocrates"
          width={180}
          height={54}
          className="animate-pulse object-contain"
          priority
        />
      </div>
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-12 w-12 rounded-full border-4 border-secondary" />
          <div className="absolute inset-0 h-12 w-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
        </div>
        <p className="text-muted-foreground text-sm font-medium animate-pulse">
          {message}
        </p>
      </div>
    </div>
  )
}

interface SkeletonProps {
  className?: string
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div className={cn('skeleton', className)} />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl p-6 border border-border/50 space-y-4">
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
        <Skeleton className="h-12 w-12 rounded-xl" />
      </div>
    </div>
  )
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="divide-y divide-border">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="p-4 flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonCalendar() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 overflow-hidden">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <Skeleton className="h-6 w-32" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-8 w-8 rounded-lg" />
        </div>
      </div>
      <div className="grid grid-cols-8 border-b">
        <Skeleton className="h-12 m-2" />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-12 m-2" />
        ))}
      </div>
      <div className="p-4 space-y-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="grid grid-cols-8 gap-2">
            <Skeleton className="h-16" />
            {Array.from({ length: 7 }).map((_, j) => (
              <Skeleton key={j} className="h-16" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function PageLoading() {
  return (
    <div className="flex-1 p-4 lg:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-32 rounded-2xl" />
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <SkeletonTable />
    </div>
  )
}
