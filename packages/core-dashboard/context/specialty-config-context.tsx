"use client"

// React-side delivery mechanism for DashboardSpecialtyConfig (see
// ../lib/specialty-config.ts) — a plain Context instead of a module-level
// singleton (core-api's approach) because this runs in the browser across
// many concurrent component trees, not one Node process with one boot
// moment. Each app's root layout renders <SpecialtyConfigProvider> once, at
// the top; every core-dashboard component reads it via useSpecialtyConfig().
//
// Deliberately NOT a `config` prop threaded down from the (Server Component)
// root layout: some specialties' configs carry real function values
// (Dental's entityDeleteHandlers[].deleteFn) or component references
// (Dermatology's settingsExtraSection.Component), and React Server
// Components can only serialize plain data across a Server->Client prop
// boundary — a bare function (not a "use client" component reference) fails
// that serialization at build time ("Functions cannot be passed directly to
// Client Components"). Importing it here instead, from within this file's
// own "use client" module, never crosses that boundary at all — this file
// is bundled straight into the client, so `@/lib/specialty.config` resolves
// to whichever app is consuming @hypocrates/core-dashboard (same mechanism
// as lib/api-client.ts's `@/lib/demo/fixtures` import; see that file's own
// comment) and the values just live in the browser bundle like any other
// client-side import.
import { createContext, useContext, type ReactNode } from 'react'
import type { DashboardSpecialtyConfig } from '../lib/specialty-config'
import { specialtyConfig as config } from '@/lib/specialty.config'
import { setTreatmentTypes } from '../lib/constants'

const SpecialtyConfigContext = createContext<DashboardSpecialtyConfig | null>(null)

export function SpecialtyConfigProvider({ children }: { children: ReactNode }) {
  // Populates lib/constants.ts's mutable treatmentTypes array — see that
  // file's own comment for why this runs here, synchronously during render,
  // rather than as a one-time boot step: this provider (and this call)
  // executes once server-side per request AND again during client
  // hydration, two separate JS runtimes each with their own copy of that
  // module, both of which need it populated before any generic component
  // reads it.
  setTreatmentTypes(config.treatmentTypes)

  return (
    <SpecialtyConfigContext.Provider value={config}>
      {children}
    </SpecialtyConfigContext.Provider>
  )
}

export function useSpecialtyConfig(): DashboardSpecialtyConfig {
  const config = useContext(SpecialtyConfigContext)
  if (!config) {
    throw new Error('useSpecialtyConfig() called outside <SpecialtyConfigProvider> — check the consuming app\'s root layout.tsx')
  }
  return config
}
