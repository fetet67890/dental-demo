"use client"

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { SearchInput } from '@core/components/ui/search-input'
import { Card, CardContent } from '@core/components/ui/card'
import { StatusBadge } from '@core/components/ui/status-badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@core/components/ui/dialog'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@core/components/ui/table'
import {
  Plus,
  Phone,
  Mail,
  UserCog,
  ShieldCheck,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn, syncUrl } from '@core/lib/utils'
import { Staff, UserRole } from '@core/types'
import { getAttendance, getAttendanceRisk, adminSetWorkMode, type StaffAttendanceStatus, type StaffAttendanceRisk, type WorkMode } from '@core/lib/api/attendance'
import { Clock, AlertTriangle } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

// —— Form state ———————————————————————————————————————————————————————————————

const blankForm = {
  name: '',
  email: '',
  phone: '',
  role: '' as UserRole | '',
  specialization: '',
  status: 'aktiv' as 'aktiv' | 'joaktiv',
  password: '',
  confirmPassword: '',
}

const blankPwForm = { newPassword: '', confirmPassword: '' }

function getRoleBadgeClass(role: UserRole) {
  switch (role) {
    case 'admin':     return 'chip-indigo'
    case 'mjek':      return 'chip-blue'
    case 'recepsion': return 'chip-green'
    default:          return 'chip-neutral'
  }
}

// —— Component ————————————————————————————————————————————————————————————————

