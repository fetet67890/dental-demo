"use client"

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { Download, Share, X } from 'lucide-react'
import { Button } from '@core/components/ui/button'

// Chrome/Edge/Android's actual install API — not in lib.dom.d.ts, so it's
// typed here rather than pulling in a whole extra @types package for one
// event shape.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

const DISMISSED_KEY = 'hypocrates_pwa_install_dismissed'

function isStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    // iOS Safari's own (non-standard, pre-matchMedia) way of exposing this.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIOS() {
  if (typeof navigator === 'undefined') return false
  return /iphone|ipad|ipod/i.test(navigator.userAgent)
}

// One unified banner works for both mobile and desktop — Chrome/Edge fire
// the identical beforeinstallprompt event on both (mobile "add to home
// screen" vs. desktop "install as a windowed app" is the browser's own UI
// from there, not something this code needs to branch on). iOS Safari never
// fires that event at all — there is no one-click install API there, full
// stop — so it gets its own manual-steps message instead of a dead button.
// Any other browser (Firefox, etc.) that doesn't support either path just
// never shows this at all; installability is a progressive enhancement,
// never something to fake or apologize for.
export function PwaInstallPrompt() {
  const t = useTranslations('pwa-install')
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [visible, setVisible] = useState(false)
  const [ios, setIos] = useState(false)
  const [installing, setInstalling] = useState(false)

  useEffect(() => {
    // Demo mode is a plain website, not an installable app — see
    // pwa-register.tsx's matching check (no service worker means this event
    // would never fire anyway, but skip the listener/banner outright rather
    // than rely on that indirectly).
    if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return
    if (isStandalone()) return
    let dismissed = false
    try { dismissed = window.localStorage.getItem(DISMISSED_KEY) === '1' } catch { /* ignore */ }
    if (dismissed) return

    if (isIOS()) {
      setIos(true)
      setVisible(true)
      return
    }

    const handler = (e: Event) => {
      // Suppresses Chrome's own mini-infobar so this banner is the one and
      // only install prompt shown, instead of both competing for attention.
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setVisible(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const dismiss = () => {
    setVisible(false)
    try { window.localStorage.setItem(DISMISSED_KEY, '1') } catch { /* ignore */ }
  }

  const install = async () => {
    if (!deferredPrompt) return
    setInstalling(true)
    try {
      await deferredPrompt.prompt()
      await deferredPrompt.userChoice
    } finally {
      setInstalling(false)
      setDeferredPrompt(null)
      // Don't nag again in this browser regardless of accept/dismiss — a
      // real "no thanks" and a real "yes, now installed" both mean this
      // banner has done its job either way.
      dismiss()
    }
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label={t('title')}
      className="fixed bottom-36 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-auto sm:w-80 z-[64] bg-card border border-border rounded-2xl shadow-2xl p-4 animate-in fade-in-0 slide-in-from-bottom-4 duration-300"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
          <Download className="h-5 w-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">{t('title')}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{ios ? t('iosBody') : t('body')}</p>
          {ios ? (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
              <Share className="h-3.5 w-3.5 shrink-0" />
              {t('iosSteps')}
            </p>
          ) : (
            <Button
              size="sm"
              className="mt-3 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
              onClick={install}
              disabled={installing}
            >
              {installing ? t('installing') : t('install')}
            </Button>
          )}
        </div>
        <button
          onClick={dismiss}
          className="text-muted-foreground hover:text-foreground shrink-0"
          aria-label={t('dismiss')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
