"use client"

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { getExchangeRate } from '@core/lib/api/settings'
import {
  setExchangeRate, setForeignRates, setDisplayCurrency,
  SUPPORTED_CURRENCIES, type Currency,
} from '@core/lib/currency'

const STORAGE_KEY = 'hypocrates_display_currency'

function readStoredCurrency(): Currency {
  if (typeof window === 'undefined') return 'LEK'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  return (SUPPORTED_CURRENCIES as string[]).includes(stored || '') ? (stored as Currency) : 'LEK'
}

interface CurrencyContextValue {
  currency: Currency
  setCurrency: (currency: Currency) => void
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null)

export function CurrencyProvider({ children }: { children: ReactNode }) {
  // Starts 'LEK' on the server render and during hydration (matching
  // lib/currency.ts's own default) so SSR/CSR markup match; the real stored
  // preference is applied a tick later, same pattern as next-themes.
  const [currency, setCurrencyState] = useState<Currency>('LEK')

  useEffect(() => {
    const stored = readStoredCurrency()
    setDisplayCurrency(stored)
    setCurrencyState(stored)
  }, [])

  // Exchange rates (LEK + USD/GBP-per-EUR) come from the same endpoint the
  // Kursi settings card already uses — fetched once here so every page's
  // money formatting has a real rate before the user ever touches the
  // selector, not just the fallback baked into lib/currency.ts.
  useEffect(() => {
    let cancelled = false
    getExchangeRate().then((data) => {
      if (cancelled) return
      setExchangeRate(data.eur_to_lek)
      setForeignRates({ USD: data.rates?.USD, GBP: data.rates?.GBP })
    }).catch(() => {})
    return () => { cancelled = true }
  }, [])

  const setCurrency = useCallback((next: Currency) => {
    setDisplayCurrency(next)
    setCurrencyState(next)
    window.localStorage.setItem(STORAGE_KEY, next)
  }, [])

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency }}>
      {children}
    </CurrencyContext.Provider>
  )
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext)
  if (!ctx) throw new Error('useCurrency must be used within a CurrencyProvider')
  return ctx
}

// lib/currency.ts's fmtLEK/fmtEUR are plain functions read by ~80 call sites
// across the app, not a hook — nothing would otherwise know to re-render when
// the selected currency changes. Each role layout (admin/doktor/recepsion)
// wraps just its routed page content (not the sidebar, not DataProvider) with
// this, so switching currency reformats every visible amount without an app
// reload, a lost sidebar state, or a wasted data refetch. `contents` keeps
// the wrapper invisible to layout (flex/grid children pass through as if it
// weren't there).
export function CurrencyRemountBoundary({ children }: { children: ReactNode }) {
  const { currency } = useCurrency()
  return <div key={currency} className="contents">{children}</div>
}
