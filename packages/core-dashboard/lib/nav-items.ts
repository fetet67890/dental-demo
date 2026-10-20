// Per-role sidebar nav items — the single source of truth for both Sidebar
// itself and Topbar's search (which now also matches page names, see
// topbar.tsx's `pageResults`). Extracted here specifically so the two never
// drift apart the way two independently-typed href lists eventually would.
// `labelKey` resolves into messages/<locale>/sidebar.json as `nav.${labelKey}`.
//
// A specialty's own extra nav items (e.g. Dental's implantologji/kozmetike)
// are NOT hardcoded here — buildNavItems() below splices in whatever
// useSpecialtyConfig().navExtras declares, at the same position every
// specialty's own equivalent used to occupy (right after "progress"/
// followups), so this file never needs a case added for a new specialty.
import type { NavExtraItem } from './specialty-config'

export interface NavItem {
  labelKey: string
  href: string
  icon: string
}

// Grouped (not just alphabetical/historical-add-order): core clinical
// workflow first, specialty tracking next (all appointment-adjacent),
// business/back-office after, admin-only settings last.
const BASE_ADMIN_NAV_ITEMS: NavItem[] = [
  { labelKey: 'dashboard',    href: '/admin',             icon: 'dashboard'              },
  { labelKey: 'inbox',        href: '/admin/inbox',       icon: 'mail'                   },
  { labelKey: 'patients',     href: '/admin/pacientet',   icon: 'group'                  },
  { labelKey: 'appointments', href: '/admin/takimet',      icon: 'calendar_month'         },
  { labelKey: 'followups',    href: '/admin/kontrollet-pas-operative', icon: 'health_and_safety' },
  { labelKey: 'progress',     href: '/admin/progresi',     icon: 'assignment'            },
]
const BASE_ADMIN_NAV_ITEMS_TAIL: NavItem[] = [
  { labelKey: 'finance',      href: '/admin/financa',      icon: 'account_balance_wallet' },
  { labelKey: 'inventory',    href: '/admin/inventari',    icon: 'inventory'               },
  { labelKey: 'staff',        href: '/admin/stafi',        icon: 'manage_accounts'        },
  { labelKey: 'documents',    href: '/admin/dokumenta',    icon: 'folder_open'            },
  { labelKey: 'reminders',    href: '/admin/rikujtesat',   icon: 'notifications_active'   },
  { labelKey: 'website',      href: '/admin/uebsajti',     icon: 'language'               },
  { labelKey: 'import',       href: '/admin/importo',      icon: 'upload_file'            },
  // 'system' and 'configuration' were separate top-level pages — now
  // sections inside Profili (reachable via the sidebar footer avatar),
  // alongside the profile settings themselves. See admin/profili/page.tsx.
]

export const receptionNavItems: NavItem[] = [
  { labelKey: 'dashboard',    href: '/recepsion',             icon: 'dashboard'              },
  { labelKey: 'queue',        href: '/recepsion/radha',       icon: 'groups'                 },
  { labelKey: 'waitlist',     href: '/recepsion/lista-pritjes', icon: 'playlist_add_check'  },
  { labelKey: 'patients',     href: '/recepsion/pacientet',   icon: 'group'                  },
  { labelKey: 'appointments', href: '/recepsion/takimet',     icon: 'calendar_month'         },
  { labelKey: 'calendar',     href: '/recepsion/kalendari',   icon: 'assignment'             },
  { labelKey: 'followups',    href: '/recepsion/kontrollet-pas-operative', icon: 'health_and_safety' },
  { labelKey: 'cashRegister', href: '/recepsion/arka',        icon: 'account_balance_wallet' },
  { labelKey: 'invoices',     href: '/recepsion/faturat',     icon: 'receipt'                },
  { labelKey: 'inquiries',    href: '/recepsion/kerkesa-faqja', icon: 'travel_explore'        },
  { labelKey: 'documents',    href: '/recepsion/dokumenta',   icon: 'folder_open'            },
  { labelKey: 'archive',      href: '/recepsion/arkiva',      icon: 'inventory_2'            },
]

const BASE_DOCTOR_NAV_ITEMS: NavItem[] = [
  { labelKey: 'dashboard',    href: '/doktor',            icon: 'dashboard'   },
  { labelKey: 'calendarMine', href: '/doktor/kalendari',  icon: 'calendar_month' },
  { labelKey: 'appointments', href: '/doktor/takimet',    icon: 'event_note'  },
  { labelKey: 'patients',     href: '/doktor/pacientet',  icon: 'group'       },
  { labelKey: 'treatments',   href: '/doktor/trajtimet',  icon: 'stethoscope' },
  { labelKey: 'prescriptions', href: '/doktor/recetat',    icon: 'description' },
  { labelKey: 'followups',    href: '/doktor/kontrollet-pas-operative', icon: 'health_and_safety' },
  { labelKey: 'progress',     href: '/doktor/progresi',   icon: 'assignment' },
]

function toNavItem(extra: NavExtraItem): NavItem {
  return { labelKey: extra.labelKey, href: extra.href, icon: extra.icon }
}

export function buildAdminNavItems(extras: NavExtraItem[]): NavItem[] {
  return [...BASE_ADMIN_NAV_ITEMS, ...extras.map(toNavItem), ...BASE_ADMIN_NAV_ITEMS_TAIL]
}

export function buildDoctorNavItems(extras: NavExtraItem[]): NavItem[] {
  return [...BASE_DOCTOR_NAV_ITEMS, ...extras.map(toNavItem)]
}
