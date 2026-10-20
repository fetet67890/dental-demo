"use client"

import { useState } from 'react'
import { useTranslations } from 'next-intl'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@core/components/ui/dropdown-menu'
import { MoreHorizontal, Eye, CreditCard, Receipt, Wallet, TrendingUp, Printer } from 'lucide-react'
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { toast } from 'sonner'
import { Invoice, Payment } from '@core/types'
import { fmtDate, cn } from '@core/lib/utils'
import { fmtLEK, fmtEUR } from '@core/lib/currency'
import { CurrencyInput, toStoredLek } from '@core/components/ui/currency-input'
import { DualPrice } from '@core/components/ui/dual-price'
import { StatCard } from '@core/components/ui/stat-card'
import { openInvoicePdf } from '@core/lib/api/invoices'
import { InstallmentPlanPanel } from '@core/components/invoice/installment-plan-panel'

export function InvoicesSection() {
  const t = useTranslations('admin-faturat')
  const { invoices, addPayment, refreshInvoices } = useData()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: '',
    method: 'cash' as Payment['method'],
    notes: '',
  })
  const [paymentCurrency, setPaymentCurrency] = useState<"LEK" | "EUR">("LEK")
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const pendingPayments = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0)
  const paidInvoices = invoices.filter((inv) => inv.status === 'paguar').length
  const unpaidInvoices = invoices.filter((inv) => inv.status === 'papaguar').length

  const handlePayment = async () => {
    if (!selectedInvoice) return
    const e: Record<string, string> = {}
    const amount = toStoredLek(paymentData.amount, paymentCurrency)
    if (amount > selectedInvoice.remainingAmount) e.amount = t('validation.amountExceedsDebt')
    if (Object.keys(e).length > 0) {
      setPaymentErrors(e)
      toast.error('Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.')
      return
    }

    try {
      await addPayment(selectedInvoice.id, {
        amount,
        method: paymentData.method,
        date: new Date().toISOString().split('T')[0],
        notes: paymentData.notes,
      })
      toast.success('Pagesa u regjistrua me sukses')
      setIsPaymentDialogOpen(false)
      setPaymentData({ amount: '', method: 'cash', notes: '' })
      setPaymentCurrency("LEK")
      setPaymentErrors({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë regjistrimit të pagesës')
    }
  }

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentData({ amount: invoice.remainingAmount.toString(), method: 'cash', notes: '' })
    setIsPaymentDialogOpen(true)
  }

  const openDetailDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setIsDetailDialogOpen(true)
  }

  const openReceipt = async (invoice: Invoice) => {
    try {
      await openInvoicePdf(invoice.id)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë krijimit të PDF-së')
    }
  }

  return (
    <PageLoadingGuard stats={4} cols={7} rows={8}>
      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
        <StatCard
          title={t('stats.totalRevenue')}
          value={fmtLEK(totalRevenue)}
          description={fmtEUR(totalRevenue)}
          icon={Wallet}
          color="emerald"
        />
        <StatCard
          title={t('stats.pendingPayments')}
          value={fmtLEK(pendingPayments)}
          description={fmtEUR(pendingPayments)}
          icon={TrendingUp}
          color="amber"
        />
        <StatCard
          title={t('stats.paidInvoices')}
          value={paidInvoices}
          icon={Receipt}
          color="emerald"
        />
        <StatCard
          title={t('stats.unpaidInvoices')}
          value={unpaidInvoices}
          icon={CreditCard}
          color="rose"
        />
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <SearchInput
          placeholder={t('searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          containerClassName="flex-1"
        />
      </div>

      {/* Invoices Table */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t('table.invoice')}</TableHead>
                  <TableHead>{t('table.patient')}</TableHead>
                  <TableHead className="hidden md:table-cell">{t('table.amount')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('table.paid')}</TableHead>
                  <TableHead className="hidden lg:table-cell">{t('table.debt')}</TableHead>
                  <TableHead>{t('table.status')}</TableHead>
                  <TableHead className="text-right">{t('table.actions')}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredInvoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">{invoice.id}</TableCell>
                    <TableCell>{invoice.patientName}</TableCell>
                    <TableCell className="hidden md:table-cell"><DualPrice amount={invoice.totalAmount} size="sm" /></TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <DualPrice amount={invoice.paidAmount} size="sm" className="ic-green" />
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      <DualPrice amount={invoice.remainingAmount} size="sm" className="ic-red" />
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={invoice.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => openReceipt(invoice)}
                        >
                          <Printer className="h-4 w-4 mr-1.5" />
                          {t('print')}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetailDialog(invoice)}>
                              <Eye className="h-4 w-4 mr-2" />
                              {t('menu.viewDetails')}
                            </DropdownMenuItem>
                            {invoice.status !== 'paguar' && (
                              <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
                                <CreditCard className="h-4 w-4 mr-2" />
                                {t('menu.registerPayment')}
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredInvoices.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {t('table.empty')}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={(o) => { setIsPaymentDialogOpen(o); if (!o) setPaymentErrors({}) }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('paymentDialog.title')}</DialogTitle>
            <DialogDescription>
              {t('paymentDialog.description', { id: selectedInvoice?.id ?? '', amount: selectedInvoice ? fmtLEK(selectedInvoice.remainingAmount) : '' })}
            </DialogDescription>
          </DialogHeader>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel>{t('paymentDialog.amount')}</FieldLabel>
              <CurrencyInput
                value={paymentData.amount}
                onChange={(v) => { setPaymentData({ ...paymentData, amount: v }); if (paymentErrors.amount) setPaymentErrors(p => ({ ...p, amount: '' })) }}
                currency={paymentCurrency}
                onCurrencyChange={(c) => { setPaymentCurrency(c); setPaymentData(prev => ({ ...prev, amount: '' })) }}
              />
              {paymentErrors.amount && <p className="text-xs text-destructive mt-1">{paymentErrors.amount}</p>}
            </Field>
            <Field>
              <FieldLabel>{t('paymentDialog.method')}</FieldLabel>
              <Select
                value={paymentData.method}
                onValueChange={(value) =>
                  setPaymentData({ ...paymentData, method: value as Payment['method'] })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">{t('paymentMethods.cash')}</SelectItem>
                  <SelectItem value="karte">{t('paymentMethods.karte')}</SelectItem>
                  <SelectItem value="transfer">{t('paymentMethods.transfer')}</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel>{t('paymentDialog.notes')}</FieldLabel>
              <Input
                value={paymentData.notes}
                onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                placeholder={t('paymentDialog.notesPlaceholder')}
              />
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              {t('paymentDialog.cancel')}
            </Button>
            <Button onClick={handlePayment} className="bg-accent hover:bg-accent/90">
              {t('paymentDialog.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detail Dialog */}
      <Dialog open={isDetailDialogOpen} onOpenChange={setIsDetailDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('detailDialog.title', { id: selectedInvoice?.id ?? '' })}</DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.patient')}</p>
                  <p className="font-medium">{selectedInvoice.patientName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">{t('detailDialog.date')}</p>
                  <p className="font-medium">{fmtDate(selectedInvoice.createdAt)}</p>
                </div>
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-medium mb-2">{t('detailDialog.treatments')}</p>
                <ul className="list-disc list-inside text-sm text-muted-foreground">
                  {selectedInvoice.treatments.map((tr, i) => (
                    <li key={i}>{tr}</li>
                  ))}
                </ul>
              </div>

              <div className="grid grid-cols-3 gap-4 border-t pt-4">
                <div className="text-center p-3 bg-secondary rounded-xl">
                  <p className="text-sm text-muted-foreground">{t('detailDialog.total')}</p>
                  <DualPrice amount={selectedInvoice.totalAmount} />
                </div>
                <div className="text-center p-3 ibg-green rounded-xl">
                  <p className="text-sm ic-green">{t('detailDialog.paid')}</p>
                  <DualPrice amount={selectedInvoice.paidAmount} className="ic-green" />
                </div>
                <div className="text-center p-3 ibg-red rounded-xl">
                  <p className="text-sm ic-red">{t('detailDialog.debt')}</p>
                  <DualPrice amount={selectedInvoice.remainingAmount} className="ic-red" />
                </div>
              </div>

              {selectedInvoice.payments.length > 0 && (
                <div className="border-t pt-4">
                  <p className="text-sm font-medium mb-2">{t('detailDialog.paymentHistory')}</p>
                  <div className="space-y-2">
                    {selectedInvoice.payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex justify-between items-center p-2 bg-secondary/50 rounded-lg text-sm"
                      >
                        <div>
                          <DualPrice amount={payment.amount} size="sm" />
                          <span className="text-muted-foreground ml-2">
                            ({payment.method === 'cash' ? t('paymentMethodsShort.cash') : payment.method === 'karte' ? t('paymentMethodsShort.karte') : t('paymentMethodsShort.transfer')})
                          </span>
                        </div>
                        <span className="text-muted-foreground">{fmtDate(payment.date)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <InstallmentPlanPanel
                invoiceId={selectedInvoice.id}
                remainingAmount={selectedInvoice.remainingAmount}
                onChanged={refreshInvoices}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>
              {t('detailDialog.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLoadingGuard>
  )
}
