"use client"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import * as authApi from '@core/lib/api/auth'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@core/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Spinner } from '@core/components/ui/spinner'
import { Footer } from '@core/components/layout/footer'
import { Eye, EyeOff, Lock, ShieldAlert } from 'lucide-react'

type Invite = { email: string; name: string }

// The staff/admin counterpart of Hypocrates-Web's patient /activate page —
// same shape, different table (users, not patient_portal_accounts) and
// different destination (this Dashboard, not the public site). First real
// visitor: whoever Fleet just provisioned a clinic for, following the
// invite link its deploy job printed instead of ever being shown a
// generated password directly.
export function ActivateForm() {
  const t = useTranslations('activate')
  const { acceptInvite, isLoading } = useAuth()
  const { logoUrl } = useClinicSettings()
  const logoSrc = logoUrl || '/logo.png'
  const token = useSearchParams().get('token')

  const [checking, setChecking] = useState(true)
  const [invite, setInvite] = useState<Invite | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) {
      setChecking(false)
      return
    }
    authApi
      .getInvite(token)
      .then(setInvite)
      .catch(() => setInvite(null))
      .finally(() => setChecking(false))
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError(t('passwordTooShort'))
      return
    }
    if (password !== confirmPassword) {
      setError(t('passwordMismatch'))
      return
    }
    const result = await acceptInvite(token!, password)
    if (!result.success) {
      setError(result.error || t('genericError'))
    }
    // No navigation call on success — same pattern as hyrje/page.tsx: setUser()
    // inside acceptInvite() is all it takes, (auth)/layout.tsx owns the redirect.
  }

  const invalid = !checking && (!token || !invite)

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <div className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-card">
          <CardHeader className="space-y-4 text-center pb-2">
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt="Hypocrates Logo"
                className="h-16 w-auto max-w-[200px] object-contain"
                onError={(e) => {
                  const img = e.currentTarget
                  if (img.src !== window.location.origin + '/logo.png') img.src = '/logo.png'
                }}
              />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-primary">
                {invalid ? t('invalidTitle') : t('title')}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                {invalid ? t('invalidSubtitle') : t('subtitle')}
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {checking ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
                <Spinner className="h-4 w-4" />
                {t('checking')}
              </div>
            ) : invalid ? (
              <div className="flex justify-center py-4 text-destructive">
                <ShieldAlert className="h-10 w-10" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="password">{t('password')}</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        id="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="pl-10 pr-10 h-12 bg-secondary/50 border-0 focus-visible:ring-accent"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirmPassword">{t('confirmPassword')}</FieldLabel>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="⬢⬢⬢⬢⬢⬢⬢⬢"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="pl-10 h-12 bg-secondary/50 border-0 focus-visible:ring-accent"
                      />
                    </div>
                  </Field>
                </FieldGroup>

                {error && (
                  <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-xl text-center">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-12 bg-accent hover:bg-accent/90 text-white font-medium rounded-xl"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Spinner className="h-4 w-4" />
                      {t('activating')}
                    </span>
                  ) : (
                    t('activate')
                  )}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
      <Footer />
    </div>
  )
}
