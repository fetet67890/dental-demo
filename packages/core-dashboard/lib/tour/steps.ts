import type { TourStep, TourRole } from './types'

// Full per-page tour, per direct follow-up request ("is it possible to also
// explain every page" → yes, go comprehensive). Every real, reachable route
// each role has gets its own stop — most target a `route` the step
// navigates to first (see wait-for-element.ts), landing on either a
// page-specific action button (`action-add-patient`, etc. — added directly
// to that button in its own page file) or the generic `page-header` anchor
// (added once, centrally, to Topbar's title block — safe as a single shared
// selector since only one page's Topbar is ever mounted at a time; a
// handful of pages that render their own local heading instead of using
// Topbar's title prop carry the same attribute directly on that heading,
// e.g. doktor/takimet/page.tsx).
//
// (`/admin/raportet` and `/{admin,recepsion}/kerkesa-takimesh` were found
// orphaned — real files, zero incoming links anywhere in the app — while
// mapping every real page for this tour, and have since been deleted
// outright rather than left as dead code; see Hypocrates-Todo.md.)
//
// Every step with a `target` is genuinely clickable through the overlay —
// TourOverlay doesn't block the page underneath, so clicking the real button/
// link it's pointing at both does the real thing (opens the add-patient
// dialog, navigates to the real page, ...) and auto-advances the tour, same
// as clicking Next. That's deliberate: a nav link's real destination is
// always the same page that link's own step would route to anyway, and an
// action button's dialog opening is exactly what "explaining this page"
// should lead to trying, not just describing.
//
// `key` resolves into messages/<locale>/tour.json as `${role}.${key}.title` /
// `.body`. Steps with no `target` render as a centered welcome card.
// Desktop/tablet only (sm+) — see TourOverlay's own comment for why.
//
// Every role's list ends on a `goodbye` step (no target, same centered-card
// treatment as `welcome`) — reaching it via the real Finish button (not
// Skip) is what tour-context.tsx's end() reads as "actually completed the
// tour," which is what triggers the redirect back to the role's dashboard
// home. Skipping early never redirects — someone dismissing the tour
// mid-page likely wants to keep doing whatever they were doing there.
//
// A specialty's own extra steps (e.g. Dental's implantologji/kozmetike) are
// NOT hardcoded here — buildTourSteps() below splices in whatever
// useSpecialtyConfig().tourExtraSteps declares, at the same position every
// specialty's own equivalent used to occupy (right after "followups"), so
// this file never needs a case added for a new specialty. Mirrors
// nav-items.ts's buildAdminNavItems/buildDoctorNavItems split point exactly.

const BASE_ADMIN_STEPS: TourStep[] = [
  { id: 'welcome', key: 'welcome' },
  { id: 'dashboard', key: 'dashboard', target: '[data-tour="nav-dashboard"]' },
  { id: 'patients', key: 'patients', target: '[data-tour="action-add-patient"]', route: '/admin/pacientet' },
  { id: 'appointments', key: 'appointments', target: '[data-tour="page-header"]', route: '/admin/takimet' },
  { id: 'followups', key: 'followups', target: '[data-tour="page-header"]', route: '/admin/kontrollet-pas-operative' },
]
const BASE_ADMIN_STEPS_TAIL: TourStep[] = [
  { id: 'finance', key: 'finance', target: '[data-tour="page-header"]', route: '/admin/financa' },
  { id: 'inventory', key: 'inventory', target: '[data-tour="page-header"]', route: '/admin/inventari' },
  { id: 'staff', key: 'staff', target: '[data-tour="action-add-staff"]', route: '/admin/stafi' },
  { id: 'documents', key: 'documents', target: '[data-tour="page-header"]', route: '/admin/dokumenta' },
  { id: 'reminders', key: 'reminders', target: '[data-tour="page-header"]', route: '/admin/rikujtesat' },
  { id: 'website', key: 'website', target: '[data-tour="page-header"]', route: '/admin/uebsajti' },
  { id: 'sistemi', key: 'sistemi', target: '[data-tour="page-header"]', route: '/admin/profili?section=sistemi' },
  { id: 'konfigurimi', key: 'konfigurimi', target: '[data-tour="page-header"]', route: '/admin/profili?section=konfigurimi' },
  { id: 'quickActions', key: 'quickActions', target: '[data-tour="quick-actions"]' },
  { id: 'assistant', key: 'assistant', target: '[data-tour="assistant-widget"]' },
  { id: 'profile', key: 'profile', target: '[data-tour="profile-link"]' },
  { id: 'goodbye', key: 'goodbye' },
]

