// The Dashboard-side counterpart to @hypocrates/core-api's
// src/config/specialty.js — same idea, different runtime (this one is read
// directly by React components/pages at render time via each app's own
// specialty.config.ts import, not a boot-time singleton, since Next.js has
// no single shared "server process" moment equivalent to Express's
// createApp()). A new specialty fills in this shape once; every generic
// page/component in this package reads from it instead of hardcoding a
// fork's values.
import type { ComponentType } from 'react'

export interface NavExtraItem {
  labelKey: string
  href: string
  icon: string
}

export interface SettingsExtraSection {
  /** Also the lookup key into admin-sistemi.json's sections.<key>.label/subtitle. */
  key: string
  icon: string
  Component: ComponentType
}

export interface PatientExtraField {
  /** Key the field is read/written under in the Patient API shape (camelCase). */
  jsonKey: string
  /** Translation key for the field's label in forms/detail views. */
  labelKey: string
  /** 'text' | 'number' — matches core-api's column type closely enough for a plain input. */
  inputType: 'text' | 'number'
}

export interface DocumentCategoryConfig {
  /** Must match core-api's specialty.config.js documentCategories exactly. */
  categories: string[]
  imageSubtypes: string[]
  batchCategory: string
}

export interface DashboardSpecialtyConfig {
  brandName: string
  brandDescriptionSq: string
  brandDescriptionEn: string
  /** Collapsed-sidebar fallback glyph — verified present in the self-hosted Material Symbols font. */
  sidebarIconName: string

  navExtras: {
    admin: NavExtraItem[]
    doktor: NavExtraItem[]
  }

  settingsExtraSection?: SettingsExtraSection
  documentConfig: DocumentCategoryConfig
  patientExtraFields: PatientExtraField[]
  /** Same keys/defaults as core-api's specialty.config.js featureFlags. */
  featureFlags: Record<string, boolean>

  /** Extra guided-tour steps, spliced in after the generic steps for that role. */
  tourExtraSteps: {
    admin: { id: string; key: string; target: string; route: string }[]
    doktor: { id: string; key: string; target: string; route: string }[]
  }

  /** Free-text treatment-type suggestions (see lib/constants.ts) — genuinely
   *  specialty-flavored content, not structural, but declared here so every
   *  app supplies it the same config-driven way as everything else. */
  treatmentTypes: string[]

  /** AssistantWidget's delete-confirmation map for this specialty's own
   *  entity types (e.g. Dental's implant_plan/cosmetic_plan/
   *  periodontal_record) — merged with the generic entries already built
   *  into core-dashboard. Empty for a specialty with no extra AI-deletable
   *  entities of its own. */
  entityDeleteHandlers: {
    entityType: string
    labelKey: string
    deleteFn: (id: string) => Promise<unknown>
  }[]
}
