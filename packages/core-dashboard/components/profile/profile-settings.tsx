"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@core/context/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { User, Lock, Shield, Camera, Loader2, Trash2, ShieldCheck, ShieldOff, LogOut, Compass, Rocket } from "lucide-react"
import { toast } from "sonner"
import { changePassword, setupMfa, verifyMfaSetup, requestMfaDisable, disableMfa } from "@core/lib/api/auth"
import { cn } from "@core/lib/utils"
import { useTour } from "@core/context/tour-context"
import { useSetupWizard } from "@core/context/setup-wizard-context"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || ''

export function ProfileSettings() {
  const t = useTranslations('profile-settings')
  const { user, updateProfile, updateAvatar, removeAvatar, refreshUser, logout } = useAuth()
  const { start: startTour } = useTour()
  const { open: openSetupWizard } = useSetupWizard()

  const roleLabels: Record<string, string> = {
    admin: t('roles.admin'),
    mjek: t('roles.mjek'),
    recepsion: t('roles.recepsion'),
  }

  const handleLogout = () => {
    logout()
    window.location.replace('/hyrje')
  }
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const [isRemoveAvatarOpen, setIsRemoveAvatarOpen] = useState(false)
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false)

  const [profileData, setProfileData] = useState({
    name: user?.name || "",
    email: user?.email || "",
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({})
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({})
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  // Email-code MFA (not TOTP/QR — see auth.controller.js). `mfaSetupSent`/
  // `mfaDisableSent` hold the masked email once a code's been requested —
  // that's what gates showing the code-entry field (nothing to type in
  // until a code actually exists to check against).
  const [mfaSetupSent, setMfaSetupSent] = useState<{ maskedEmail: string } | null>(null)
  const [mfaCode, setMfaCode] = useState('')
  const [mfaDisableSent, setMfaDisableSent] = useState<{ maskedEmail: string } | null>(null)
  const [mfaDisableCode, setMfaDisableCode] = useState('')
  const [mfaBusy, setMfaBusy] = useState(false)
  const [showMfaDisable, setShowMfaDisable] = useState(false)

  const handleStartMfaSetup = async () => {
    setMfaBusy(true)
    try {
      const data = await setupMfa()
      setMfaSetupSent({ maskedEmail: data.maskedEmail })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë dërgimit të kodit')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleConfirmMfaSetup = async () => {
    if (mfaCode.length !== 6) { toast.error('Vendosni kodin 6-shifror'); return }
    setMfaBusy(true)
    try {
      await verifyMfaSetup(mfaCode)
      toast.success('Autentifikimi dyfaktorësh u aktivizua')
      setMfaSetupSent(null)
      setMfaCode('')
      await refreshUser()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kodi i gabuar')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleCancelMfaSetup = () => {
    setMfaSetupSent(null)
    setMfaCode('')
  }

  const handleRequestMfaDisable = async () => {
    setMfaBusy(true)
    try {
      const data = await requestMfaDisable()
      setMfaDisableSent({ maskedEmail: data.maskedEmail })
      setShowMfaDisable(true)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë dërgimit të kodit')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleCancelMfaDisable = () => {
    setShowMfaDisable(false)
    setMfaDisableSent(null)
    setMfaDisableCode('')
  }

  const handleDisableMfa = async () => {
    if (mfaDisableCode.length !== 6) { toast.error('Vendosni kodin 6-shifror'); return }
    setMfaBusy(true)
    try {
      await disableMfa(mfaDisableCode)
      toast.success('Autentifikimi dyfaktorësh u çaktivizua')
      setShowMfaDisable(false)
      setMfaDisableSent(null)
      setMfaDisableCode('')
      await refreshUser()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kodi i gabuar')
    } finally {
      setMfaBusy(false)
    }
  }

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true)
    try {
      await removeAvatar()
      toast.success("Foto e profilit u hoq me sukses")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë heqjes së fotos")
    } finally {
      setIsRemovingAvatar(false)
      setIsRemoveAvatarOpen(false)
    }
  }

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploadingAvatar(true)
    try {
      await updateAvatar(file)
      toast.success("Foto e profilit u ndryshua me sukses")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ngarkimit të fotos")
    } finally {
      setIsUploadingAvatar(false)
      if (avatarInputRef.current) avatarInputRef.current.value = ""
    }
  }

  const handleSaveProfile = async () => {
    const e: Record<string, string> = {}
    if (!profileData.name.trim()) e.name = t('validation.nameRequired')
    if (!profileData.email.trim()) e.email = t('validation.emailRequired')
    if (Object.keys(e).length > 0) {
      setProfileErrors(e)
      toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.')
      return
    }
    setIsSavingProfile(true)
    try {
      await updateProfile({ name: profileData.name.trim(), email: profileData.email.trim() })
      toast.success("Profili u përditësua me sukses")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ruajtjes")
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handleSavePassword = async () => {
    const e: Record<string, string> = {}
    if (!passwordData.currentPassword) e.currentPassword = t('validation.currentPasswordRequired')
    if (!passwordData.newPassword) e.newPassword = t('validation.newPasswordRequired')
    else if (passwordData.newPassword.length < 6) e.newPassword = t('validation.passwordMinLength')
    if (!passwordData.confirmPassword) e.confirmPassword = t('validation.confirmRequired')
    else if (passwordData.newPassword && passwordData.newPassword !== passwordData.confirmPassword) e.confirmPassword = t('validation.passwordMismatch')
    if (Object.keys(e).length > 0) {
      setPasswordErrors(e)
      toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.')
      return
    }
    setIsSavingPassword(true)
    try {
      await changePassword(passwordData.currentPassword, passwordData.newPassword)
      toast.success("Fjalëkalimi u ndryshua me sukses")
      setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      setPasswordErrors({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ndryshimit të fjalëkalimit")
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Avatar + Role */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Shield className="h-5 w-5 text-accent" />
            {t('systemRole.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            {/* Avatar with camera overlay */}
            <div className="relative shrink-0">
              <div className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-accent to-accent/60 flex items-center justify-center">
                {user?.avatar ? (
                  <img
                    src={user.avatar.startsWith('http') ? user.avatar : `${API_BASE}${user.avatar}`}
                    alt={user.name}
                    className="w-full h-full object-cover bg-muted"
                  />
                ) : (
                  <span className="text-3xl font-bold text-accent-foreground">
                    {user?.name?.charAt(0) || "U"}
                  </span>
                )}
              </div>
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-foreground truncate">{user?.name}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <span className="inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-accent/10 text-accent mt-1">
                {roleLabels[user?.role || ""] || user?.role}
              </span>
              <div className="flex gap-2 mt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-xl text-xs h-8"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={isUploadingAvatar}
                >
                  {isUploadingAvatar ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Camera className="h-3.5 w-3.5 mr-1.5" />}
                  {isUploadingAvatar ? t('avatar.uploading') : t('avatar.changePhoto')}
                </Button>
                {user?.avatar && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs h-8 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setIsRemoveAvatarOpen(true)}
                    disabled={isRemovingAvatar}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    {t('avatar.removePhoto')}
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Remove avatar confirmation */}
          <AlertDialog open={isRemoveAvatarOpen} onOpenChange={setIsRemoveAvatarOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t('avatar.removeDialogTitle')}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t('avatar.removeDialogDescription')}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t('cancel')}</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemoveAvatar}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isRemovingAvatar ? t('avatar.removing') : t('avatar.removePhoto')}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      {/* Personal info */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <User className="h-5 w-5 text-accent" />
            {t('personalInfo.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="profile-name">{t('personalInfo.fullName')}</Label>
            <Input
              id="profile-name"
              value={profileData.name}
              onChange={(e) => { setProfileData({ ...profileData, name: e.target.value }); if (profileErrors.name) setProfileErrors(p => ({ ...p, name: '' })) }}
              placeholder={t('personalInfo.fullNamePlaceholder')}
              className={cn("rounded-xl", profileErrors.name && "border-destructive focus-visible:ring-destructive/30")}
            />
            {profileErrors.name && <p className="text-xs text-destructive mt-1">{profileErrors.name}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="profile-email">{t('personalInfo.email')}</Label>
            <Input
              id="profile-email"
              type="email"
              value={profileData.email}
              onChange={(e) => { setProfileData({ ...profileData, email: e.target.value }); if (profileErrors.email) setProfileErrors(p => ({ ...p, email: '' })) }}
              placeholder="email@klinika.al"
              className={cn("rounded-xl", profileErrors.email && "border-destructive focus-visible:ring-destructive/30")}
            />
            {profileErrors.email && <p className="text-xs text-destructive mt-1">{profileErrors.email}</p>}
          </div>
          <Button
            onClick={handleSaveProfile}
            disabled={isSavingProfile}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
          >
            {isSavingProfile ? t('personalInfo.saving') : t('personalInfo.saveChanges')}
          </Button>
        </CardContent>
      </Card>

      {/* Password */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Lock className="h-5 w-5 text-accent" />
            {t('password.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="current-pw">{t('password.current')}</Label>
            <Input
              id="current-pw"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => { setPasswordData({ ...passwordData, currentPassword: e.target.value }); if (passwordErrors.currentPassword) setPasswordErrors(p => ({ ...p, currentPassword: '' })) }}
              className={cn("rounded-xl", passwordErrors.currentPassword && "border-destructive focus-visible:ring-destructive/30")}
            />
            {passwordErrors.currentPassword && <p className="text-xs text-destructive mt-1">{passwordErrors.currentPassword}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-pw">{t('password.new')}</Label>
            <Input
              id="new-pw"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => { setPasswordData({ ...passwordData, newPassword: e.target.value }); if (passwordErrors.newPassword) setPasswordErrors(p => ({ ...p, newPassword: '' })) }}
              placeholder={t('password.newPlaceholder')}
              className={cn("rounded-xl", passwordErrors.newPassword && "border-destructive focus-visible:ring-destructive/30")}
            />
            {passwordErrors.newPassword && <p className="text-xs text-destructive mt-1">{passwordErrors.newPassword}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm-pw">{t('password.confirm')}</Label>
            <Input
              id="confirm-pw"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => { setPasswordData({ ...passwordData, confirmPassword: e.target.value }); if (passwordErrors.confirmPassword) setPasswordErrors(p => ({ ...p, confirmPassword: '' })) }}
              className={cn("rounded-xl", passwordErrors.confirmPassword && "border-destructive focus-visible:ring-destructive/30")}
            />
            {passwordErrors.confirmPassword && <p className="text-xs text-destructive mt-1">{passwordErrors.confirmPassword}</p>}
          </div>
          <Button
            onClick={handleSavePassword}
            disabled={isSavingPassword}
            variant="outline"
            className="rounded-xl"
          >
            {isSavingPassword ? t('password.changing') : t('password.submit')}
          </Button>
        </CardContent>
      </Card>

      {/* Two-Factor Authentication (email code — see auth.controller.js for
          why this isn't a QR/authenticator-app flow: everyday clinic staff
          overwhelmingly don't have one installed, and requiring that was
          real friction before MFA could even be turned on.) */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-5 w-5 text-accent" />
            {t('mfa.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!user?.mfaEnabled && !mfaSetupSent && (
            <>
              <p className="text-sm text-muted-foreground">
                {t('mfa.intro')}
              </p>
              <Button onClick={handleStartMfaSetup} disabled={mfaBusy} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
                {mfaBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                {t('mfa.enable')}
              </Button>
            </>
          )}

          {mfaSetupSent && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                {t('mfa.codeSentIntro', { email: mfaSetupSent.maskedEmail })}
              </p>
              <div className="space-y-2 max-w-[200px] mx-auto">
                <Label htmlFor="mfa-confirm-code">{t('mfa.confirmCode')}</Label>
                <Input
                  id="mfa-confirm-code"
                  inputMode="numeric"
                  maxLength={6}
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="rounded-xl text-center font-mono tracking-[0.3em]"
                  autoFocus
                />
              </div>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={handleCancelMfaSetup} disabled={mfaBusy} className="rounded-xl">{t('cancel')}</Button>
                <Button variant="ghost" onClick={handleStartMfaSetup} disabled={mfaBusy} className="rounded-xl">{t('mfa.resend')}</Button>
                <Button onClick={handleConfirmMfaSetup} disabled={mfaBusy} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl">
                  {mfaBusy ? t('mfa.confirming') : t('mfa.confirmAndEnable')}
                </Button>
              </div>
            </div>
          )}

          {user?.mfaEnabled && !mfaSetupSent && (
            <>
              <div className="flex items-center gap-2 text-sm ic-green">
                <ShieldCheck className="h-4 w-4" />
                {t('mfa.activeNotice')}
              </div>
              {!showMfaDisable ? (
                <Button variant="outline" onClick={handleRequestMfaDisable} disabled={mfaBusy} className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive">
                  {mfaBusy ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <ShieldOff className="h-4 w-4 mr-2" />}
                  {t('mfa.disable')}
                </Button>
              ) : (
                <div className="space-y-2 max-w-[240px]">
                  <Label htmlFor="mfa-disable-code">
                    {mfaDisableSent ? t('mfa.codeSentIntro', { email: mfaDisableSent.maskedEmail }) : t('mfa.disableCodePrompt')}
                  </Label>
                  <Input
                    id="mfa-disable-code"
                    inputMode="numeric"
                    maxLength={6}
                    value={mfaDisableCode}
                    onChange={(e) => setMfaDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="123456"
                    className="rounded-xl text-center font-mono tracking-[0.3em]"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleCancelMfaDisable} disabled={mfaBusy} className="rounded-xl">{t('cancel')}</Button>
                    <Button variant="ghost" size="sm" onClick={handleRequestMfaDisable} disabled={mfaBusy} className="rounded-xl">{t('mfa.resend')}</Button>
                    <Button size="sm" variant="destructive" onClick={handleDisableMfa} disabled={mfaBusy} className="rounded-xl">
                      {mfaBusy ? t('mfa.disabling') : t('mfa.disableShort')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Guided tour — replays the same per-page walkthrough that auto-runs
          once on first login (see context/tour-context.tsx). Lives here so
          anyone who skipped it, or wants a refresher, doesn't have to hunt
          for the topbar's "?" icon. */}
      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Compass className="h-5 w-5 text-accent" />
            {t('guidedTour.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">{t('guidedTour.description')}</p>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={() => user && startTour(user.role)}
          >
            <Compass className="h-4 w-4 mr-2" />
            {t('guidedTour.button')}
          </Button>
        </CardContent>
      </Card>

      {/* Setup wizard — admin-only (it changes clinic-wide branding/locale
          settings, same permission boundary as Aparenca itself), replays the
          same first-login flow (see context/setup-wizard-context.tsx) for
          anyone who skipped it or wants to redo it. */}
      {user?.role === 'admin' && (
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Rocket className="h-5 w-5 text-accent" />
              {t('setupWizard.title')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t('setupWizard.description')}</p>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={openSetupWizard}
            >
              <Rocket className="h-4 w-4 mr-2" />
              {t('setupWizard.button')}
            </Button>
          </CardContent>
        </Card>
      )}

      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <LogOut className="h-5 w-5" />
            {t('logout.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            onClick={handleLogout}
            className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('logout.button')}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
