"use client"

import { useState, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { useTheme } from 'next-themes'
import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { useData } from '@core/context/data-context'
import { useSidebar } from '@core/context/sidebar-context'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from '@core/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@core/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { cn } from '@core/lib/utils'
import { getExchangeRate } from '@core/lib/api/settings'
import { setExchangeRate } from '@core/lib/currency'
import { RefreshCw, Clock, LogIn, LogOut, TriangleAlert } from 'lucide-react'
import { toast } from 'sonner'
import { useQuickActions } from '@core/context/quick-actions-context'
import { getMyAttendance, clockIn as apiClockIn, clockOut as apiClockOut, type AttendanceRecord } from '@core/lib/api/attendance'
import { usePresence } from '@core/hooks/use-presence'
import { useBlockingModal } from '@core/context/blocking-modal-context'
import { AssistantUsageBadge } from './assistant-usage-badge'
import { WorkModePrompt } from './work-mode-prompt'
import { LiveClock } from './live-clock'
import { buildAdminNavItems, receptionNavItems, buildDoctorNavItems } from '@core/lib/nav-items'
import { useSpecialtyConfig } from '../../context/specialty-config-context'

function Icon({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn('material-symbols-outlined select-none leading-none', className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}

type SearchResult =
  | { kind: 'page';         id: string; label: string; sub: string; href: string }
  | { kind: 'patient';      id: string; label: string; sub: string; href: string }
  | { kind: 'appointment';  id: string; label: string; sub: string; href: string }
  | { kind: 'treatment';    id: string; label: string; sub: string; href: string }
  | { kind: 'prescription'; id: string; label: string; sub: string; href: string }
  | { kind: 'invoice';      id: string; label: string; sub: string; href: string }
  | { kind: 'staffMember';  id: string; label: string; sub: string; href: string }

const kindIcon: Record<SearchResult['kind'], string> = {
  page:         'arrow_forward',
  patient:      'person',
  appointment:  'calendar_month',
  treatment:    'stethoscope',
  prescription: 'description',
  invoice:      'receipt_long',
  staffMember:  'badge',
}

const RATE_AMTS = [1, 10, 50, 100, 200]

// Module-level, not component state — the ambient "how are you working
// today" popup below is meant to nudge once per browser session, not re-fire
// every time this component remounts. Topbar renders per-page (it's not
// persistent layout chrome like Sidebar), so a fresh instance mounts on
// every single navigation; without this guard, leaving today's answer
// pending meant the popup — and the shared `isBlocked` signal it drives, see
// blocking-modal-context.tsx — could resurface on every page visit. That
// silently starved anything else waiting for a clear screen, including the
// guided tour: `start()` would navigate + flip `active` true, then this
// popup reopened a moment later and the tour suppressed itself behind it
// with no way to ever get a clean window again this session.
let ambientWorkModePromptShownThisSession = false

export function Topbar({ title }: { title?: string } = {}) {
  const t = useTranslations('topbar')
  const tSidebar = useTranslations('sidebar')
  const tSistemi = useTranslations('admin-sistemi')
  const tKonfig = useTranslations('admin-konfigurimi')
  const tUebsajti = useTranslations('admin-uebsajti')
  const kindLabel: Record<SearchResult['kind'], string> = {
    page:         t('resultKind.page'),
    patient:      t('resultKind.patient'),
    appointment:  t('resultKind.appointment'),
    treatment:    t('resultKind.treatment'),
    prescription: t('resultKind.prescription'),
    invoice:      t('resultKind.invoice'),
    staffMember:  t('resultKind.staffMember'),
  }
  const { theme, setTheme } = useTheme()
  const { user } = useAuth()
  const { appNotifications, unreadCount, markAllNotificationsRead, markNotificationRead,
          patients, appointments, treatments, prescriptions, invoices, staff } = useData()
  const { collapsed, toggle, mobileOpen, toggleMobile } = useSidebar()
  const { openDialog } = useQuickActions()
  const { openTime } = useClinicSettings()
  const { isBlocked, setBlocked } = useBlockingModal()

  const [query, setQuery]           = useState('')
  const [open, setOpen]             = useState(false)
  const [rate, setRate]             = useState<number | null>(null)
  const [rateLoading, setRateLoading] = useState(false)
  const [rateCached, setRateCached]   = useState(false)
  const [rateFallback, setRateFallback] = useState(false)

  const [attendance, setAttendance]     = useState<AttendanceRecord | null>(null)
  const [attendanceLoaded, setAttendanceLoaded] = useState(false)
  const [attendanceBusy, setAttendanceBusy] = useState(false)
  const [workModePromptOpen, setWorkModePromptOpen] = useState(false)
  // True when the prompt was opened by an explicit "Check-in" click rather
  // than the ambient ("clinic just opened") popup — see handleAttendanceToggle.
  const [checkInIntent, setCheckInIntent] = useState(false)

  // The shared blocking-modal signal (see blocking-modal-context.tsx) is set
  // directly at each place workModePromptOpen itself changes below — NOT via
  // a `useEffect(() => setBlocked(workModePromptOpen), [workModePromptOpen])`
  // watching it, which is what this used to be. That derived-effect shape
  // has a real one-render-cycle gap: the dialog's own `open` state (and
  // whatever renders from it) commits in one render, and only the *next*
  // render — once React gets around to running the effect — actually
  // propagates isBlocked. Anything else deciding whether to open in that
  // exact gap (the setup wizard's own auto-launch, most concretely) can
  // observe isBlocked still false and open right on top of this dialog
  // instead of correctly waiting for it. Setting both in the same
  // synchronous call, at the source, closes that gap — see setActive/
  // setBlocked pairing in setup-wizard-context.tsx for the same fix there.
  // This unmount-only cleanup is still a real safety net: the dialog itself
  // is non-dismissible, but nothing stops the browser back/forward buttons
  // or a bookmark from navigating away (unmounting Topbar) while it's open.
  useEffect(() => {
    return () => setBlocked(false)
  }, [setBlocked])

  useEffect(() => {
    if (!user) return
    getMyAttendance().then((rec) => {
      setAttendance(rec)
      setAttendanceLoaded(true)
    }).catch(() => {})
  }, [user])

  // The work-mode prompt only starts appearing once the clinic has actually
  // opened (per Aparenca's configured hours) — staff checking the dashboard
  // before opening shouldn't get asked yet. Polls every minute so it still
  // pops up mid-session the moment opening time passes, without needing a
  // page reload. Also waits out `isBlocked` (the setup wizard, most likely,
  // on a brand-new admin's very first login) — this used to only be
  // something the tour's own auto-launch deferred to; without this check
  // here too, a first-ever admin login during clinic hours could pop this
  // open right on top of (or underneath, depending on z-index) the setup
  // wizard, the same class of stacked-modal bug fixed elsewhere this session.
  useEffect(() => {
    if (!attendanceLoaded || workModePromptOpen || ambientWorkModePromptShownThisSession || isBlocked) return
    const needsAnswer = !attendance || (!attendance.workMode && !attendance.workModeSkipped)
    if (!needsAnswer) return

    const isPastOpening = () => {
      const [oh, om] = openTime.split(':').map(Number)
      const now = new Date()
      return now.getHours() > oh || (now.getHours() === oh && now.getMinutes() >= om)
    }

    const openAmbient = () => {
      ambientWorkModePromptShownThisSession = true
      setWorkModePromptOpen(true)
      setBlocked(true)
    }

    if (isPastOpening()) {
      // A short, deliberate head start for anything else that might also be
      // about to claim the screen on this same login (the setup wizard,
      // concretely — it has no artificial delay of its own, since it only
      // waits on one already-in-flight fetch). If isBlocked flips true
      // during this window, this effect re-runs on that dependency change,
      // its cleanup cancels this timer, and the guard above bails out with
      // the fresh value — so this can't race past a wizard that claims the
      // screen even a moment after this branch was entered.
      const timer = setTimeout(openAmbient, 300)
      return () => clearTimeout(timer)
    }
    const id = setInterval(() => {
      if (isPastOpening()) {
        openAmbient()
        clearInterval(id)
      }
    }, 60000)
    return () => clearInterval(id)
  }, [attendanceLoaded, attendance, openTime, workModePromptOpen, isBlocked, setBlocked])

  const handleAttendanceToggle = async () => {
    // Checking in without a *real* work mode on file — either never asked,
    // or explicitly skipped earlier — asks again on purpose: skipping isn't
    // meant to be final the way an actual fizik/largesi answer is, and
    // Check-in is a deliberate moment to offer the choice again rather than
    // silently clocking in with no work mode recorded. What used to break
    // here wasn't this re-ask — it's what happened if they picked "skip"
    // again inside it: the backend treated an earlier skip as just as final
    // as a real answer and rejected the repeat with a 409 the dialog had no
    // graceful handling for, trapping the user behind an error with no
    // close button. Fixed at the actual source instead of by skipping this
    // re-ask: the backend (attendance.controller.js's setWorkMode) now only
    // locks once a *real* mode is on file, and work-mode-prompt.tsx recovers
    // gracefully from a 409 either way, so this can safely keep re-asking.
    if (!attendance?.clockIn && !attendance?.workMode) {
      setCheckInIntent(true)
      setWorkModePromptOpen(true)
      setBlocked(true)
      return
    }
    setAttendanceBusy(true)
    try {
      if (!attendance?.clockIn) {
        const rec = await apiClockIn()
        setAttendance(rec)
        toast.success('Check-in u regjistrua')
      } else if (!attendance.clockOut) {
        const rec = await apiClockOut()
        setAttendance(rec)
        toast.success('Check-out u regjistrua')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë regjistrimit')
    } finally {
      setAttendanceBusy(false)
    }
  }

  const loadRate = useCallback(async (force = false) => {
    setRateLoading(true)
    try {
      const data = await getExchangeRate()
      setRate(data.eur_to_lek)
      setRateCached(data.cached)
      setRateFallback(!!data.fallback)
      setExchangeRate(data.eur_to_lek)
      if (force) toast.success('Kursi u përditësua')
    } catch {
      if (force) toast.error('Nuk u arrit të merret kursi')
    } finally {
      setRateLoading(false)
    }
  }, [])

  useEffect(() => {
    if (user?.role === 'admin') loadRate()
  }, [user?.role, loadRate])

  const patientHref = (id: string) => {
    if (user?.role === 'mjek')      return `/doktor/pacientet/${id}`
    if (user?.role === 'recepsion') return `/recepsion/pacientet/${id}`
    return `/admin/pacientet/${id}`
  }

  const appointmentsHref =
    user?.role === 'mjek' ? '/doktor/takimet'
    : user?.role === 'recepsion' ? '/recepsion/takimet'
    : '/admin/takimet'

  // Every real page this role can reach, by translated label — reuses
  // Sidebar's own nav-item list (lib/nav-items.ts) so this can never drift
  // from what's actually in the sidebar, plus a few admin-only sub-pages
  // that live a level deeper (Profili's Sistemi/Konfigurimi tabs, Uebsajti's
  // own tabs) and would otherwise be invisible to search entirely.
  const { navExtras } = useSpecialtyConfig()
  const roleNavItems = user?.role === 'mjek' ? buildDoctorNavItems(navExtras.doktor) : user?.role === 'recepsion' ? receptionNavItems : buildAdminNavItems(navExtras.admin)
  const pageItems: { label: string; href: string }[] = [
    ...roleNavItems.map((item) => ({ label: tSidebar(`nav.${item.labelKey}`), href: item.href })),
    ...(user?.role === 'admin' ? [
      { label: tUebsajti('tabs.postimet.label'),   href: '/admin/uebsajti?tab=postimet' },
      { label: tUebsajti('tabs.deshmite.label'),   href: '/admin/uebsajti?tab=deshmite' },
      { label: tUebsajti('tabs.galeria.label'),    href: '/admin/uebsajti?tab=galeria' },
      { label: tUebsajti('tabs.sajti.label'),      href: '/admin/uebsajti?tab=sajti' },
      { label: tUebsajti('tabs.meta.label'),       href: '/admin/uebsajti?tab=meta' },
      { label: tUebsajti('tabs.kerkesa.label'),    href: '/admin/uebsajti?tab=kerkesa' },
      { label: tUebsajti('tabs.permbajtja.label'), href: '/admin/uebsajti?tab=permbajtja' },
      { label: tSistemi('sections.auditimet.label'), href: '/admin/profili?section=sistemi&sub=auditimet' },
      { label: tSistemi('sections.kursi.label'),     href: '/admin/profili?section=sistemi&sub=kursi' },
      { label: tSistemi('sections.aparenca.label'),  href: '/admin/profili?section=sistemi&sub=aparenca' },
      { label: tSistemi('sections.demo.label'),      href: '/admin/profili?section=sistemi&sub=demo' },
      { label: tKonfig('sections.integrimet.label'), href: '/admin/profili?section=konfigurimi&sub=integrimet' },
      { label: tKonfig('sections.sherbimet.label'),  href: '/admin/profili?section=konfigurimi&sub=sherbimet' },
      { label: tKonfig('sections.paketat.label'),    href: '/admin/profili?section=konfigurimi&sub=paketat' },
      { label: tKonfig('sections.dhomat.label'),     href: '/admin/profili?section=konfigurimi&sub=dhomat' },
      { label: tKonfig('sections.klinikat.label'),   href: '/admin/profili?section=konfigurimi&sub=klinikat' },
      { label: tKonfig('sections.arkiva.label'),     href: '/admin/profili?section=konfigurimi&sub=arkiva' },
    ] : []),
  ]

  const q = query.trim().toLowerCase()

  const results: SearchResult[] = q.length < 2 ? [] : (() => {
    const out: SearchResult[] = []

    for (const page of pageItems) {
      if (page.label.toLowerCase().includes(q)) {
        out.push({ kind: 'page', id: page.href, label: page.label, sub: page.href.split('?')[0], href: page.href })
      }
      if (out.filter(r => r.kind === 'page').length >= 5) break
    }

    for (const p of (patients || [])) {
      const name = `${p.firstName} ${p.lastName}`
      if (name.toLowerCase().includes(q) || (p.phone || '').includes(q)) {
        out.push({ kind: 'patient', id: p.id, label: name, sub: p.phone || '—', href: patientHref(p.id) })
      }
      if (out.filter(r => r.kind === 'patient').length >= 3) break
    }

    for (const a of (appointments || [])) {
      if (
        (a.patientName || '').toLowerCase().includes(q) ||
        (a.type || '').toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'appointment',
          id: a.id,
          label: a.patientName || '—',
          sub: `${a.date?.substring(0, 10) || ''} · ${a.type || ''}`,
          href: appointmentsHref,
        })
      }
      if (out.filter(r => r.kind === 'appointment').length >= 2) break
    }

    for (const t of (treatments || [])) {
      if (
        (t.patientName || '').toLowerCase().includes(q) ||
        (t.type || '').toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'treatment',
          id: t.id,
          label: t.patientName || '—',
          sub: `${t.type || ''} · ${t.date?.substring(0, 10) || ''}`,
          href: '/doktor/trajtimet',
        })
      }
      if (out.filter(r => r.kind === 'treatment').length >= 2) break
    }

    for (const rx of (prescriptions || [])) {
      if (
        (rx.patientName || '').toLowerCase().includes(q) ||
        (rx.medication || '').toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'prescription',
          id: rx.id,
          label: rx.patientName || '—',
          sub: rx.medication || '—',
          href: '/doktor/recetat',
        })
      }
      if (out.filter(r => r.kind === 'prescription').length >= 2) break
    }

    const invoicesHref = user?.role === 'recepsion' ? '/recepsion/faturat' : '/admin/financa?tab=faturat'
    for (const inv of (invoices || [])) {
      if (
        (inv.patientName || '').toLowerCase().includes(q) ||
        (inv.status || '').toLowerCase().includes(q)
      ) {
        out.push({
          kind: 'invoice',
          id: inv.id,
          label: inv.patientName || '—',
          sub: `${inv.totalAmount ?? ''} · ${inv.status || ''}`,
          href: invoicesHref,
        })
      }
      if (out.filter(r => r.kind === 'invoice').length >= 2) break
    }

    // Staff directory management is admin-only — searching it from another
    // role's navbar would just link somewhere a 403 waits.
    if (user?.role === 'admin') {
      for (const s of (staff || [])) {
        if (
          s.name.toLowerCase().includes(q) ||
          (s.email || '').toLowerCase().includes(q) ||
          (s.specialization || '').toLowerCase().includes(q)
        ) {
          out.push({
            kind: 'staffMember',
            id: s.id,
            label: s.name,
            sub: s.specialization || s.role,
            href: `/admin/stafi/${s.id}`,
          })
        }
        if (out.filter(r => r.kind === 'staffMember').length >= 3) break
      }
    }

    return out.slice(0, 12)
  })()

  // Both floating search panels below manage `open` as a plain boolean
  // (there's no Radix primitive underneath them to delay unmount on its
  // own) — usePresence keeps each mounted for its exit animation instead of
  // the old `{condition && <div>}` cut. See hooks/use-presence.ts.
  const searchResultsOpen = open && results.length > 0
  const searchResultsMounted = usePresence(searchResultsOpen, 150)
  const mobileSearchMounted = usePresence(open, 150)

  return (
    <>
    <header data-slot="topbar" className="bg-card/80 backdrop-blur-sm border-b border-border/50 px-3 sm:px-4 lg:px-6 py-3 sticky top-0 z-[58] relative">
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Tablet hamburger */}
        <button
          onClick={toggleMobile}
          className="hidden sm:flex lg:hidden items-center justify-center w-9 h-9 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground shrink-0 outline-none"
          aria-label={t('openMenu')}
        >
          <Icon name={mobileOpen ? 'close' : 'menu'} size={20} />
        </button>

        {/* Desktop sidebar toggle */}
        <button
          onClick={toggle}
          className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground shrink-0 outline-none"
          aria-label={t('toggleSidebar')}
        >
          <Icon name={collapsed ? 'menu_open' : 'menu'} size={20} />
        </button>

        {/* Search — full bar on sm+, icon-only on mobile. flex-1 with no cap:
            the right-side icon cluster now pins itself with its own ml-auto,
            so this can grow freely to fill the gap without reopening the old
            trailing-dead-space bug (that's independent of this width now). */}
        <div className="relative flex-1 hidden sm:block">
          <Icon
            name="search"
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10"
          />
          <Input
            type="search"
            placeholder={t('searchPlaceholder')}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)}
            className="pl-9 bg-secondary/50 border-0 rounded-xl h-10 transition-all text-sm"
          />
          {searchResultsMounted && (
            <div
              data-state={searchResultsOpen ? 'open' : 'closed'}
              className={cn(
                'absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-[70] overflow-hidden origin-top',
                'duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out',
                'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
                'data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95',
                'data-[state=open]:slide-in-from-top-1 data-[state=closed]:slide-out-to-top-1',
              )}
            >
              {results.map((r, i) => (
                <Link
                  key={`${r.kind}-${r.id}-${i}`}
                  href={r.href}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => { setQuery(''); setOpen(false) }}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors"
                >
                  <Icon name={kindIcon[r.kind]} size={16} className="text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{r.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground/60 font-medium uppercase tracking-wide shrink-0">
                    {kindLabel[r.kind]}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Mobile search icon */}
        <button
          className="sm:hidden flex items-center justify-center w-9 h-9 rounded-xl hover:bg-secondary/80 transition-colors text-muted-foreground outline-none"
          onClick={() => { setOpen((o) => !o) }}
          aria-label={t('search')}
        >
          <Icon name="search" size={20} />
        </button>

        {/* Mobile search overlay */}
        {mobileSearchMounted && (
          <div
            data-state={open ? 'open' : 'closed'}
            className={cn(
              'sm:hidden absolute top-full left-0 right-0 bg-card border-b border-border shadow-lg z-[70] p-3 origin-top',
              'duration-150 data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
              'data-[state=open]:slide-in-from-top-2 data-[state=closed]:slide-out-to-top-2',
            )}
          >
            <div className="relative">
              <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
              <Input
                type="search"
                autoFocus
                placeholder={t('searchPlaceholder')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onBlur={() => setTimeout(() => { setOpen(false); setQuery('') }, 150)}
                className="pl-9 bg-secondary/50 border-0 rounded-xl h-10 text-sm w-full"
              />
            </div>
            {results.length > 0 && (
              <div className="mt-2 rounded-xl border border-border overflow-hidden">
                {results.map((r, i) => (
                  <Link
                    key={`${r.kind}-${r.id}-${i}`}
                    href={r.href}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { setQuery(''); setOpen(false) }}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/60 transition-colors border-b border-border/50 last:border-0"
                  >
                    <Icon name={kindIcon[r.kind]} size={16} className="text-muted-foreground shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{r.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground/60 font-medium uppercase">{kindLabel[r.kind]}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Right-side icon cluster — pinned to the edge with ml-auto so capping
            the search box's width doesn't leave dead space before it; without
            this, a narrower search just left an empty gap at the far right
            instead of the icons shifting over. */}
        <div className="flex items-center gap-2 sm:gap-3 ml-auto">

        {/* ── Info cluster: ambient, read-only ── */}

        {/* Exchange rate chip — admin only, desktop */}
        {user?.role === 'admin' && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="hidden sm:flex items-center gap-1.5 px-2.5 h-9 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-secondary/80"
              >
                <Icon name="currency_exchange" size={15} className="text-accent shrink-0" />
                {rate ? (
                  <span>€1 = {rate.toLocaleString('sq-AL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}L</span>
                ) : (
                  <span>EUR/LEK</span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 rounded-xl p-0 overflow-hidden">
              {/* Header with rate */}
              <div className="p-4 bg-secondary/30 border-b border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{t('exchangeRate.title')}</p>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-lg"
                    onClick={(e) => { e.preventDefault(); loadRate(true) }}
                    disabled={rateLoading}
                  >
                    <RefreshCw className={`h-3 w-3 ${rateLoading ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
                {rateLoading ? (
                  <div className="h-8 w-36 bg-secondary animate-pulse rounded-lg" />
                ) : rate ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-bold text-foreground">1 €</span>
                    <span className="text-muted-foreground text-sm">→</span>
                    <span className="text-xl font-bold text-accent">
                      {rate.toLocaleString('sq-AL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} L
                    </span>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('exchangeRate.loading')}</p>
                )}
                <div className="flex gap-1 mt-1.5">
                  {rateCached && <span className="chip-neutral text-[10px] px-1.5 py-0.5 rounded">{t('exchangeRate.cache')}</span>}
                  {rateFallback && <span className="chip-amber text-[10px] px-1.5 py-0.5 rounded">{t('exchangeRate.fallback')}</span>}
                </div>
              </div>

              {/* Mini conversion table */}
              {rate && (
                <div className="p-2">
                  {RATE_AMTS.map((eur, i) => (
                    <div
                      key={eur}
                      className={cn(
                        'flex justify-between px-2 py-1.5 rounded-lg text-sm',
                        i % 2 !== 0 && 'bg-secondary/40'
                      )}
                    >
                      <span className="text-muted-foreground font-medium">€{eur}</span>
                      <span className="font-semibold text-accent">
                        {Math.round(eur * rate).toLocaleString('sq-AL')} L
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="px-2 pb-2 border-t border-border/50 pt-1">
                <DropdownMenuItem asChild className="cursor-pointer gap-2 rounded-lg text-xs">
                  <Link href="/admin/profili?section=sistemi&sub=kursi">
                    <Icon name="open_in_new" size={13} className="text-muted-foreground" />
                    {t('exchangeRate.viewFull')}
                  </Link>
                </DropdownMenuItem>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <LiveClock />

        <div className="hidden sm:block w-px h-5 bg-border/60 shrink-0" />

        {/* ── Action cluster: things you click to do something ── */}

        {/* Quick Actions */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={t('quickActions.label')} className="inline-flex" data-tour="quick-actions">
              <Icon name="add_circle" size={20} className="text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52 rounded-xl">
            <DropdownMenuLabel className="font-semibold text-sm">{t('quickActions.label')}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {user?.role === 'admin' && (<>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('pacient')}>
                <Icon name="person_add" size={16} />{t('quickActions.addPatient')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('takim')}>
                <Icon name="calendar_add_on" size={16} />{t('quickActions.addAppointment')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('staf')}>
                <Icon name="manage_accounts" size={16} />{t('quickActions.addStaff')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('sherbim')}>
                <Icon name="stethoscope" size={16} />{t('quickActions.addService')}
              </DropdownMenuItem>
            </>)}
            {user?.role === 'recepsion' && (<>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('pacient')}>
                <Icon name="person_add" size={16} />{t('quickActions.addPatient')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('takim')}>
                <Icon name="calendar_add_on" size={16} />{t('quickActions.addAppointment')}
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link href="/recepsion/dokumenta?action=upload"><Icon name="upload_file" size={16} />{t('quickActions.uploadDocument')}</Link>
              </DropdownMenuItem>
            </>)}
            {user?.role === 'mjek' && (<>
              <DropdownMenuItem asChild className="cursor-pointer gap-2">
                <Link href="/doktor/trajtimet/shto"><Icon name="stethoscope" size={16} />{t('quickActions.addTreatment')}</Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('recete')}>
                <Icon name="description" size={16} />{t('quickActions.addPrescription')}
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer gap-2" onClick={() => openDialog('pacient')}>
                <Icon name="person_add" size={16} />{t('quickActions.addPatient')}
              </DropdownMenuItem>
            </>)}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Attendance clock in/out */}
        {user && (
          <Button
            variant="ghost"
            onClick={handleAttendanceToggle}
            disabled={attendanceBusy || !!(attendance?.clockIn && attendance?.clockOut)}
            className={cn(
              'hidden sm:flex items-center gap-1.5 px-2.5 h-9 rounded-xl text-xs font-semibold',
              !attendance?.clockIn
                ? 'ic-green hover:bg-[var(--p-green-bg)]'
                : !attendance?.clockOut
                  ? 'ic-amber hover:bg-[var(--p-amber-bg)]'
                  : 'text-muted-foreground'
            )}
            title={
              !attendance?.clockIn ? t('attendance.checkInTitle')
              : !attendance?.clockOut ? t('attendance.checkOutTitle')
              : t('attendance.doneTitle')
            }
          >
            {!attendance?.clockIn ? <LogIn className="h-4 w-4" /> : !attendance?.clockOut ? <LogOut className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
            <span>
              {!attendance?.clockIn ? t('attendance.checkIn') : !attendance?.clockOut ? t('attendance.checkOut') : t('attendance.done')}
            </span>
          </Button>
        )}

        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          aria-label={t('changeTheme')}
          className="w-9 h-9"
        >
          <Icon name={theme === 'dark' ? 'light_mode' : 'dark_mode'} size={20} className="text-muted-foreground" />
        </Button>

        <div className="hidden sm:block w-px h-5 bg-border/60 shrink-0" />

        {/* ── Alerts/status cluster ── */}

        {/* Notifications — admin only */}
        {user?.role === 'admin' && (
          <DropdownMenu onOpenChange={(o) => { if (o) markAllNotificationsRead() }}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-sm" className="relative w-9 h-9">
                <Icon name="notifications" size={20} className="text-muted-foreground" />
                {unreadCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-accent text-accent-foreground text-[10px] font-bold rounded-full flex items-center justify-center shadow-lg">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 rounded-xl">
              <DropdownMenuLabel className="font-semibold">{t('notifications.label')}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {appNotifications.length > 0 ? (
                appNotifications.slice(0, 8).map((n) => (
                  <DropdownMenuItem
                    key={n.id}
                    className={cn(
                      'flex flex-col items-start gap-1 p-3 cursor-pointer focus:bg-secondary/80',
                      !n.isRead && 'bg-accent/5'
                    )}
                    onClick={() => markNotificationRead(n.id)}
                  >
                    <div className="flex items-center gap-2 w-full">
                      {!n.isRead && (
                        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                      )}
                      <p className="text-sm font-medium text-foreground flex-1">{n.title}</p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-1 pl-3.5">{n.message}</p>
                  </DropdownMenuItem>
                ))
              ) : (
                <div className="p-6 text-center text-muted-foreground text-sm">
                  {t('notifications.empty')}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {/* Moved here from a full-width banner above the whole page (which
            used to render above the sidebar too, looking like a gap cut
            into it) — a small, inline badge instead, grouped with the
            other topbar status indicators. Stays quiet at rest (per the
            earlier "less obvious" direction) but the small triangle + the
            tooltip it opens read unambiguously as a heads-up, not just a
            neutral label.
            2026-08-15: was `hidden sm:inline-flex` — fully invisible below
            the sm breakpoint, meaning a visitor demoing on their own phone
            (the PWA install flow this app pushes hard) got zero indication
            this was a demo at all. Now visible at every width; only the
            text label collapses to icon-only on narrow screens, since
            AssistantUsageBadge right after this is already `hidden md:flex`
            and leaves the room for it. */}
        {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[10px] font-medium cursor-default select-none">
                <TriangleAlert className="h-3 w-3" />
                <span className="hidden sm:inline">{t('demo.badge')}</span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-64 text-center">{t('demo.tooltip')}</TooltipContent>
          </Tooltip>
        )}

        <AssistantUsageBadge />
        </div>
      </div>
    </header>
    {title && (
      // Generic per-page tour anchor — reused as `[data-tour="page-header"]`
      // by every full-page tour step (see lib/tour/steps.ts). Safe as a
      // single shared selector because only one page's Topbar is ever
      // mounted at a time. A handful of pages render their own local heading
      // instead of passing a title here (mostly doktor's own pages, which
      // build a custom stat-card header) — those carry the same data-tour
      // attribute directly on that heading instead, see e.g.
      // doktor/pacientet/page.tsx.
      //
      // Title-only now (no subtitle) — every page used to independently
      // decide whether it had one, so the header row's height/weight
      // visibly shifted between pages. Standardized on title-only; the
      // accent bar + larger size below is what keeps a single line from
      // reading as bare/unfinished now that there's nothing underneath it.
      <div className="px-4 lg:px-8 py-4 sm:py-5 border-b border-border/40 bg-background/60" data-tour="page-header">
        <h1 className="flex items-center gap-2.5 text-xl sm:text-2xl font-bold tracking-tight text-foreground">
          <span className="h-5 w-1 sm:h-6 rounded-full bg-accent shrink-0" aria-hidden="true" />
          {title}
        </h1>
      </div>
    )}
    <WorkModePrompt
      open={workModePromptOpen}
      onAnswered={async (rec) => {
        setAttendance(rec)
        setWorkModePromptOpen(false)
        setBlocked(false)
        // Ambient popup only auto-clocks-in on a real fizik/largesi answer
        // (skip there means "not ready to log anything yet"). A manual
        // check-in click always completes, even on skip, since that's what
        // was explicitly requested.
        const shouldClockIn = checkInIntent || !!rec.workMode
        setCheckInIntent(false)
        if (shouldClockIn && !rec.clockIn) {
          try {
            const clocked = await apiClockIn()
            setAttendance(clocked)
            toast.success('Check-in u regjistrua')
          } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Gabim gjatë check-in')
          }
        }
      }}
    />
    </>
  )
}

