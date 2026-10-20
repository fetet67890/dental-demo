"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@core/components/ui/dialog'
import { Button } from '@core/components/ui/button'
import { Input } from '@core/components/ui/input'
import { FieldGroup, Field, FieldLabel } from '@core/components/ui/field'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@core/components/ui/select'
import { useData } from '@core/context/data-context'
import { toast } from 'sonner'
import { toastError } from '@core/lib/toast-error'
import { cn } from '@core/lib/utils'
import { CurrencyInput } from '@core/components/ui/currency-input'
import { LEK_PER_EUR } from '@core/lib/currency'

const EMPTY = { name: '', category: '', description: '', duration: '30' }

interface Props { open: boolean; onClose: () => void }

export function AddServiceDialog({ open, onClose }: Props) {
  const t = useTranslations('add-service-dialog')
  const { addService } = useData()
  const [form, setForm] = useState(EMPTY)
  const [priceInput, setPriceInput] = useState('')
  const [priceCurrency, setPriceCurrency] = useState<'LEK' | 'EUR'>('EUR')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof EMPTY, v: string) => {
    setForm(f => ({ ...f, [k]: v }))
    if (errors[k]) setErrors(e => ({ ...e, [k]: '' }))
  }

  const handleClose = () => {
    setForm(EMPTY); setPriceInput(''); setPriceCurrency('EUR')
    setErrors({}); onClose()
  }

  const handleSubmit = async () => {
    const rawPrice = parseFloat(priceInput) || 0
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.nameRequired')
    if (Object.keys(e).length) { setErrors(e); toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.'); return }

    const priceInLek = priceCurrency === 'EUR' ? Math.round(rawPrice * LEK_PER_EUR) : rawPrice
    setLoading(true)
    try {
      await addService({
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category.trim(),
        price: priceInLek,
        duration: parseInt(form.duration) || 30,
        isActive: true,
      })
      toast.success('Shërbimi u shtua me sukses')
      handleClose()
    } catch (err) {
      toastError(err, 'Gabim gjatë shtimit të shërbimit')
    } finally { setLoading(false) }
  }

  return (
    <Dialog open={open} onOpenChange={o => !o && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader><DialogTitle>{t('title')}</DialogTitle></DialogHeader>
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel>{t('serviceName')}</FieldLabel>
            <Input value={form.name} onChange={e => set('name', e.target.value)}
              className={cn(errors.name && 'border-destructive focus-visible:ring-destructive/30')} />
            {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel>{t('price')}</FieldLabel>
              <CurrencyInput
                value={priceInput}
                onChange={v => { setPriceInput(v); if (errors.price) setErrors(e => ({ ...e, price: '' })) }}
                currency={priceCurrency}
                onCurrencyChange={c => { setPriceCurrency(c); setPriceInput('') }}
              />
              {errors.price && <p className="text-xs text-destructive mt-1">{errors.price}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('duration')}</FieldLabel>
              <Select value={form.duration} onValueChange={v => set('duration', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['15','20','30','45','60','90','120'].map(d => (
                    <SelectItem key={d} value={d}>{d} min</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel>{t('category')}</FieldLabel>
            <Input value={form.category} onChange={e => set('category', e.target.value)} placeholder={t('categoryPlaceholder')} />
          </Field>
          <Field>
            <FieldLabel>{t('description')}</FieldLabel>
            <Input value={form.description} onChange={e => set('description', e.target.value)} placeholder={t('descriptionPlaceholder')} />
          </Field>
        </FieldGroup>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>{t('cancel')}</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-accent hover:bg-accent/90">
            {loading ? t('adding') : t('addService')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