export default function StaffPage() {
  const t = useTranslations('admin-stafi')
  const { staff, addStaff } = useData()
  const searchParams = useSearchParams()

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':      return t('roles.admin')
      case 'mjek':       return t('roles.mjek')
      case 'recepsion':  return t('roles.recepsion')
      default:           return role
    }
  }

  const [searchQuery,    setSearchQuery]    = useState('')
  const [isMainOpen,     setIsMainOpen]     = useState(false)
  const [formData,       setFormData]       = useState(blankForm)
  const [showPw,         setShowPw]         = useState(false)
  const [showConfirm,    setShowConfirm]    = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [staffErrors,    setStaffErrors]    = useState<Record<string, string>>({})

  const [attendanceToday, setAttendanceToday] = useState<StaffAttendanceStatus[]>([])
  const [attendanceLoading, setAttendanceLoading] = useState(true)
  const [attendanceRisk, setAttendanceRisk] = useState<StaffAttendanceRisk[]>([])

  useEffect(() => {
    getAttendance()
      .then((res) => setAttendanceToday(res.staff))
      .catch(() => {})
      .finally(() => setAttendanceLoading(false))
    getAttendanceRisk()
      .then((res) => setAttendanceRisk(res.filter((r) => r.belowAverage)))
      .catch(() => {})
  }, [])

  const handleWorkModeChange = async (userId: string, mode: WorkMode | 'clear') => {
    const today = new Date().toISOString().split('T')[0]
    try {
      await adminSetWorkMode(userId, today, mode === 'clear' ? null : mode)
      setAttendanceToday((prev) => prev.map((a) => (
        a.userId === userId ? { ...a, workMode: mode === 'clear' ? null : mode, workModeSkipped: false } : a
      )))
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : t('workMode.updateError'))
    }
  }

  const filteredStaff = staff.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.role.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  // —— Open dialogs ———————————————————————————————————————————————————————————

  const openCreate = () => {
    setFormData(blankForm)
    setShowPw(false)
    setShowConfirm(false)
    setStaffErrors({})
    setIsMainOpen(true)
  }

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      openCreate()
      syncUrl('/admin/stafi')
    }
  }, [searchParams]) // eslint-disable-line

  // —— Submit: create ———————————————————————————————————————————————————————————
  // Editing an existing member (details/password/permissions/delete) now all
  // lives on that member's own page (admin/stafi/[id]) — this dialog only
  // ever creates a brand-new account.

  const handleSubmit = async () => {
    const e: Record<string, string> = {}
    if (!formData.name.trim()) e.name = t('validation.nameRequired')
    if (!formData.phone.trim()) e.phone = t('validation.phoneRequired')
    if (formData.password && formData.password.length < 6) e.password = t('validation.passwordMinLength')
    if (formData.password && formData.password !== formData.confirmPassword) e.confirmPassword = t('validation.passwordsDontMatch')
    if (Object.keys(e).length > 0) {
      setStaffErrors(e)
      toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.')
      return
    }

    setSubmitting(true)
    try {
      await addStaff({
        name:           formData.name,
        email:          formData.email,
        phone:          formData.phone,
        role:           formData.role as UserRole,
        specialization: formData.specialization,
        status:         formData.status,
        password:       formData.password,
      })
      toast.success(`Llogaria u krijua. ${formData.name} mund të hyjë tani me email dhe fjalëkalimin e vendosur.`)
      setIsMainOpen(false)
      setFormData(blankForm)
      setStaffErrors({})
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSubmitting(false)
    }
  }

  // —— Stats ——————————————————————————————————————————————————————————————————

  const totalActive = staff.filter((s) => s.status === 'aktiv').length
  const totalDoctors = staff.filter((s) => s.role === 'mjek').length
  const totalReception = staff.filter((s) => s.role === 'recepsion').length

  // —— Render —————————————————————————————————————————————————————————————————

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <PageLoadingGuard stats={4} cols={6} rows={8}>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: t('stats.total'),       value: staff.length,  Icon: UserCog,    iconBg: 'ibg-sky',    iconColor: 'ic-sky',    strip: 'strip-sky'    },
            { label: t('stats.active'),      value: totalActive,   Icon: ShieldCheck, iconBg: 'ibg-green',  iconColor: 'ic-green',  strip: 'strip-green'  },
            { label: t('stats.doctors'),     value: totalDoctors,  Icon: UserCog,    iconBg: 'ibg-blue',   iconColor: 'ic-blue',   strip: 'strip-blue'   },
            { label: t('stats.reception'),   value: totalReception,Icon: UserCog,    iconBg: 'ibg-indigo', iconColor: 'ic-indigo', strip: 'strip-indigo' },
          ].map(({ label, value, Icon, iconBg, iconColor, strip }) => (
            <div key={label} className="relative bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3 flex items-center gap-3">
              <div className={`absolute top-0 left-0 right-0 h-[3px] ${strip}`} />
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${iconBg}`}>
                <Icon className={`h-4 w-4 ${iconColor}`} />
              </div>
              <div>
                <p className="text-xl font-bold text-foreground leading-none">{value}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Today's Attendance */}
        <Card className="border-0 shadow-sm mb-6">
          <CardContent className="p-4 lg:p-5">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="h-4 w-4 text-accent" />
              <p className="font-semibold text-sm text-foreground">{t('attendanceToday')}</p>
            </div>
            {attendanceLoading ? (
              <p className="text-sm text-muted-foreground">{t('loading')}</p>
            ) : attendanceToday.length > 0 ? (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {attendanceToday.map((a) => (
                  <div key={a.userId} className="flex items-center justify-between gap-2 p-2.5 bg-secondary/30 rounded-xl border border-border/50">
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-foreground truncate block">{a.name}</span>
                      <div className="flex items-center gap-1.5 mt-1 min-w-0">
                        {/* Work mode (fizik/largësi) and clock-in/out are two
                            independent facts — a "largësi" pick just answers
                            *where*, it doesn't clock anyone in or out. This
                            used to short-circuit to a bare "Remote" label the
                            moment workMode was 'largesi' and never look at
                            clockIn/clockOut at all, so a remote staff member
                            appeared permanently stuck on "Remote" all day even
                            after actually checking out — indistinguishable
                            from one who never checked out. Always show the
                            real clock status; workMode is just a prefix on it. */}
                        <span className={cn(
                          'w-1.5 h-1.5 rounded-full shrink-0',
                          !a.clockIn ? 'dot-neutral' : !a.clockOut ? 'dot-amber' : 'dot-green'
                        )} />
                        <span className="text-xs text-muted-foreground truncate">
                          {a.workMode === 'largesi' ? `${t('workMode.remote')} · ` : ''}
                          {!a.clockIn
                            ? '—'
                            : t('clockedIn', { time: new Date(a.clockIn).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }) })}
                          {a.clockOut ? ` · ${t('clockedOut', { time: new Date(a.clockOut).toLocaleTimeString('sq-AL', { hour: '2-digit', minute: '2-digit' }) })}` : ''}
                        </span>
                      </div>
                    </div>
                    <Select
                      value={a.workMode || 'clear'}
                      onValueChange={(v) => handleWorkModeChange(a.userId, v as WorkMode | 'clear')}
                    >
                      <SelectTrigger className="h-7 w-[110px] text-xs shrink-0">
                        <SelectValue placeholder={t('workMode.unset')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fizik">{t('workMode.physical')}</SelectItem>
                        <SelectItem value="largesi">{t('workMode.remote')}</SelectItem>
                        <SelectItem value="clear">{t('workMode.unset')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t('noActiveStaff')}</p>
            )}
          </CardContent>
        </Card>

        {/* Attendance-frequency flag — not lateness (no shift schedule exists
            to compare clock-in times against), just staff whose check-in
            frequency over the last 30 days is well below their peers' average. */}
        {attendanceRisk.length > 0 && (
          <Card className="border-0 shadow-sm mb-6">
            <CardContent className="p-4 lg:p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 ic-amber" />
                <p className="font-semibold text-sm text-foreground">{t('lowAttendanceFrequency')}</p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {attendanceRisk.map((r) => (
                  <div key={r.userId} className="flex items-center justify-between p-2.5 ibg-amber rounded-xl border border-[var(--p-amber)]/30">
                    <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {t('daysVsAverage', { days: r.daysPresent, average: r.averageDaysPresent })}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <SearchInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1"
          />
          <Button onClick={openCreate} className="bg-accent hover:bg-accent/90" data-tour="action-add-staff">
            <Plus className="h-4 w-4 mr-2" />
            {t('addStaff')}
          </Button>
        </div>

        {/* Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {/* —— Desktop table —— */}
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.member')}</TableHead>
                    <TableHead className="hidden md:table-cell">{t('table.contact')}</TableHead>
                    <TableHead>{t('table.role')}</TableHead>
                    <TableHead className="hidden lg:table-cell">{t('table.specialization')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead className="text-right">{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStaff.map((member) => (
                    <TableRow key={member.id}>
                      {/* Avatar + name */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-semibold shrink-0">
                            {member.avatar ? (
                              <img src={member.avatar.startsWith('http') ? member.avatar : `${API_BASE}${member.avatar}`} alt={member.name} className="w-full h-full object-cover bg-muted" />
                            ) : (
                              member.name.charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground md:hidden">{member.email}</p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Contact */}
                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {member.email}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Phone className="h-3 w-3" />
                            {member.phone || '—'}
                          </div>
                        </div>
                      </TableCell>

                      {/* Role */}
                      <TableCell>
                        <span className={`px-2 py-1 text-xs rounded-full font-medium ${getRoleBadgeClass(member.role)}`}>
                          {getRoleLabel(member.role)}
                        </span>
                      </TableCell>

                      {/* Specialization */}
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                        {member.specialization || '—'}
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        <StatusBadge status={member.status} />
                      </TableCell>

                      {/* Actions — every action (edit, photo, password, permissions,
                          activate/deactivate, delete) lives on the member's own
                          page now; this just opens it. */}
                      <TableCell className="text-right">
                        <Link href={`/admin/stafi/${member.id}`}>
                          <Button variant="ghost" size="icon" title={t('menu.viewDetails')}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))}

                  {filteredStaff.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                        {searchQuery ? t('emptyStateSearch') : t('emptyState')}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* —— Mobile cards —— */}
            <div className="sm:hidden divide-y divide-border">
              {filteredStaff.map((member) => (
                <div key={member.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-full overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-semibold text-sm shrink-0">
                        {member.avatar ? (
                          <img src={member.avatar.startsWith('http') ? member.avatar : `${API_BASE}${member.avatar}`} alt={member.name} className="w-full h-full object-cover bg-muted" />
                        ) : (
                          member.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm">{member.name}</p>
                        <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${getRoleBadgeClass(member.role)}`}>{getRoleLabel(member.role)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={member.status} />
                      <Link href={`/admin/stafi/${member.id}`}>
                        <Button variant="ghost" size="icon" title={t('menu.viewDetails')}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                  <div className="mt-2 ml-12 space-y-0.5 text-xs text-muted-foreground">
                    <p className="flex items-center gap-1.5"><Mail className="h-3 w-3" />{member.email}</p>
                    {member.phone && <p className="flex items-center gap-1.5"><Phone className="h-3 w-3" />{member.phone}</p>}
                    {member.specialization && <p>{t('specAbbr', { specialization: member.specialization })}</p>}
                  </div>
                </div>
              ))}
              {filteredStaff.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  {searchQuery ? t('emptyStateSearch') : t('emptyStateShort')}
                </div>
              )}
            </div>

          </CardContent>
        </Card>
        </PageLoadingGuard>
      </div>

      {/* —— Create Dialog —————————————————————————————————————————————————————— */}
      <Dialog open={isMainOpen} onOpenChange={(v) => { if (!submitting) setIsMainOpen(v) }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>{t('dialog.addDescription')}</DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            {/* Name */}
            <Field>
              <FieldLabel>{t('dialog.nameLabel')}</FieldLabel>
              <Input
                value={formData.name}
                onChange={(e) => { setFormData({ ...formData, name: e.target.value }); if (staffErrors.name) setStaffErrors(p => ({ ...p, name: '' })) }}
                placeholder={t('dialog.namePlaceholder')}
                className={cn(staffErrors.name && "border-destructive focus-visible:ring-destructive/30")}
              />
              {staffErrors.name && <p className="text-xs text-destructive mt-1">{staffErrors.name}</p>}
            </Field>

            {/* Email */}
            <Field>
              <FieldLabel>{t('dialog.emailLabel')}</FieldLabel>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => { setFormData({ ...formData, email: e.target.value }); if (staffErrors.email) setStaffErrors(p => ({ ...p, email: '' })) }}
                placeholder="email@klinika.com"
                className={cn(staffErrors.email && "border-destructive focus-visible:ring-destructive/30")}
              />
              {staffErrors.email && <p className="text-xs text-destructive mt-1">{staffErrors.email}</p>}
            </Field>

            {/* Phone */}
            <Field>
              <FieldLabel>{t('dialog.phoneLabel')}</FieldLabel>
              <Input
                value={formData.phone}
                onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (staffErrors.phone) setStaffErrors(p => ({ ...p, phone: '' })) }}
                placeholder="+383 44 123 456"
                className={cn(staffErrors.phone && "border-destructive focus-visible:ring-destructive/30")}
              />
              {staffErrors.phone && <p className="text-xs text-destructive mt-1">{staffErrors.phone}</p>}
            </Field>

            {/* Role */}
            <Field>
              <FieldLabel>{t('dialog.roleLabel')}</FieldLabel>
              <Select
                value={formData.role}
                onValueChange={(v) => { setFormData({ ...formData, role: v as UserRole }); if (staffErrors.role) setStaffErrors(p => ({ ...p, role: '' })) }}
              >
                <SelectTrigger className={cn(staffErrors.role && "border-destructive")}>
                  <SelectValue placeholder={t('dialog.rolePlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">{t('dialog.roleAdmin')}</SelectItem>
                  <SelectItem value="mjek">{t('roles.mjek')}</SelectItem>
                  <SelectItem value="recepsion">{t('roles.recepsion')}</SelectItem>
                </SelectContent>
              </Select>
              {staffErrors.role && <p className="text-xs text-destructive mt-1">{staffErrors.role}</p>}
            </Field>

            {/* Specialization — doctors only */}
            {formData.role === 'mjek' && (
              <Field>
                <FieldLabel>{t('dialog.specializationLabel')}</FieldLabel>
                <Input
                  value={formData.specialization}
                  onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                  placeholder={t('dialog.specializationPlaceholder')}
                />
              </Field>
            )}

            {/* Password fields — this dialog only ever creates, so always shown */}
            <div className="border-t pt-4 mt-1">
              <p className="text-sm font-medium text-primary mb-3 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-accent" />
                {t('dialog.loginCredentials')}
              </p>
              <div className="space-y-3">
                <Field>
                  <FieldLabel>{t('dialog.passwordLabel')}</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      value={formData.password}
                      onChange={(e) => { setFormData({ ...formData, password: e.target.value }); if (staffErrors.password) setStaffErrors(p => ({ ...p, password: '' })) }}
                      placeholder={t('dialog.passwordPlaceholder')}
                      className={cn("pr-10", staffErrors.password && "border-destructive focus-visible:ring-destructive/30")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw(!showPw)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {staffErrors.password && <p className="text-xs text-destructive mt-1">{staffErrors.password}</p>}
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.confirmPasswordLabel')}</FieldLabel>
                  <div className="relative">
                    <Input
                      type={showConfirm ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) => { setFormData({ ...formData, confirmPassword: e.target.value }); if (staffErrors.confirmPassword) setStaffErrors(p => ({ ...p, confirmPassword: '' })) }}
                      placeholder={t('dialog.confirmPasswordPlaceholder')}
                      className={cn("pr-10", staffErrors.confirmPassword && "border-destructive focus-visible:ring-destructive/30")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary"
                    >
                      {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {staffErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{staffErrors.confirmPassword}</p>}
                </Field>
              </div>
            </div>

            {/* Status */}
            <Field>
              <FieldLabel>{t('dialog.accountStatusLabel')}</FieldLabel>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as 'aktiv' | 'joaktiv' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="aktiv">{t('dialog.statusActive')}</SelectItem>
                  <SelectItem value="joaktiv">{t('dialog.statusInactive')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </FieldGroup>

          <DialogFooter className="mt-2">
            <Button
              variant="outline"
              onClick={() => setIsMainOpen(false)}
              disabled={submitting}
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-accent hover:bg-accent/90"
              disabled={submitting}
            >
              {submitting ? t('saving') : t('dialog.createAccount')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  )
}
