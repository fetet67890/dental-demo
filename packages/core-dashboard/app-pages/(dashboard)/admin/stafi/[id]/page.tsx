"use client"

import { use, useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@core/components/ui/card'
import { StatusBadge } from '@core/components/ui/status-badge'
import { Switch } from '@core/components/ui/switch'
import { Textarea } from '@core/components/ui/textarea'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { Field, FieldLabel, FieldGroup } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import {
  ArrowLeft, Mail, Phone, Camera, KeyRound, Eye, EyeOff, Trash2,
  UserPlus, UserMinus, ShieldCheck, ShieldOff, Clock, Save, Percent, Globe,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@core/lib/utils'
import { UserRole } from '@core/types'
import {
  resetStaffPassword, uploadStaffAvatar,
  getStaffCommissionRates, setStaffCommissionRates, type StaffCommissionRate,
} from '@core/lib/api/staff'
import { getAttendance, type StaffAttendanceStatus } from '@core/lib/api/attendance'

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

function getRoleBadgeClass(role: UserRole) {
  switch (role) {
    case 'admin':     return 'chip-indigo'
    case 'mjek':      return 'chip-blue'
    case 'recepsion': return 'chip-green'
    default:          return 'chip-neutral'
  }
}

export default function StaffDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('admin-stafi')
  const router = useRouter()
  const { staff, services, updateStaff, deleteStaff, refreshStaff } = useData()
  const member = staff.find((m) => m.id === id)

  const getRoleLabel = (role: UserRole) => {
    switch (role) {
      case 'admin':     return t('roles.admin')
      case 'mjek':      return t('roles.mjek')
      case 'recepsion': return t('roles.recepsion')
      default:          return role
    }
  }

  // ── Avatar ───────────────────────────────────────────────────────────────
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      await uploadStaffAvatar(id, file)
      await refreshStaff()
      toast.success(t('menu.changePhoto') + ' ✓')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit')
    } finally {
      setUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ''
    }
  }

  // ── Details form ─────────────────────────────────────────────────────────
  const [detailsForm, setDetailsForm] = useState({ name: '', email: '', phone: '', role: '' as UserRole | '', specialization: '' })
  const [detailsErrors, setDetailsErrors] = useState<Record<string, string>>({})
  const [savingDetails, setSavingDetails] = useState(false)

  useEffect(() => {
    if (member) {
      setDetailsForm({
        name: member.name, email: member.email, phone: member.phone,
        role: member.role, specialization: member.specialization || '',
      })
      setWebsiteBioDraft(member.websiteBio || '')
    }
  }, [member])

  // ── Website visibility (public Team page) ───────────────────────────────
  const [websiteBioDraft, setWebsiteBioDraft] = useState('')
  const [savingWebsiteToggle, setSavingWebsiteToggle] = useState(false)
  const [savingWebsiteBio, setSavingWebsiteBio] = useState(false)

  const handleToggleShowOnWebsite = async (member_: typeof member) => {
    if (!member_) return
    const next = !member_.showOnWebsite
    setSavingWebsiteToggle(true)
    try {
      await updateStaff(id, { showOnWebsite: next })
      toast.success(next ? t('website.shown') : t('website.hidden'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingWebsiteToggle(false)
    }
  }

  const handleSaveWebsiteBio = async () => {
    setSavingWebsiteBio(true)
    try {
      await updateStaff(id, { websiteBio: websiteBioDraft })
      toast.success(t('website.bioSaved'))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingWebsiteBio(false)
    }
  }

  const handleSaveDetails = async () => {
    const e: Record<string, string> = {}
    if (!detailsForm.name.trim()) e.name = t('validation.nameRequired')
    if (!detailsForm.phone.trim()) e.phone = t('validation.phoneRequired')
    if (Object.keys(e).length > 0) { setDetailsErrors(e); return }

    setSavingDetails(true)
    try {
      await updateStaff(id, {
        name: detailsForm.name, email: detailsForm.email, phone: detailsForm.phone,
        role: detailsForm.role as UserRole, specialization: detailsForm.specialization,
      })
      toast.success('Të dhënat u përditësuan')
      setDetailsErrors({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingDetails(false)
    }
  }

  // ── Password reset ───────────────────────────────────────────────────────
  const [pwForm, setPwForm] = useState({ newPassword: '', confirmPassword: '' })
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [savingPw, setSavingPw] = useState(false)

  const handlePasswordReset = async () => {
    if (!pwForm.newPassword || pwForm.newPassword.length < 6) {
      toast.error(t('validation.passwordMinLength')); return
    }
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      toast.error(t('validation.passwordsDontMatch')); return
    }
    setSavingPw(true)
    try {
      await resetStaffPassword(id, pwForm.newPassword)
      toast.success(`${t('menu.changePassword')} ✓`)
      setPwForm({ newPassword: '', confirmPassword: '' })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingPw(false)
    }
  }

  // ── Permissions ───────────────────────────────────────────────────────────
  const handleToggleCanAddStaff = async (member_: typeof member) => {
    if (!member_) return
    const next = !member_.canAddStaff
    try {
      await updateStaff(id, { canAddStaff: next })
      toast.success(next ? t('menu.grantAddStaff') + ' ✓' : t('menu.revokeAddStaff') + ' ✓')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    }
  }

  const handleToggleStatus = async (member_: typeof member) => {
    if (!member_) return
    const next = member_.status === 'aktiv' ? 'joaktiv' : 'aktiv'
    try {
      await updateStaff(id, { status: next })
      toast.success(next === 'aktiv' ? `${member_.name} u aktivizua` : `${member_.name} u çaktivizua`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    }
  }

  // ── Commission ────────────────────────────────────────────────────────────
  // Off by default (see `commission_enabled`'s own DEFAULT 0) — this card
  // just surfaces that flag plus, once it's on, which of the two rate
  // shapes applies. rate_type is per staff member; the cost-vs-payment
  // calculation basis is a clinic-wide setting instead (Financa's own
  // Komisionet tab), not something that varies doctor to doctor.
  const [commissionRateType, setCommissionRateType] = useState<'flat' | 'per_service'>('flat')
  const [commissionRate, setCommissionRate] = useState('')
  const [savingCommissionToggle, setSavingCommissionToggle] = useState(false)
  const [savingCommissionRate, setSavingCommissionRate] = useState(false)
  const [serviceRates, setServiceRates] = useState<Record<string, string>>({})
  const [loadingServiceRates, setLoadingServiceRates] = useState(false)
  const [savingServiceRates, setSavingServiceRates] = useState(false)

  useEffect(() => {
    if (member) {
      setCommissionRateType(member.commissionRateType || 'flat')
      setCommissionRate(member.commissionRate !== undefined ? String(member.commissionRate) : '')
    }
  }, [member])

  useEffect(() => {
    if (!member?.commissionEnabled || commissionRateType !== 'per_service') return
    setLoadingServiceRates(true)
    getStaffCommissionRates(id)
      .then((rates: StaffCommissionRate[]) => {
        const map: Record<string, string> = {}
        for (const r of rates) map[r.serviceId] = String(r.rate)
        setServiceRates(map)
      })
      .catch(() => toast.error('Gabim gjatë ngarkimit të normave'))
      .finally(() => setLoadingServiceRates(false))
  }, [id, member?.commissionEnabled, commissionRateType])

  const handleToggleCommission = async (next: boolean) => {
    setSavingCommissionToggle(true)
    try {
      await updateStaff(id, { commissionEnabled: next })
      toast.success(next ? 'Komisioni u aktivizua' : 'Komisioni u çaktivizua')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingCommissionToggle(false)
    }
  }

  const handleSaveCommissionRate = async () => {
    setSavingCommissionRate(true)
    try {
      await updateStaff(id, {
        commissionRateType,
        commissionRate: commissionRateType === 'flat' && commissionRate ? parseFloat(commissionRate) : undefined,
      })
      toast.success('Norma e komisionit u ruajt')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingCommissionRate(false)
    }
  }

  const handleSaveServiceRates = async () => {
    setSavingServiceRates(true)
    try {
      const rates = Object.entries(serviceRates)
        .filter(([, v]) => v.trim() !== '')
        .map(([serviceId, v]) => ({ serviceId, rate: parseFloat(v) }))
        .filter(r => !Number.isNaN(r.rate))
      await setStaffCommissionRates(id, rates)
      toast.success('Normat u ruajtën')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSavingServiceRates(false)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await deleteStaff(id)
      toast.success(`${member?.name} u fshi përgjithmonë nga sistemi`)
      router.push('/admin/stafi')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
      setDeleting(false)
    }
  }

  // ── Today's attendance ───────────────────────────────────────────────────
  const [attendance, setAttendance] = useState<StaffAttendanceStatus | null>(null)

  useEffect(() => {
    getAttendance().then((res) => setAttendance(res.staff.find((a) => a.userId === id) || null)).catch(() => {})
  }, [id])

  if (!member) {
    return (
      <>
        <Topbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div>
              <p className="text-base font-semibold text-foreground">{t('detailPage.notFound.title')}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">{t('detailPage.notFound.subtitle')}</p>
            </div>
            <Link href="/admin/stafi">
              <Button className="gap-2 rounded-xl"><ArrowLeft className="h-4 w-4" />{t('detailPage.back')}</Button>
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar />

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-5">

        {/* Header row */}
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin/stafi">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <ArrowLeft className="h-4 w-4" />
              {t('detailPage.back')}
            </Button>
          </Link>
        </div>

        {/* Hero */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-1.5 bg-accent" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="relative w-16 h-16 rounded-2xl overflow-hidden bg-accent/10 flex items-center justify-center text-accent font-bold text-xl shrink-0 group"
                  title={t('menu.changePhoto')}
                >
                  {member.avatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={member.avatar.startsWith('http') ? member.avatar : `${API_BASE}${member.avatar}`} alt={member.name} className="w-full h-full object-cover bg-muted" />
                  ) : (
                    member.name.charAt(0).toUpperCase()
                  )}
                  <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="h-5 w-5 text-white" />
                  </span>
                </button>
                <input ref={avatarInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarFileChange} />

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground leading-tight">{member.name}</h1>
                    <span className={cn('px-2 py-0.5 text-xs rounded-full font-semibold', getRoleBadgeClass(member.role))}>
                      {getRoleLabel(member.role)}
                    </span>
                    <StatusBadge status={member.status} />
                  </div>
                  {member.specialization && (
                    <p className="text-sm text-muted-foreground mt-1">{member.specialization}</p>
                  )}
                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" />{member.email || '—'}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" />{member.phone || '—'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Today's attendance */}
              <div className="flex flex-col items-center gap-1 px-4 py-3 rounded-xl border border-border/50 bg-accent/5 sm:shrink-0">
                <Clock className="h-4 w-4 text-accent" />
                <p className="text-xs text-muted-foreground font-medium">{t('detailPage.todayStatus')}</p>
                {/* Work mode and clock-in/out are independent facts — this used
                    to show "Remote" in place of the checkmarks the moment
                    workMode was 'largesi' and never look at clockIn/clockOut
                    again for the rest of the day, so a remote staff member who
                    had actually checked out looked identical to one who never
                    did. Always show the real clock status; "Remote" is just a
                    qualifier underneath it, same as the list view in
                    admin/stafi/page.tsx. */}
                <p className="text-sm font-semibold text-foreground">
                  {attendance?.clockIn ? (attendance.clockOut ? '✓ ✓' : '✓') : '—'}
                </p>
                {attendance?.workMode === 'largesi' && (
                  <p className="text-[10px] text-muted-foreground -mt-0.5">{t('workMode.remote')}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Details */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('detailPage.sections.details')}</CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel>{t('dialog.nameLabel')}</FieldLabel>
                  <Input
                    value={detailsForm.name}
                    onChange={(e) => { setDetailsForm({ ...detailsForm, name: e.target.value }); if (detailsErrors.name) setDetailsErrors(p => ({ ...p, name: '' })) }}
                    className={cn(detailsErrors.name && 'border-destructive focus-visible:ring-destructive/30')}
                  />
                  {detailsErrors.name && <p className="text-xs text-destructive mt-1">{detailsErrors.name}</p>}
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.emailLabel')}</FieldLabel>
                  <Input type="email" value={detailsForm.email} onChange={(e) => setDetailsForm({ ...detailsForm, email: e.target.value })} />
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.phoneLabel')}</FieldLabel>
                  <Input
                    value={detailsForm.phone}
                    onChange={(e) => { setDetailsForm({ ...detailsForm, phone: e.target.value }); if (detailsErrors.phone) setDetailsErrors(p => ({ ...p, phone: '' })) }}
                    className={cn(detailsErrors.phone && 'border-destructive focus-visible:ring-destructive/30')}
                  />
                  {detailsErrors.phone && <p className="text-xs text-destructive mt-1">{detailsErrors.phone}</p>}
                </Field>
                <Field>
                  <FieldLabel>{t('dialog.roleLabel')}</FieldLabel>
                  <Select value={detailsForm.role} onValueChange={(v) => setDetailsForm({ ...detailsForm, role: v as UserRole })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">{t('dialog.roleAdmin')}</SelectItem>
                      <SelectItem value="mjek">{t('roles.mjek')}</SelectItem>
                      <SelectItem value="recepsion">{t('roles.recepsion')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                {detailsForm.role === 'mjek' && (
                  <Field className="sm:col-span-2">
                    <FieldLabel>{t('dialog.specializationLabel')}</FieldLabel>
                    <Input
                      value={detailsForm.specialization}
                      onChange={(e) => setDetailsForm({ ...detailsForm, specialization: e.target.value })}
                      placeholder={t('dialog.specializationPlaceholder')}
                    />
                  </Field>
                )}
              </div>
            </FieldGroup>
            <Button onClick={handleSaveDetails} disabled={savingDetails} className="gap-2 bg-accent hover:bg-accent/90 mt-4">
              <Save className="h-4 w-4" />
              {savingDetails ? t('saving') : t('detailPage.saveDetails')}
            </Button>
          </CardContent>
        </Card>

        {/* Security */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><KeyRound className="h-4 w-4 text-accent" />{t('detailPage.sections.security')}</CardTitle>
            <CardDescription>{t('pwDialog.hint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field>
                <FieldLabel>{t('pwDialog.newPasswordLabel')}</FieldLabel>
                <div className="relative">
                  <Input
                    type={showNewPw ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={(e) => setPwForm({ ...pwForm, newPassword: e.target.value })}
                    placeholder={t('dialog.passwordPlaceholder')}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
              <Field>
                <FieldLabel>{t('dialog.confirmPasswordLabel')}</FieldLabel>
                <div className="relative">
                  <Input
                    type={showConfirmPw ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={(e) => setPwForm({ ...pwForm, confirmPassword: e.target.value })}
                    placeholder={t('dialog.confirmPasswordPlaceholder')}
                    className="pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirmPw(!showConfirmPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                    {showConfirmPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </Field>
            </div>
            <Button onClick={handlePasswordReset} disabled={savingPw} className="gap-2 bg-accent hover:bg-accent/90 mt-4">
              <KeyRound className="h-4 w-4" />
              {savingPw ? t('saving') : t('menu.changePassword')}
            </Button>
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base">{t('detailPage.sections.permissions')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {member.role !== 'admin' && (
              <div className="flex items-center justify-between gap-4 p-3.5 bg-secondary/50 rounded-xl">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground flex items-center gap-2">
                    {member.canAddStaff ? <UserPlus className="h-4 w-4 ic-blue" /> : <UserMinus className="h-4 w-4 text-muted-foreground" />}
                    {t('detailPage.permissions.addStaffLabel')}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t('detailPage.permissions.addStaffHint')}</p>
                </div>
                <Switch checked={!!member.canAddStaff} onCheckedChange={() => handleToggleCanAddStaff(member)} />
              </div>
            )}
            <div className="flex items-center justify-between gap-4 p-3.5 bg-secondary/50 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground flex items-center gap-2">
                  {member.status === 'aktiv' ? <ShieldCheck className="h-4 w-4 ic-green" /> : <ShieldOff className="h-4 w-4 ic-amber" />}
                  {t('detailPage.permissions.accountStatusLabel')}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('detailPage.permissions.accountStatusHint')}</p>
              </div>
              <Switch checked={member.status === 'aktiv'} onCheckedChange={() => handleToggleStatus(member)} />
            </div>
          </CardContent>
        </Card>

        {/* Public website visibility — replaces Hypocrates-Web's old
            hardcoded 17-person placeholder roster (src/lib/staff.ts) with
            real staff records; only members switched on here, and only
            their name/role/specialization/avatar/bio, ever reach the
            public /team page. */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Globe className="h-4 w-4 text-accent" />{t('website.sectionTitle')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3.5 bg-secondary/50 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t('website.showLabel')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('website.showHint')}</p>
              </div>
              <Switch checked={!!member.showOnWebsite} disabled={savingWebsiteToggle} onCheckedChange={() => handleToggleShowOnWebsite(member)} />
            </div>
            {member.showOnWebsite && (
              <div className="space-y-2">
                <FieldLabel>{t('website.bioLabel')}</FieldLabel>
                <Textarea
                  value={websiteBioDraft}
                  onChange={(e) => setWebsiteBioDraft(e.target.value)}
                  placeholder={t('website.bioPlaceholder')}
                  rows={3}
                />
                <Button onClick={handleSaveWebsiteBio} disabled={savingWebsiteBio} size="sm" className="bg-accent hover:bg-accent/90 gap-2">
                  <Save className="h-3.5 w-3.5" />
                  {t('website.saveBio')}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Commission */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2"><Percent className="h-4 w-4 text-accent" />{t('detailPage.sections.commission')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4 p-3.5 bg-secondary/50 rounded-xl">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{t('commission.enableLabel')}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{t('commission.enableHint')}</p>
              </div>
              <Switch checked={!!member.commissionEnabled} disabled={savingCommissionToggle} onCheckedChange={handleToggleCommission} />
            </div>

            {member.commissionEnabled && (
              <div className="space-y-4 pt-1">
                <Field>
                  <FieldLabel>{t('commission.rateTypeLabel')}</FieldLabel>
                  <Select value={commissionRateType} onValueChange={(v) => setCommissionRateType(v as 'flat' | 'per_service')}>
                    <SelectTrigger className="max-w-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="flat">{t('commission.rateTypeFlat')}</SelectItem>
                      <SelectItem value="per_service">{t('commission.rateTypePerService')}</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {commissionRateType === 'flat' ? (
                  <div className="flex items-end gap-3">
                    <Field className="max-w-[10rem]">
                      <FieldLabel>{t('commission.flatRateLabel')}</FieldLabel>
                      <div className="relative">
                        <Input type="number" min={0} max={100} step={0.5} value={commissionRate}
                          onChange={(e) => setCommissionRate(e.target.value)} className="pr-7" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">%</span>
                      </div>
                    </Field>
                    <Button onClick={handleSaveCommissionRate} disabled={savingCommissionRate} size="sm" className="bg-accent hover:bg-accent/90">
                      {savingCommissionRate ? t('saving') : t('save')}
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {commissionRateType !== (member.commissionRateType || 'flat') && (
                      <Button onClick={handleSaveCommissionRate} disabled={savingCommissionRate} size="sm" variant="outline">
                        {t('commission.switchToPerService')}
                      </Button>
                    )}
                    {loadingServiceRates ? (
                      <p className="text-sm text-muted-foreground">{t('loading')}</p>
                    ) : services.length === 0 ? (
                      <p className="text-sm text-muted-foreground">{t('commission.noServices')}</p>
                    ) : (
                      <>
                        <div className="rounded-xl border border-border divide-y divide-border overflow-hidden">
                          {services.map((s) => (
                            <div key={s.id} className="flex items-center justify-between gap-3 px-3.5 py-2.5">
                              <p className="text-sm text-foreground truncate">{s.name}</p>
                              <div className="relative shrink-0 w-24">
                                <Input
                                  type="number" min={0} max={100} step={0.5}
                                  value={serviceRates[s.id] || ''}
                                  onChange={(e) => setServiceRates(r => ({ ...r, [s.id]: e.target.value }))}
                                  placeholder="0"
                                  className="pr-7 h-8 text-sm"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">%</span>
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button onClick={handleSaveServiceRates} disabled={savingServiceRates} size="sm" className="bg-accent hover:bg-accent/90">
                          {savingServiceRates ? t('saving') : t('commission.saveRates')}
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger zone */}
        <Card className="border border-destructive/30 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base text-destructive">{t('detailPage.sections.dangerZone')}</CardTitle>
            <CardDescription>{t('detailPage.dangerZoneHint')}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="destructive" onClick={() => setIsDeleteOpen(true)} className="gap-2">
              <Trash2 className="h-4 w-4" />
              {t('menu.deleteForever')}
            </Button>
          </CardContent>
        </Card>

      </div>

      {/* Delete confirmation */}
      <Dialog open={isDeleteOpen} onOpenChange={(v) => { if (!deleting) setIsDeleteOpen(v) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              {t('deleteDialog.title')}
            </DialogTitle>
            <DialogDescription className="space-y-2 pt-1">
              <span className="block">
                {t('deleteDialog.description')} <strong className="text-primary">{member.name}</strong>.
              </span>
              <span className="block text-destructive font-medium">{t('deleteDialog.warning')}</span>
              <span className="block text-sm text-muted-foreground">
                {t('deleteDialog.alternativeHint')} <strong>{t('menu.deactivate')}</strong>.
              </span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-2 gap-2">
            <Button variant="outline" onClick={() => setIsDeleteOpen(false)} disabled={deleting}>{t('cancel')}</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? t('deleteDialog.deleting') : t('menu.deleteForever')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
