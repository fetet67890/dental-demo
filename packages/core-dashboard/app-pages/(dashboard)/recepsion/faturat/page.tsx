"use client"

import { useState, useEffect } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { DualPrice } from "@core/components/ui/dual-price"
import { fmtLEK, fmtEUR, LEK_PER_EUR } from "@core/lib/currency"
import { CurrencyInput, toStoredLek } from "@core/components/ui/currency-input"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { StatusBadge } from "@core/components/ui/status-badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@core/components/ui/dialog"
import { FieldGroup, Field, FieldLabel } from "@core/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@core/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@core/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@core/components/ui/dropdown-menu"
import {
  MoreHorizontal, Eye, CreditCard, Receipt, Wallet,
  TrendingUp, Printer, Plus, Trash2,
} from "lucide-react"
import { Switch } from "@core/components/ui/switch"
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { toast } from "sonner"
import type { Invoice, Payment } from "@core/types"
import { StatCard } from "@core/components/ui/stat-card"
import { openInvoicePdf } from "@core/lib/api/invoices"
import { InstallmentPlanPanel } from "@core/components/invoice/installment-plan-panel"
import { fmtDate } from "@core/lib/utils"

interface LineItem {
  name: string
  qty: number
  price: number
}

export default function RecepsionFaturat() {
  const t = useTranslations('recepsion-faturat')
  const {
    invoices, patients, services, patientServices,
    addPayment, addInvoice, markPatientServiceInvoiced, refreshInvoices,
  } = useData()

  const [searchQuery, setSearchQuery] = useState("")
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isGenerateOpen, setIsGenerateOpen] = useState(false)
  const [paymentData, setPaymentData] = useState({
    amount: "",
    method: "cash" as Payment["method"],
    notes: "",
  })
  const [paymentCurrency, setPaymentCurrency] = useState<"LEK" | "EUR">("LEK")
  const [paymentErrors, setPaymentErrors] = useState<Record<string, string>>({})

  // Generate invoice state
  const [genPatientId, setGenPatientId] = useState("")
  const [lineItems, setLineItems] = useState<LineItem[]>([{ name: "", qty: 1, price: 0 }])
  const [autoLoadedIds, setAutoLoadedIds] = useState<string[]>([])
  const [lineCurrency, setLineCurrency] = useState<"LEK" | "EUR">("LEK")
  const [withTvsh, setWithTvsh] = useState(false)
  const TVSH_RATE = 0.20

  // When patient changes, auto-load uninvoiced patient_services
  useEffect(() => {
    if (!genPatientId) {
      setLineItems([{ name: "", qty: 1, price: 0 }])
      setAutoLoadedIds([])
      return
    }
    const uninvoiced = patientServices.filter(
      ps => ps.patientId === genPatientId && !ps.invoiced
    )
    if (uninvoiced.length > 0) {
      setLineItems(uninvoiced.map(ps => ({
        name: ps.serviceName,
        qty:  ps.quantity,
        price: ps.priceSnapshot,
      })))
      setAutoLoadedIds(uninvoiced.map(ps => ps.id))
    } else {
      setLineItems([{ name: "", qty: 1, price: 0 }])
      setAutoLoadedIds([])
    }
  }, [genPatientId, patientServices])

  const lineTotal = lineItems.reduce((sum, item) => sum + item.qty * item.price, 0)
  const tvshAmount = withTvsh ? Math.round(lineTotal * TVSH_RATE) : 0
  const grandTotal = lineTotal + tvshAmount

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.patientName.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalRevenue = invoices.reduce((sum, inv) => sum + inv.paidAmount, 0)
  const pendingPayments = invoices.reduce((sum, inv) => sum + inv.remainingAmount, 0)
  const paidInvoices = invoices.filter((inv) => inv.status === "paguar").length
  const unpaidInvoices = invoices.filter((inv) => inv.status === "papaguar").length

  const handlePayment = async () => {
    if (!selectedInvoice) return
    const e: Record<string, string> = {}
    const amount = toStoredLek(paymentData.amount, paymentCurrency)
    if (amount > selectedInvoice.remainingAmount) e.amount = "Shuma nuk mund të jetë më e madhe se borxhi"
    if (Object.keys(e).length > 0) {
      setPaymentErrors(e)
      toast.error("Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.")
      return
    }
    try {
      await addPayment(selectedInvoice.id, {
        amount,
        method: paymentData.method,
        date: new Date().toISOString().split("T")[0],
        notes: paymentData.notes,
      })
      toast.success("Pagesa u regjistrua me sukses")
      setIsPaymentDialogOpen(false)
      setPaymentData({ amount: "", method: "cash", notes: "" })
      setPaymentCurrency("LEK")
      setPaymentErrors({})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë regjistrimit")
    }
  }

  const handleGenerateInvoice = async () => {
    if (!genPatientId) {
      toast.error("Zgjidhni pacientin")
      return
    }
    const validItems = lineItems.filter(i => i.name && i.price > 0)
    if (validItems.length === 0) {
      toast.error("Shtoni të paktën një shërbim me çmim")
      return
    }
    const patient = patients.find(p => p.id === genPatientId)
    if (!patient) return

    const totalAmount = validItems.reduce((sum, i) => sum + i.qty * i.price, 0)
    const today = new Date().toISOString().split("T")[0]
    const due = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]

    const netLek = lineCurrency === "EUR" ? Math.round(totalAmount * LEK_PER_EUR) : totalAmount
    const tvshLek = withTvsh ? Math.round(netLek * TVSH_RATE) : 0
    const totalAmountLek = netLek + tvshLek

    const treatmentLines = validItems.map(i => i.qty > 1 ? `${i.name} x${i.qty}` : i.name)
    if (withTvsh) {
      treatmentLines.push(`TVSH 20% (+${tvshLek.toLocaleString()} LEK)`)
    }

    try {
      const created = await addInvoice({
        patientId:       genPatientId,
        patientName:     `${patient.firstName} ${patient.lastName}`,
        treatments:      treatmentLines,
        totalAmount:     totalAmountLek,
        paidAmount:      0,
        remainingAmount: totalAmountLek,
        status:          "papaguar",
        createdAt:       today,
        dueDate:         due,
      })

      // Mark auto-loaded patient services as invoiced, linked to the real
      // generated invoice ID — this is what lets commission calculation
      // later tell whether the revenue behind this service was ever
      // actually collected, not just billed.
      for (const id of autoLoadedIds) {
        await markPatientServiceInvoiced(id, created.id).catch(() => {})
      }

      toast.success("Fatura u gjenerua me sukses")
      setIsGenerateOpen(false)
      setGenPatientId("")
      setLineItems([{ name: "", qty: 1, price: 0 }])
      setAutoLoadedIds([])
      setLineCurrency("LEK")
      setWithTvsh(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë gjenerimit")
    }
  }

  const openPaymentDialog = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentData({ amount: invoice.remainingAmount.toString(), method: "cash", notes: "" })
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

  const updateLineItem = (idx: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const removeLineItem = (idx: number) => {
    setLineItems(prev => prev.filter((_, i) => i !== idx))
  }

  return (
    <>
      <Topbar title={t('topbar.title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <PageLoadingGuard stats={4} cols={7} rows={8}>
        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-8">
          <StatCard title={t('stats.totalRevenue')} value={fmtLEK(totalRevenue)} description={fmtEUR(totalRevenue)} icon={Wallet} color="emerald" />
          <StatCard title={t('stats.pendingPayments')} value={fmtLEK(pendingPayments)} description={fmtEUR(pendingPayments)} icon={TrendingUp} color="amber" />
          <StatCard title={t('stats.paidInvoices')} value={paidInvoices} icon={Receipt} color="emerald" />
          <StatCard title={t('stats.unpaidInvoices')} value={unpaidInvoices} icon={CreditCard} color="rose" />
        </div>

        {/* Search + Generate button */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <SearchInput
            placeholder={t('searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            containerClassName="flex-1"
          />
          <Button
            className="bg-accent hover:bg-accent/90 text-accent-foreground"
            onClick={() => setIsGenerateOpen(true)}
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('generateButton')}
          </Button>
        </div>

        {/* Invoices Table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            {/* —— Desktop table —— */}
            <div className="hidden sm:block overflow-x-auto">
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
                      <TableCell className="hidden lg:table-cell ic-green"><DualPrice amount={invoice.paidAmount} size="sm" /></TableCell>
                      <TableCell className="hidden lg:table-cell ic-red"><DualPrice amount={invoice.remainingAmount} size="sm" /></TableCell>
                      <TableCell><StatusBadge status={invoice.status} /></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button size="sm" variant="outline" className="rounded-xl" onClick={() => openReceipt(invoice)}><Printer className="h-4 w-4 mr-1.5" />{t('print')}</Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openDetailDialog(invoice)}><Eye className="h-4 w-4 mr-2" />{t('viewDetails')}</DropdownMenuItem>
                              {invoice.status !== "paguar" && <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}><CreditCard className="h-4 w-4 mr-2" />{t('registerPayment')}</DropdownMenuItem>}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground">{t('empty')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* —— Mobile cards —— */}
            <div className="sm:hidden divide-y divide-border">
              {filteredInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{invoice.patientName}</p>
                      <p className="text-xs text-muted-foreground">{invoice.id} · {fmtDate(invoice.createdAt)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <StatusBadge status={invoice.status} />
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openReceipt(invoice)}><Printer className="h-4 w-4 mr-2" />{t('print')}</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openDetailDialog(invoice)}><Eye className="h-4 w-4 mr-2" />{t('viewDetails')}</DropdownMenuItem>
                          {invoice.status !== "paguar" && <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}><CreditCard className="h-4 w-4 mr-2" />{t('registerPayment')}</DropdownMenuItem>}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-secondary/50 rounded-lg p-2 text-center">
                      <p className="text-muted-foreground">{t('mobile.total')}</p>
                      <p className="font-medium">{fmtLEK(invoice.totalAmount)}</p>
                    </div>
                    <div className="ibg-green rounded-lg p-2 text-center">
                      <p className="ic-green">{t('mobile.paid')}</p>
                      <p className="font-medium ic-green">{fmtLEK(invoice.paidAmount)}</p>
                    </div>
                    <div className="ibg-red rounded-lg p-2 text-center">
                      <p className="ic-red">{t('mobile.debt')}</p>
                      <p className="font-medium ic-red">{fmtLEK(invoice.remainingAmount)}</p>
                    </div>
                  </div>
                </div>
              ))}
              {filteredInvoices.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</div>
              )}
            </div>

          </CardContent>
        </Card>

        {/* Generate Invoice Dialog */}
        <Dialog open={isGenerateOpen} onOpenChange={(open) => {
          setIsGenerateOpen(open)
          if (!open) {
            setGenPatientId("")
            setLineItems([{ name: "", qty: 1, price: 0 }])
            setAutoLoadedIds([])
            setLineCurrency("LEK")
            setWithTvsh(false)
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('generateDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('generateDialog.description')}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>{t('generateDialog.patient')}</Label>
                <Select value={genPatientId} onValueChange={setGenPatientId}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('generateDialog.patientPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    {patients.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.firstName} {p.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {autoLoadedIds.length > 0 && (
                <p className="text-xs text-accent font-medium">
                  {t('generateDialog.autoLoaded', { count: autoLoadedIds.length })}
                </p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>{t('generateDialog.services')}</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center rounded-lg border overflow-hidden text-xs">
                      <button
                        type="button"
                        onClick={() => setLineCurrency("LEK")}
                        className={`px-2.5 py-1 font-medium transition-colors ${lineCurrency === "LEK" ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary"}`}
                      >LEK</button>
                      <button
                        type="button"
                        onClick={() => setLineCurrency("EUR")}
                        className={`px-2.5 py-1 font-medium transition-colors ${lineCurrency === "EUR" ? "bg-accent text-white" : "text-muted-foreground hover:bg-secondary"}`}
                      >EUR</button>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => setLineItems(prev => [...prev, { name: "", qty: 1, price: 0 }])}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      {t('generateDialog.addRow')}
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('generateDialog.serviceTable.service')}</TableHead>
                        <TableHead className="w-16">{t('generateDialog.serviceTable.qty')}</TableHead>
                        <TableHead className="w-28">{t('generateDialog.serviceTable.price', { currency: lineCurrency })}</TableHead>
                        <TableHead className="w-28 text-right">{t('generateDialog.serviceTable.subtotal')}</TableHead>
                        <TableHead className="w-8" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {lineItems.map((item, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="p-1">
                            <Input
                              value={item.name}
                              onChange={(e) => updateLineItem(idx, "name", e.target.value)}
                              placeholder={t('generateDialog.servicePlaceholder')}
                              list="service-suggestions"
                              className="border-0 shadow-none"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              type="number"
                              min={1}
                              value={item.qty}
                              onChange={(e) => updateLineItem(idx, "qty", parseInt(e.target.value) || 1)}
                              className="border-0 shadow-none text-center"
                            />
                          </TableCell>
                          <TableCell className="p-1">
                            <Input
                              type="number"
                              min={0}
                              value={item.price || ""}
                              onChange={(e) => updateLineItem(idx, "price", parseFloat(e.target.value) || 0)}
                              placeholder="0"
                              className="border-0 shadow-none"
                            />
                          </TableCell>
                          <TableCell className="text-right pr-3 font-medium">
                            {(item.qty * item.price).toLocaleString()}
                          </TableCell>
                          <TableCell className="p-1">
                            {lineItems.length > 1 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive"
                                onClick={() => removeLineItem(idx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <datalist id="service-suggestions">
                    {services.map(s => <option key={s.id} value={s.name} />)}
                  </datalist>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={withTvsh}
                        onCheckedChange={setWithTvsh}
                        id="tvsh-toggle"
                      />
                      <label htmlFor="tvsh-toggle" className="text-sm font-medium cursor-pointer select-none">
                        {t('generateDialog.withTvsh')}
                      </label>
                    </div>
                    {withTvsh && (
                      <p className="text-sm text-muted-foreground">
                        +{lineCurrency === "EUR"
                          ? `€${(lineTotal * TVSH_RATE).toFixed(2)}`
                          : fmtLEK(tvshAmount)}
                      </p>
                    )}
                  </div>
                  <div className="flex justify-end">
                    <p className="text-lg font-bold">
                      {lineCurrency === "EUR"
                        ? <>€{(grandTotal).toLocaleString()} <span className="text-sm font-normal text-muted-foreground ml-1">({fmtLEK(Math.round(grandTotal * LEK_PER_EUR))})</span></>
                        : <>{fmtLEK(grandTotal)} <span className="text-sm font-normal text-muted-foreground ml-1">{fmtEUR(grandTotal)}</span></>
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsGenerateOpen(false)}>{t('generateDialog.cancel')}</Button>
              <Button onClick={handleGenerateInvoice} className="bg-accent hover:bg-accent/90">
                {t('generateDialog.submit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Payment Dialog */}
        <Dialog open={isPaymentDialogOpen} onOpenChange={(o) => { setIsPaymentDialogOpen(o); if (!o) setPaymentErrors({}) }}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{t('paymentDialog.title')}</DialogTitle>
              <DialogDescription>
                {t('paymentDialog.description', { id: selectedInvoice?.id || '', amount: selectedInvoice ? `${fmtLEK(selectedInvoice.remainingAmount)} (${fmtEUR(selectedInvoice.remainingAmount)})` : '' })}
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
                    setPaymentData({ ...paymentData, method: value as Payment["method"] })
                  }
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">{t('paymentMethod.cash')}</SelectItem>
                    <SelectItem value="karte">{t('paymentMethod.karte')}</SelectItem>
                    <SelectItem value="transfer">{t('paymentMethod.transfer')}</SelectItem>
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
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>{t('paymentDialog.cancel')}</Button>
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
              <DialogTitle>{t('detailDialog.title', { id: selectedInvoice?.id || '' })}</DialogTitle>
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
                    {selectedInvoice.treatments.map((tr, i) => <li key={i}>{tr}</li>)}
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
                        <div key={payment.id} className="flex justify-between items-center p-2 bg-secondary/50 rounded-lg text-sm">
                          <div>
                            <span className="font-medium">{fmtLEK(payment.amount)}</span>
                            <span className="text-xs text-muted-foreground ml-1">{fmtEUR(payment.amount)}</span>
                            <span className="text-muted-foreground ml-2">
                              ({payment.method === "cash" ? t('paymentMethod.cashShort') : payment.method === "karte" ? t('paymentMethod.karteShort') : t('paymentMethod.transferShort')})
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
              <Button variant="outline" onClick={() => setIsDetailDialogOpen(false)}>{t('detailDialog.close')}</Button>
              <Button
                onClick={() => { setIsDetailDialogOpen(false); openReceipt(selectedInvoice!) }}
                className="bg-accent hover:bg-accent/90"
              >
                <Printer className="h-4 w-4 mr-2" />
                {t('detailDialog.print')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        </PageLoadingGuard>
      </div>

    </>
  )
}
