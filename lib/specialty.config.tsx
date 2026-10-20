// Dental's parameters for @hypocrates/core-dashboard's generic extension
// points. See packages/core-dashboard/lib/specialty-config.ts for what each
// key does — this file only needs to declare what Dental adds/overrides.
// .tsx extension (not .ts) because entityDeleteHandlers/settingsExtraSection
// reference real component/function values, not just plain data.
import type { DashboardSpecialtyConfig } from '@core/lib/specialty-config'
import { deleteImplantPlan } from './api/implant-plans'
import { deleteCosmeticPlan } from './api/cosmetic-plans'
import { deletePeriodontalRecord } from './api/periodontal'

// Patient-detail and document-list/upload are full per-app overrides for
// Dental (not shared shell+slots) — see components/patient/patient-card.tsx
// and document-list.tsx's own comments for why: Dental's DICOM/CBCT imaging
// and odontogram chart are substantial, Cornerstone3D-dependent complexity
// no other specialty needs, more honestly modeled as "this fork owns its
// own version of this page" than forced into a generic slot.
export const specialtyConfig: DashboardSpecialtyConfig = {
  brandName: 'Hypocrates Dental',
  brandDescriptionSq: 'Platformë moderne për menaxhimin e klinikave dentare',
  brandDescriptionEn: 'Modern platform for managing dental clinics',
  sidebarIconName: 'dentistry',

  navExtras: {
    admin: [],
    doktor: [
      { labelKey: 'implantology', href: '/doktor/implantologji', icon: 'implant' },
      { labelKey: 'cosmetics',    href: '/doktor/kozmetike',     icon: 'auto_awesome' },
    ],
  },

  settingsExtraSection: undefined,

  documentConfig: {
    categories: ['general', 'id_card', 'insurance_card', 'xray'],
    imageSubtypes: ['panoramike', 'periapikale', 'cbct', 'tjeter'],
    batchCategory: 'xray',
  },

  patientExtraFields: [],
  featureFlags: {},

  tourExtraSteps: {
    admin: [
      { id: 'orthodontics', key: 'orthodontics', target: '[data-tour="page-header"]', route: '/admin/progresi' },
    ],
    doktor: [
      { id: 'orthodontics', key: 'orthodontics', target: '[data-tour="page-header"]', route: '/doktor/progresi' },
      { id: 'implantology', key: 'implantology', target: '[data-tour="page-header"]', route: '/doktor/implantologji' },
      { id: 'cosmetics',    key: 'cosmetics',    target: '[data-tour="page-header"]', route: '/doktor/kozmetike' },
    ],
  },

  treatmentTypes: [
    'Kontroll',
    'Pastrim profesional',
    'Mbushje kompozite',
    'Mbushje amalgam',
    'Nxjerrje dhëmbi',
    'Trajtim i kanalit',
    'Kurorë dentare',
    'Urë dentare',
    'Protezë',
    'Implant dentar',
    'Kirurgji orale',
    'Zbardhim',
    'Ortodonci',
    'Radiografi panoramike',
    'Radiografi periapikale',
  ],

  entityDeleteHandlers: [
    { entityType: 'implant_plan',       labelKey: 'entityLabel.implantPlan',     deleteFn: deleteImplantPlan },
    { entityType: 'cosmetic_plan',      labelKey: 'entityLabel.cosmeticPlan',    deleteFn: deleteCosmeticPlan },
    { entityType: 'periodontal_record', labelKey: 'entityLabel.periodontalRecord', deleteFn: deletePeriodontalRecord },
  ],
}
