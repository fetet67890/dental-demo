"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Field, FieldLabel } from "@core/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import { DualPrice } from "@core/components/ui/dual-price"
import { CalendarClock, Trash2, CheckCircle2, Loader2, ListChecks } from "lucide-react"
import { toast } from "sonner"
import { cn, fmtDate } from "@core/lib/utils"
import {
  getInstallments, createInstallmentPlan, payInstallment, deleteInstallmentPlan,
  type Installment,
} from "@core/lib/api/installments"

interface Props {
  invoiceId: string
  remainingAmount: number
  onChanged?: () => void
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

export function InstallmentPlanPanel({ invoiceId, remainingAmount, onChanged }: Props) {
  const t = useTranslations('installment-plan-panel')
  const [installments, setInstallments] = useState<Installment[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [payingId, setPayingId] = useState<string | null>(null)
  const [count, setCount] = useState("3")
  const [firstDueDate, setFirstDueDate] = useState(localDateStr())
  const [method, setMethod] = useState<"cash" | "karte" | "transfer">("cash")

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInstallments(invoiceId)
      setInstallments(data)
    } catch {
      toast.error("Gabim gjatë ngarkimit të planit të këstesh")
    } finally {
      setLoading(false)
    }
  }, [invoiceId])

  useEffect(() => { load() }, [load])

  const handleCreatePlan = async () => {
    const n = parseInt(count, 10)
    if (!n || n < 2 || n > 12) { toast.error("Numri i këstesh duhet të jetë 2-12"); return }
    setCreating(true)
    try {
      await createInstallmentPlan({ invoiceId, count: n, firstDueDate })
      toast.success("Plani i këstesh u krijua")
      load()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë krijimit")
    } finally {
      setCreating(false)
    }
  }

  const handlePay = async (installment: Installment) => {
    setPayingId(installment.id)
    try {
      await payInstallment(installment.id, method)
      toast.success(`Kësti #${installment.installmentNumber} u pagua`)
      load()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë pagesës")
    } finally {
      setPayingId(null)
    }
  }

  const handleDeletePlan = async () => {
    try {
      await deleteInstallmentPlan(invoiceId)
      toast.success("Plani u fshi")
      load()
      onChanged?.()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë fshirjes")
    }
  }

  if (loading) {
    return <div className="flex justify-center py-4"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
  }

  return (
    <div className="border-t pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium flex items-center gap-1.5">
          <ListChecks className="h-4 w-4 text-accent" />
          {t('title')}
        </p>
        {installments.length > 0 && installments.every((i) => i.status !== "paguar") && (
          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive gap-1.5" onClick={handleDeletePlan}>
            <Trash2 className="h-3.5 w-3.5" />{t('deletePlan')}
          </Button>
        )}
      </div>

      {installments.length === 0 ? (
        remainingAmount > 0 ? (
          <div className="flex flex-wrap items-end gap-2 p-3 bg-secondary/40 rounded-xl">
            <Field className="w-24">
              <FieldLabel className="text-xs">{t('installmentCount')}</FieldLabel>
              <Input type="number" min={2} max={12} value={count} onChange={(e) => setCount(e.target.value)} />
            </Field>
            <Field className="w-40">
              <FieldLabel className="text-xs">{t('firstInstallment')}</FieldLabel>
              <Input type="date" value={firstDueDate} onChange={(e) => setFirstDueDate(e.target.value)} />
            </Field>
            <Button size="sm" onClick={handleCreatePlan} disabled={creating} className="gap-1.5 bg-accent hover:bg-accent/90 text-accent-foreground">
              {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CalendarClock className="h-3.5 w-3.5" />}
              {t('createPlan')}
            </Button>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">{t('noOutstandingAmount')}</p>
        )
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">{t('paymentMethod')}</span>
            <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
              <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">{t('methodCash')}</SelectItem>
                <SelectItem value="karte">{t('methodCard')}</SelectItem>
                <SelectItem value="transfer">{t('methodTransfer')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {installments.map((inst) => (
            <div key={inst.id} className="flex items-center justify-between p-2.5 bg-secondary/40 rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <span className="font-medium">#{inst.installmentNumber}</span>
                <DualPrice amount={inst.amount} size="sm" />
                <span className="text-xs text-muted-foreground">{t('due')}: {fmtDate(inst.dueDate)}</span>
              </div>
              {inst.status === "paguar" ? (
                <span className="flex items-center gap-1 text-xs ic-green font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" />{t('paid')}
                </span>
              ) : (
                <Button
                  size="sm" variant="outline"
                  className={cn(
                    "h-7 text-xs",
                    new Date(inst.dueDate) < new Date() && "ic-red border-[var(--p-red)]/30"
                  )}
                  disabled={payingId === inst.id}
                  onClick={() => handlePay(inst)}
                >
                  {payingId === inst.id ? <Loader2 className="h-3 w-3 animate-spin" /> : (new Date(inst.dueDate) < new Date() ? t('overduePay') : t('markPaid'))}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
