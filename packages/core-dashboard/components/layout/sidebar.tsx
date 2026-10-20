"use client"

import { useRef, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { cn } from '@core/lib/utils'
import { useAuth } from '@core/context/auth-context'
import { useSidebar } from '@core/context/sidebar-context'
import { useData } from '@core/context/data-context'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { type NavItem, buildAdminNavItems, receptionNavItems, buildDoctorNavItems } from '@core/lib/nav-items'
import { useSpecialtyConfig } from '../../context/specialty-config-context'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

function NavLink({ item, active, onClick, collapsed = false }: {
  item: NavItem & { label: string }
  active: boolean
  onClick: () => void
  collapsed?: boolean
}) {
  return (
    <Link
      href={item.href}
      onClick={onClick}
      title={collapsed ? item.label : undefined}
      // Desktop-only tour anchor (see components/tour/tour-overlay.tsx) — the
      // separate mobile bottom-sheet nav below intentionally doesn't get one,
      // it'd just be a second, hidden `[data-tour]` match on the same page.
      data-tour={`nav-${item.labelKey}`}
      className={cn(
        'flex items-center gap-3 px-3 py-3 sm:py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
        collapsed && 'justify-center',
        active
          ? 'bg-gradient-to-r from-sidebar-primary to-sidebar-primary/80 text-sidebar-primary-foreground shadow-md shadow-sidebar-primary/20'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/80 hover:text-sidebar-foreground'
      )}
    >
      <span
        className="material-symbols-outlined select-none leading-none shrink-0"
        style={{
          fontSize: 20,
          fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
        }}
      >
        {item.icon}
      </span>
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  )
}

export function Sidebar() {
  const pathname = usePathname()
  const { user }  = useAuth()
  const { staff } = useData()
  const { collapsed, mobileOpen, setMobileOpen } = useSidebar()
  const t = useTranslations('sidebar')
  const tCommon = useTranslations('common')

  const { logoUrl, sidebarIconUrl } = useClinicSettings()
  const { navExtras, sidebarIconName } = useSpecialtyConfig()
  const staffRecord = user ? staff.find(s => s.email === user.email) : undefined
  const canAddStaff = staffRecord?.canAddStaff === true || user?.canAddStaff === true

  const roleLabel = (role?: string) =>
    role === 'admin' || role === 'mjek' || role === 'recepsion' ? t(`roles.${role}`) : role

  const navItems = (() => {
    const base = (() => {
      switch (user?.role) {
        case 'admin':     return buildAdminNavItems(navExtras.admin)
        case 'recepsion': return receptionNavItems
        case 'mjek':      return buildDoctorNavItems(navExtras.doktor)
        default:          return []
      }
    })()
    const withAddMember = canAddStaff && user?.role !== 'admin'
      ? [...base, { labelKey: 'addMember', href: `${user?.role === 'mjek' ? '/doktor' : '/recepsion'}/shto-staf`, icon: 'person_add' }]
      : base
    return withAddMember.map((item) => ({ ...item, label: t(`nav.${item.labelKey}`) }))
  })()

  const isActive = (href: string) =>
    pathname === href ||
    (href !== '/admin' && href !== '/recepsion' && href !== '/doktor' && pathname.startsWith(href))

  const profileHref = user?.role === 'mjek'
    ? '/doktor/profili'
    : user?.role === 'recepsion'
      ? '/recepsion/profili'
      : '/admin/profili'

  const close = () => setMobileOpen(false)

  // ── Swipe-to-close gesture ────────────────────────────────────────────────
  const dragStartY = useRef(0)
  const [dragY, setDragY]         = useState(0)
  const [isDragging, setIsDragging] = useState(false)

  const onDragStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    setIsDragging(true)
  }
  const onDragMove = (e: React.TouchEvent) => {
    const dy = e.touches[0].clientY - dragStartY.current
    if (dy > 0) setDragY(dy)
  }
  const onDragEnd = () => {
    if (dragY > 80) close()
    setIsDragging(false)
    setDragY(0)
  }

  return (
    <>
      {/* ── Overlay — sits above bottom nav (z-[55]) ──────────────────────── */}
      <div
        className={cn(
          'lg:hidden fixed inset-0 z-[55] bg-black/50 transition-opacity duration-300',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        )}
        onClick={close}
      />

      {/* ── MOBILE: bottom sheet — above overlay and bottom nav (z-[60]) ──── */}
      <div
        data-slot="sidebar"
        className="sm:hidden fixed bottom-0 inset-x-0 z-[60] bg-sidebar rounded-t-3xl shadow-2xl flex flex-col"
        style={{
          maxHeight: '88dvh',
          transform: mobileOpen ? `translateY(${dragY}px)` : 'translateY(100%)',
          transition: isDragging ? 'none' : 'transform 300ms ease-out',
        }}
      >
        {/* Drag handle — touch area for swipe-to-close */}
        <div
          className="flex justify-center pt-3 pb-3 shrink-0 cursor-grab active:cursor-grabbing"
          onTouchStart={onDragStart}
          onTouchMove={onDragMove}
          onTouchEnd={onDragEnd}
        >
          <div className="w-10 h-1 rounded-full bg-sidebar-foreground/20" />
        </div>

        {/* User header — the mobile equivalent of the desktop sidebar's own
            bottom-pinned profile link (see the `<aside>` block below). Used
            to be a plain non-clickable `<div>` here — the mobile bottom
            sheet had no way to reach Profili at all, on either dashboard.
            Drag-to-close stays on the handle bar above (its own dedicated
            touch handlers) — not duplicated here, so a tap unambiguously
            navigates instead of racing a drag gesture. */}
        <div className="px-5 pb-4 border-b border-sidebar-border/30 shrink-0">
          <div className="flex items-center gap-3">
            <Link
              href={profileHref}
              onClick={close}
              data-tour="profile-link-mobile"
              className="flex items-center gap-3 min-w-0 flex-1 -m-1 p-1 rounded-xl active:bg-sidebar-accent/60 transition-colors"
            >
              <div className="w-11 h-11 rounded-2xl overflow-hidden bg-sidebar-primary flex items-center justify-center text-white font-bold text-lg shrink-0">
                {user?.avatar ? (
                  // bg-muted, not bg-sidebar-primary: that token is near-white in
                  // dark mode (by design, for the letter-fallback's contrast) —
                  // used on the image itself it painted a bright white square
                  // behind any transparent PNG. bg-muted is a real neutral gray
                  // in both modes, so a transparent avatar never flashes white.
                  <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`} alt={user.name || ''} className="w-full h-full object-cover bg-muted" />
                ) : (
                  user?.name?.charAt(0) || 'U'
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sidebar-foreground font-semibold text-sm truncate">{user?.name}</p>
                <p className="text-sidebar-foreground/50 text-xs">{roleLabel(user?.role)}</p>
              </div>
              <span className="material-symbols-outlined text-sidebar-foreground/40 select-none shrink-0" style={{ fontSize: 18 }}>
                chevron_right
              </span>
            </Link>
            {/* Close button */}
            <button
              onClick={close}
              className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center text-sidebar-foreground/50 hover:bg-sidebar-accent/60 transition-colors shrink-0"
              aria-label={tCommon('close')}
            >
              <span className="material-symbols-outlined select-none" style={{ fontSize: 20 }}>close</span>
            </button>
          </div>
        </div>

        {/* Nav items — scrollable, pb-24 clears the bottom nav bar */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 pb-24">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={close}
              className={cn(
                'flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-medium transition-all duration-150 active:scale-[0.98]',
                isActive(item.href)
                  ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-sm'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/70 hover:text-sidebar-foreground'
              )}
            >
              <span
                className="material-symbols-outlined select-none leading-none shrink-0"
                style={{
                  fontSize: 22,
                  fontVariationSettings: isActive(item.href) ? "'FILL' 1" : "'FILL' 0",
                }}
              >
                {item.icon}
              </span>
              <span>{item.label}</span>
              {isActive(item.href) && (
                <span className="ml-auto material-symbols-outlined text-sidebar-primary-foreground/60 select-none" style={{ fontSize: 16 }}>
                  chevron_right
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── TABLET + DESKTOP: left sidebar (≥ 640px) ──────────────────────── */}
      <aside
        data-slot="sidebar"
        className={cn(
          // Below lg: fixed to the viewport (inset-y-0 pins full height) so it
          // never scrolls with the page. At lg+ it used to be `static`, which
          // let it scroll away with the outer page flow on tall pages, taking
          // the profile footer out of view — `sticky` + an explicit `h-screen`
          // keeps it pinned to the viewport at every breakpoint instead.
          'hidden sm:flex fixed lg:sticky inset-y-0 lg:h-screen left-0 z-[60] bg-sidebar flex-col transition-all duration-300 shadow-xl lg:shadow-none',
          collapsed ? 'w-[64px]' : 'w-64',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
      >
        {/* Logo */}
        <div className={cn(
          'border-b border-sidebar-border/50 flex items-center',
          collapsed ? 'p-4 justify-center' : 'p-6'
        )}>
          {collapsed ? (
            sidebarIconUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={sidebarIconUrl}
                alt="Logo"
                className="h-8 w-8 object-contain"
              />
            ) : (
              <span className="material-symbols-outlined text-sidebar-primary select-none" style={{ fontSize: 28 }}>
                {sidebarIconName}
              </span>
            )
          ) : logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logoUrl}
              alt="Logo"
              className="h-10 w-auto max-w-[160px] object-contain"
            />
          ) : (
            // Fallback for a fresh clinic that hasn't uploaded a logo yet
            // (logoUrl null — a brand-new install's clinic_settings has no
            // logo_url row at all). `/logo.png` is the square navy-icon
            // brand mark, not a wordmark — `brightness-0 invert` used to
            // crush BOTH its navy background and white glyph to a single
            // flat white square (invert can't recover contrast a
            // brightness(0) pass already destroyed), which is exactly the
            // "blank white square" this fallback was rendering. Showing it
            // in its real colors instead — same no-filter treatment the
            // logoUrl branch above already uses — actually reads as a logo.
            <Image
              src="/logo.png"
              alt="Hypocrates"
              width={40}
              height={40}
              className="h-10 w-10 object-contain rounded-lg"
              priority
            />
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto overflow-x-hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              onClick={close}
              collapsed={collapsed}
            />
          ))}
        </nav>

        {/* Profile — pinned to the bottom, replaces the old navbar profile menu */}
        <Link
          href={profileHref}
          title={collapsed ? user?.name : undefined}
          data-tour="profile-link"
          className={cn(
            'flex items-center gap-3 border-t border-sidebar-border/50 shrink-0 transition-colors hover:bg-sidebar-accent/60',
            collapsed ? 'p-4 justify-center' : 'p-4'
          )}
        >
          <div className="w-9 h-9 rounded-xl overflow-hidden bg-sidebar-primary flex items-center justify-center text-sidebar-primary-foreground font-bold text-sm shrink-0">
            {user?.avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`} alt={user.name || ''} className="w-full h-full object-cover bg-muted" />
            ) : (
              user?.name?.charAt(0) || 'U'
            )}
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-sidebar-foreground text-sm font-semibold truncate">{user?.name}</p>
              <p className="text-sidebar-foreground/50 text-xs truncate">{roleLabel(user?.role)}</p>
            </div>
          )}
        </Link>
      </aside>
    </>
  )
}
