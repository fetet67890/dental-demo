"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { useAuth } from '@core/context/auth-context'
import { useClinicSettings } from '@core/context/clinic-settings-context'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@core/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Spinner } from '@core/components/ui/spinner'
import { Footer } from '@core/components/layout/footer'
import { Eye, EyeOff, Mail, Lock, ShieldCheck } from 'lucide-react'

// Dev-only convenience — hidden in a normal production build. Matches the
// seed data in Hypocrates-Api/database/full-schema-and-seed.sql exactly.
// These buttons put a real account's password one click away on the public
// login page, so the second condition is an explicit, opt-in-only escape
// hatch (NOT set in .env.docker.example, only in docker-compose.yml here)
// for local Docker "does the real production build work" testing — it must
// never be set on an actual deployed/internet-facing instance.
//
// NEXT_PUBLIC_DEMO_MODE also enables this panel — the sales demo build (see
// lib/demo/mock-client.ts) has no real backend at all, so these are the
// *only* way in, not a convenience shortcut alongside a real login. The
// credentials below happen to be identical either way (same emails/
// passwords the mock client's DEMO_USERS checks against), so this list
// doubles as the credential source for both modes without duplicating it.
const isDev = process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN === 'true' || process.env.NEXT_PUBLIC_DEMO_MODE === 'true'
const DEMO_ACCOUNTS = [
  { label: 'Admin',     email: 'admin@hypocrates.local',      password: 'Admin123!' },
  { label: 'Doktor',    email: 'doktor@hypocrates.local',     password: 'Doktor123!' },
  { label: 'Doktor 2',  email: 'doktor2@hypocrates.local',    password: 'Doktor2123!' },
  { label: 'Recepsion', email: 'recepsion@hypocrates.local',  password: 'Recepsion123!' },
]

export default function LoginPage() {
  const t = useTranslations('login')
  const { login, verifyMfa, isLoading } = useAuth()
  const { logoUrl } = useClinicSettings()
  const logoSrc = logoUrl || '/logo.png'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const [mfaStep, setMfaStep] = useState(false)
  const [preAuthToken, setPreAuthToken] = useState('')
  const [mfaCode, setMfaCode] = useState('')

  // No navigation call here on success — setUser() inside login()/verifyMfa()
  // is all it takes. (auth)/layout.tsx wrapping this page watches that same
  // user state and owns the redirect + the branded transition screen for it;
  // see its own comment for why that has to live there and not here.
  const attemptLogin = async (loginEmail: string, loginPassword: string) => {
    setError('')
    const result = await login(loginEmail, loginPassword)

    if (result.mfaRequired && result.preAuthToken) {
      setPreAuthToken(result.preAuthToken)
      setMfaStep(true)
      return
    }

    if (!result.success) {
      setError(result.error || t('genericError'))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError(t('fillAllFields'))
      return
    }
    await attemptLogin(email, password)
  }

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    await attemptLogin(demoEmail, demoPassword)
  }

  const handleMfaSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!mfaCode || mfaCode.length !== 6) {
      setError(t('invalidCode'))
      return
    }
    const result = await verifyMfa(preAuthToken, mfaCode)
    if (!result.success) {
      setError(result.error || t('wrongCode'))
    }
  }

  return (
    <>
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
                    if (img.src !== window.location.origin + '/logo.png') {
                      img.src = '/logo.png'
                    }
                  }}
                />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-primary">
                  {mfaStep ? t('mfaTitle') : t('title')}
                </CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  {mfaStep ? t('mfaSubtitle') : t('subtitle')}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              {mfaStep ? (
              <form onSubmit={handleMfaSubmit} className="space-y-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="mfaCode">{t('verificationCode')}</FieldLabel>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        id="mfaCode"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        placeholder="123456"
                        value={mfaCode}
                        onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="pl-10 h-12 bg-secondary/50 border-0 focus-visible:ring-accent tracking-[0.3em] text-center font-mono"
                        autoFocus
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
                      {t('verifying')}
                    </span>
                  ) : (
                    t('verify')
                  )}
                </Button>
                <button
                  type="button"
                  onClick={() => { setMfaStep(false); setMfaCode(''); setError(''); setPreAuthToken('') }}
                  className="w-full text-sm text-muted-foreground hover:text-primary transition-colors"
                >
                  {t('backToLogin')}
                </button>
              </form>
              ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="email">{t('email')}</FieldLabel>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-10" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="email@shembull.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-10 h-12 bg-secondary/50 border-0 focus-visible:ring-accent"
                      />
                    </div>
                  </Field>
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
                      {t('signingIn')}
                    </span>
                  ) : (
                    t('signIn')
                  )}
                </Button>
              </form>
              )}

              {!mfaStep && isDev && (
                <div className="mt-6 pt-6 border-t border-border/60">
                  <p className="text-xs text-muted-foreground text-center mb-3">{t('demoQuickLogin')}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DEMO_ACCOUNTS.map((acc) => (
                      <Button
                        key={acc.email}
                        type="button"
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        disabled={isLoading}
                        onClick={() => handleQuickLogin(acc.email, acc.password)}
                      >
                        {acc.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Footer />
      </div>
    </>
  )
}
