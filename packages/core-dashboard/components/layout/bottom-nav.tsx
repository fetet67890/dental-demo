"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSidebar } from '@core/context/sidebar-context'
import { useAuth } from '@core/context/auth-context'
import { cn } from '@core/lib/utils'

interface NavItem {
  label: string
  href: string
  icon: string
}

// Profili is a direct tab now, not buried at the bottom of the "Menuja"
// sheet — that was the actual complaint (reachable, technically, but two
// taps plus a scroll instead of one direct tap like everything else here).
const adminItems: NavItem[] = [
  { label: 'Kryesore',  href: '/admin',            icon: 'dashboard'      },
  { label: 'Pacientët', href: '/admin/pacientet',  icon: 'group'          },
  { label: 'Takimet',   href: '/admin/takimet',    icon: 'calendar_month' },
  { label: 'Faturat',   href: '/admin/financa?tab=faturat', icon: 'receipt' },
  { label: 'Profili',   href: '/admin/profili',    icon: 'account_circle' },
]

const receptionItems: NavItem[] = [
  { label: 'Kryesore',  href: '/recepsion',            icon: 'dashboard'      },
  { label: 'Pacientët', href: '/recepsion/pacientet',  icon: 'group'          },
  { label: 'Takimet',   href: '/recepsion/takimet',    icon: 'calendar_month' },
  { label: 'Faturat',   href: '/recepsion/faturat',    icon: 'receipt'        },
  { label: 'Profili',   href: '/recepsion/profili',    icon: 'account_circle' },
]

const doctorItems: NavItem[] = [
  { label: 'Kryesore',   href: '/doktor',            icon: 'dashboard'   },
  { label: 'Takimet',    href: '/doktor/takimet',    icon: 'event_note'  },
  { label: 'Pacientët',  href: '/doktor/pacientet',  icon: 'group'       },
  { label: 'Trajtimet',  href: '/doktor/trajtimet',  icon: 'stethoscope' },
  { label: 'Profili',    href: '/doktor/profili',    icon: 'account_circle' },
]

export function BottomNav() {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const { mobileOpen, toggleMobile } = useSidebar()

  const items =
    user?.role === 'admin'     ? adminItems :
    user?.role === 'recepsion' ? receptionItems :
    user?.role === 'mjek'      ? doctorItems :
    []

  if (!items.length) return null

  const isActive = (href: string) => {
    const path = href.split('?')[0]
    if (pathname === path) return true
    const dashboards = ['/admin', '/recepsion', '/doktor']
    if (dashboards.includes(path)) return false
    return pathname.startsWith(path)
  }

  return (
    <nav className="sm:hidden fixed bottom-0 inset-x-0 z-50 bg-sidebar border-t border-sidebar-border/30 flex h-16 safe-area-inset-bottom">
      {items.map((item) => {
        const active = isActive(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90',
              active ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'
            )}
          >
            <span
              className="material-symbols-outlined leading-none select-none"
              style={{
                fontSize: 23,
                fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
              }}
            >
              {item.icon}
            </span>
            <span className="text-[10px] font-medium leading-none">{item.label}</span>
          </Link>
        )
      })}

      {/* More / Menu */}
      <button
        onClick={toggleMobile}
        className={cn(
          'flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-90',
          mobileOpen ? 'text-sidebar-primary' : 'text-sidebar-foreground/50'
        )}
      >
        <span
          className="material-symbols-outlined leading-none select-none"
          style={{ fontSize: 23 }}
        >
          {mobileOpen ? 'close' : 'grid_view'}
        </span>
        <span className="text-[10px] font-medium leading-none">{mobileOpen ? 'Mbyll' : 'Menuja'}</span>
      </button>
    </nav>
  )
}
