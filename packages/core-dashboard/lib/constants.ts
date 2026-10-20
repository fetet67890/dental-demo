// Stable value keys (not display text) — unlike treatmentTypes below, this is
// a generic UI classification, not clinical free text, so it gets proper
// i18n treatment. Labels live in messages/{locale}/referral-sources.json,
// shared by every component that needs the list (both add-patient dialogs,
// the patient info display) via useTranslations('referral-sources').
export const referralSources = [
  'google', 'social_media', 'friend_family', 'doctor_referral', 'walk_in', 'website', 'other',
] as const
export type ReferralSource = typeof referralSources[number]

// Free-text treatment-type suggestions — genuinely specialty-flavored
// content (see specialty.config.tsx's own treatmentTypes), not a fixed
// value set worth real i18n treatment like referralSources above. Exported
// as a stable array REFERENCE (never reassigned, only mutated in place via
// setTreatmentTypes) so existing `import { treatmentTypes }` call sites in
// every generic component keep working unchanged — only its *contents*
// change, populated once by SpecialtyConfigProvider on both the server
// render and the client hydration pass (two separate JS runtimes, so it
// has to run in both, not just once at "boot" the way the API's config
// singleton does).
export const treatmentTypes: string[] = []

export function setTreatmentTypes(types: string[]) {
  if (treatmentTypes.length === types.length && treatmentTypes.every((t, i) => t === types[i])) return
  treatmentTypes.length = 0
  treatmentTypes.push(...types)
}
