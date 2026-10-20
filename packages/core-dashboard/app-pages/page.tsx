"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'

export default function Home() {
  const t = useTranslations('common')
  const { user, isInitializing } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isInitializing) {
      if (user) {
        switch (user.role) {
          case 'admin':
            router.push('/admin')
            break
          case 'mjek':
            router.push('/doktor')
            break
          case 'recepsion':
            router.push('/recepsion')
            break
        }
      } else {
        router.push('/hyrje')
      }
    }
  }, [user, isInitializing, router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center">
        <div className="animate-pulse">
          <div className="h-12 w-48 bg-secondary rounded-xl mx-auto mb-4" />
          <p className="text-muted-foreground">{t('loading')}</p>
        </div>
      </div>
    </div>
  )
}
