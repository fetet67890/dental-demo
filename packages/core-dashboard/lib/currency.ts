// Default fallback — overwritten at runtime by the live rate from the backend.
// This is the EUR<->LEK data-entry rate (e.g. "type a price in EUR, store the
// LEK equivalent" in add-service-dialog/currency-input/sherbimet-section) —
// unrelated to which currency the dashboard *displays* amounts in below, so
// it keeps its original name/behavior untouched.
export let LEK_PER_EUR = 103

export function setExchangeRate(rate: number) {
  if (rate > 50 && rate < 500) LEK_PER_EUR = rate
}

export function lekToEur(lek: number): number {
  return lek / LEK_PER_EUR
}

// ── Display currency ─────────────────────────────────────────────────────
// Every amount in the database is stored in LEK — this section only controls
// what currency it's *shown as* in the UI (Aparenca > Language & Currency).
// Kept as plain module state (same pattern as LEK_PER_EUR above) so the ~80
// existing fmtLEK/fmtEUR call sites across the app need zero changes to pick
// up a new currency — CurrencyProvider remounts the tree when it changes.

export type Currency = 'LEK' | 'EUR' | 'USD' | 'GBP'
export const SUPPORTED_CURRENCIES: Currency[] = ['LEK', 'EUR', 'GBP', 'USD']

interface ForeignRates { USD: number; GBP: number }

// Sane fallbacks (roughly current real-world EUR rates) — overwritten at
// runtime from the same /api/settings/exchange-rate call that already
// supplies LEK_PER_EUR above.
export let FOREIGN_RATES: ForeignRates = { USD: 1.08, GBP: 0.85 }

export function setForeignRates(rates: { USD?: number; GBP?: number }) {
  if (rates.USD && rates.USD > 0.3 && rates.USD < 3) FOREIGN_RATES.USD = rates.USD
  if (rates.GBP && rates.GBP > 0.3 && rates.GBP < 3) FOREIGN_RATES.GBP = rates.GBP
}

export let DISPLAY_CURRENCY: Currency = 'LEK'

export function setDisplayCurrency(currency: Currency) {
  DISPLAY_CURRENCY = currency
}

const CURRENCY_SYMBOLS: Record<Exclude<Currency, 'LEK'>, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}

function convertFromLek(lek: number, currency: Currency): number {
  if (currency === 'LEK') return lek
  const eur = lekToEur(lek)
  if (currency === 'EUR') return eur
  return eur * FOREIGN_RATES[currency]
}

function fmtForeign(value: number, currency: Exclude<Currency, 'LEK'>): string {
  const symbol = CURRENCY_SYMBOLS[currency]
  return `~${symbol}${value < 1 ? value.toFixed(2) : Math.round(value).toLocaleString('sq-AL')}`
}

// Primary money display — respects the user's selected display currency.
// Kept as `fmtLEK` (not renamed) so every existing call site automatically
// follows the selected currency without needing to change.
export function fmtLEK(amount: number): string {
  if (DISPLAY_CURRENCY === 'LEK') return `${Math.round(amount).toLocaleString('sq-AL')} LEK`
  return fmtForeign(convertFromLek(amount, DISPLAY_CURRENCY), DISPLAY_CURRENCY)
}

// Secondary/reference display, used everywhere a smaller line shows "the
// other" currency under the primary fmtLEK amount (DualPrice, StatCard
// descriptions, etc). Shows EUR when LEK is the active display currency
// (unchanged pre-existing behavior) — shows LEK, the clinic's real ledger
// currency, as the reference line whenever a foreign currency is active.
export function fmtEUR(amount: number): string {
  if (DISPLAY_CURRENCY === 'LEK') return fmtForeign(lekToEur(amount), 'EUR')
  return `~${Math.round(amount).toLocaleString('sq-AL')} LEK`
}
