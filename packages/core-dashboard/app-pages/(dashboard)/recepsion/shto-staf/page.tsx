"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useData } from '@core/context/data-context'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { KeyRound, Eye, EyeOff, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { UserRole } from '@core/types'

const blank = {
  name: '',
  email: '',
  phone: '',
  role: '' as UserRole | '',
  specialization: '',
  status: 'aktiv' as 'aktiv' | 'joaktiv',
  password: '',
  confirmPassword: '',
}

export default function RecepsionShtoStaf() {
  const t = useTranslations('recepsion-shto-staf')
  const { addStaff } = useData()
  const [form, setForm]           = useState(blank)
  const [showPw, setShowPw]       = useState(false)
  const [showCnf, setShowCnf]     = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!form.name) { toast.error('Emri është i detyrueshëm'); return }
    if (!form.phone) { toast.error('Telefoni është i detyrueshëm'); return }
    if (form.password && form.password.length < 6) { toast.error('Fjalëkalimi duhet të ketë të paktën 6 karaktere'); return }
    if (form.password && form.password !== form.confirmPassword) { toast.error('Fjalëkalimet nuk përputhen'); return }

    setSubmitting(true)
    try {
      await addStaff({
        name:           form.name,
        email:          form.email,
        phone:          form.phone,
        role:           form.role as UserRole,
        specialization: form.specialization,
        status:         form.status,
        password:       form.password,
      })
      toast.success(`Llogaria u krijua. ${form.name} mund të hyjë tani.`)
      setForm(blank)
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Ndodhi një gabim')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Topbar title={t('title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8 max-w-lg">
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-accent" />
              {t('newMember')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <FieldGroup className="gap-4">
              <Field>
                <FieldLabel>{t('nameLabel')}</FieldLabel>
                <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder={t('namePlaceholder')} />
              </Field>
              <Field>
                <FieldLabel>{t('emailLabel')}</FieldLabel>
                <Input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@klinika.com" />
              </Field>
              <Field>
                <FieldLabel>{t('phoneLabel')}</FieldLabel>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+383 44 123 456" />
              </Field>
              <Field>
                <FieldLabel>{t('roleLabel')}</FieldLabel>
                <Select value={form.role} onValueChange={v => setForm({ ...form, role: v as UserRole })}>
                  <SelectTrigger><SelectValue placeholder={t('rolePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="mjek">{t('roleMjek')}</SelectItem>
                    <SelectItem value="recepsion">{t('roleRecepsion')}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {form.role === 'mjek' && (
                <Field>
                  <FieldLabel>{t('specializationLabel')}</FieldLabel>
                  <Input value={form.specialization} onChange={e => setForm({ ...form, specialization: e.target.value })} placeholder={t('specializationPlaceholder')} />
                </Field>
              )}
              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-2">
                  <KeyRound className="h-4 w-4 text-accent" />
                  {t('loginCredentials')}
                </p>
                <div className="space-y-3">
                  <Field>
                    <FieldLabel>{t('passwordLabel')}</FieldLabel>
                    <div className="relative">
                      <Input type={showPw ? 'text' : 'password'} value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder={t('passwordPlaceholder')} className="pr-10" />
                      <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                  <Field>
                    <FieldLabel>{t('confirmPasswordLabel')}</FieldLabel>
                    <div className="relative">
                      <Input type={showCnf ? 'text' : 'password'} value={form.confirmPassword} onChange={e => setForm({ ...form, confirmPassword: e.target.value })} placeholder={t('confirmPasswordPlaceholder')} className="pr-10" />
                      <button type="button" onClick={() => setShowCnf(!showCnf)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary">
                        {showCnf ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </Field>
                </div>
              </div>
              <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-accent hover:bg-accent/90 mt-2">
                {submitting ? t('creating') : t('createAccount')}
              </Button>
            </FieldGroup>
          </CardContent>
        </Card>
      </div>
    </>
  )
}