const BASE_DOKTOR_STEPS: TourStep[] = [
  { id: 'welcome', key: 'welcome' },
  { id: 'dashboard', key: 'dashboard', target: '[data-tour="nav-dashboard"]' },
  { id: 'calendarMine', key: 'calendarMine', target: '[data-tour="nav-calendarMine"]' },
  { id: 'appointments', key: 'appointments', target: '[data-tour="page-header"]', route: '/doktor/takimet' },
  { id: 'patients', key: 'patients', target: '[data-tour="action-add-patient"]', route: '/doktor/pacientet' },
  { id: 'treatments', key: 'treatments', target: '[data-tour="action-add-treatment"]', route: '/doktor/trajtimet' },
  { id: 'prescriptions', key: 'prescriptions', target: '[data-tour="action-add-prescription"]', route: '/doktor/recetat' },
  { id: 'followups', key: 'followups', target: '[data-tour="page-header"]', route: '/doktor/kontrollet-pas-operative' },
]
const BASE_DOKTOR_STEPS_TAIL: TourStep[] = [
  { id: 'quickActions', key: 'quickActions', target: '[data-tour="quick-actions"]' },
  { id: 'profile', key: 'profile', target: '[data-tour="profile-link"]' },
  { id: 'goodbye', key: 'goodbye' },
]

const recepsionSteps: TourStep[] = [
  { id: 'welcome', key: 'welcome' },
  { id: 'dashboard', key: 'dashboard', target: '[data-tour="nav-dashboard"]' },
  { id: 'queue', key: 'queue', target: '[data-tour="nav-queue"]' },
  { id: 'waitlist', key: 'waitlist', target: '[data-tour="page-header"]', route: '/recepsion/lista-pritjes' },
  { id: 'patients', key: 'patients', target: '[data-tour="action-add-patient"]', route: '/recepsion/pacientet' },
  { id: 'appointments', key: 'appointments', target: '[data-tour="page-header"]', route: '/recepsion/takimet' },
  { id: 'calendar', key: 'calendar', target: '[data-tour="page-header"]', route: '/recepsion/kalendari' },
  { id: 'followups', key: 'followups', target: '[data-tour="page-header"]', route: '/recepsion/kontrollet-pas-operative' },
  { id: 'cashRegister', key: 'cashRegister', target: '[data-tour="page-header"]', route: '/recepsion/arka' },
  { id: 'invoices', key: 'invoices', target: '[data-tour="page-header"]', route: '/recepsion/faturat' },
  { id: 'inquiries', key: 'inquiries', target: '[data-tour="page-header"]', route: '/recepsion/kerkesa-faqja' },
  { id: 'documents', key: 'documents', target: '[data-tour="page-header"]', route: '/recepsion/dokumenta' },
  { id: 'archive', key: 'archive', target: '[data-tour="page-header"]', route: '/recepsion/arkiva' },
  { id: 'quickActions', key: 'quickActions', target: '[data-tour="quick-actions"]' },
  { id: 'profile', key: 'profile', target: '[data-tour="profile-link"]' },
  { id: 'goodbye', key: 'goodbye' },
]

export function buildTourSteps(extras: { admin: TourStep[]; doktor: TourStep[] }): Record<TourRole, TourStep[]> {
  return {
    admin: [...BASE_ADMIN_STEPS, ...extras.admin, ...BASE_ADMIN_STEPS_TAIL],
    mjek: [...BASE_DOKTOR_STEPS, ...extras.doktor, ...BASE_DOKTOR_STEPS_TAIL],
    recepsion: recepsionSteps,
  }
}
