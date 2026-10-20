"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@core/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@core/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@core/components/ui/table"
import { Plus, TrendingUp, TrendingDown, Wallet, Euro, CreditCard, Banknote, Lock, LockOpen, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { CurrencyInput, toStoredLek } from "@core/components/ui/currency-input"
import { fmtLEK, fmtEUR } from "@core/lib/currency"
import {
  getTodayCashStatus, openCashDrawer, closeCashDrawer,
  type TodayCashStatus,
} from "@core/lib/api/cash-reconciliation"

export default function RecepsionArka() {
  const t = useTranslations('recepsion-arka')
  const { dailyTransactions, addTransaction } = useData()
  const [isOpen, setIsOpen] = useState(false)
  const [currency, setCurrency] = useState<"LEK" | "EUR">("LEK")
  const [newTransaction, setNewTransaction] = useState({
    type: "hyrese" as "hyrese" | "dalje",
    amount: "",
    description: "",
    method: "cash" as "cash" | "karte" | "transfer",
  })

  const [cashStatus, setCashStatus] = useState<TodayCashStatus | null>(null)
  const [drawerDialogOpen, setDrawerDialogOpen] = useState(false)
  const [openingFloat, setOpeningFloat] = useState("")
  const [closingActual, setClosingActual] = useState("")
  const [closingNotes, setClosingNotes] = useState("")
  const [drawerBusy, setDrawerBusy] = useState(false)

  const loadCashStatus = useCallback(async () => {
    try {
      setCashStatus(await getTodayCashStatus())
    } catch {
      // Non-critical: the transaction ledger below still works without this.
    }
  }, [])

  useEffect(() => { loadCashStatus() }, [loadCashStatus])

  const isDrawerOpen = cashStatus?.record?.status === "hapur"

  const handleOpenDrawer = async () => {
    const amount = parseFloat(openingFloat)
    if (isNaN(amount) || amount < 0) { toast.error("Shuma e fondit fillestar nuk është e vlefshme"); return }
    setDrawerBusy(true)
    try {
      await openCashDrawer(amount)
      toast.success("Arka u hap me sukses")
      setDrawerDialogOpen(false)
      setOpeningFloat("")
      await loadCashStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë hapjes së arkës")
    } finally {
      setDrawerBusy(false)
    }
  }

  const handleCloseDrawer = async () => {
    const amount = parseFloat(closingActual)
    if (isNaN(amount) || amount < 0) { toast.error("Shuma e numëruar nuk është e vlefshme"); return }
    setDrawerBusy(true)
    try {
      const result = await closeCashDrawer(amount, closingNotes.trim() || undefined)
      if (result.discrepancy && Math.abs(result.discrepancy) > 0.01) {
        toast.error(`Arka u mbyll — diferencë prej ${fmtLEK(Math.abs(result.discrepancy))} ${result.discrepancy > 0 ? "më shumë" : "më pak"}`)
      } else {
        toast.success("Arka u mbyll me sukses — asnjë diferencë")
      }
      setDrawerDialogOpen(false)
      setClosingActual("")
      setClosingNotes("")
      await loadCashStatus()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë mbylljes së arkës")
    } finally {
      setDrawerBusy(false)
    }
  }

  // Calculate totals
  const todayTransactions = dailyTransactions || []
  const totalIncome = todayTransactions
    .filter((t) => t.type === "hyrese")
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = todayTransactions
    .filter((t) => t.type === "dalje")
    .reduce((sum, t) => sum + t.amount, 0)
  const balance = totalIncome - totalExpense

  const handleAddTransaction = () => {

    addTransaction({
      type: newTransaction.type,
      amount: toStoredLek(newTransaction.amount, currency),
      description: newTransaction.description,
      method: newTransaction.method,
    })

    toast.success("Transaksioni u shtua me sukses")
    setIsOpen(false)
    setCurrency("LEK")
    setNewTransaction({
      type: "hyrese",
      amount: "",
      description: "",
      method: "cash",
    })
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case "cash":
        return <Banknote className="h-4 w-4" />
      case "karte":
        return <CreditCard className="h-4 w-4" />
      case "transfer":
        return <Euro className="h-4 w-4" />
      default:
        return <Wallet className="h-4 w-4" />
    }
  }

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "cash":
        return t('method.cash')
      case "karte":
        return t('method.karte')
      case "transfer":
        return t('method.transfer')
      default:
        return method
    }
  }

  return (
    <>
      <Topbar
        title={t('topbar.title')}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">

        {/* Cash drawer reconciliation */}
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 lg:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDrawerOpen ? 'ibg-green' : 'ibg-red'}`}>
                  {isDrawerOpen ? <LockOpen className="h-4 w-4 ic-green" /> : <Lock className="h-4 w-4 ic-red" />}
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {isDrawerOpen ? t('drawer.openToday') : cashStatus?.record?.status === 'mbyllur' ? t('drawer.closedToday') : t('drawer.notOpenedYet')}
                  </p>
                  {isDrawerOpen && cashStatus?.expectedIfClosedNow !== undefined && (
                    <p className="text-xs text-muted-foreground">
                      {t('drawer.openingSummary', { opening: fmtLEK(cashStatus.record!.openingFloat), expected: fmtLEK(cashStatus.expectedIfClosedNow) })}
                    </p>
                  )}
                  {cashStatus?.record?.status === 'mbyllur' && cashStatus.record.discrepancy !== undefined && (
                    <p className={`text-xs ${Math.abs(cashStatus.record.discrepancy) > 0.01 ? 'ic-red' : 'text-muted-foreground'}`}>
                      {t('drawer.discrepancy', { amount: fmtLEK(cashStatus.record.discrepancy) })}
                    </p>
                  )}
                </div>
              </div>
              <Dialog open={drawerDialogOpen} onOpenChange={setDrawerDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    variant={isDrawerOpen ? "outline" : "default"}
                    className={!isDrawerOpen ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
                    disabled={cashStatus?.record?.status === 'mbyllur'}
                  >
                    {isDrawerOpen ? t('drawer.closeButton') : t('drawer.openButton')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{isDrawerOpen ? t('drawer.closeButton') : t('drawer.openButton')}</DialogTitle>
                  </DialogHeader>
                  {isDrawerOpen ? (
                    <div className="grid gap-4 py-2">
                      <div className="space-y-2">
                        <Label>{t('drawer.closingCountedLabel')}</Label>
                        <Input type="number" min={0} value={closingActual} onChange={(e) => setClosingActual(e.target.value)} placeholder="0" />
                        {cashStatus?.expectedIfClosedNow !== undefined && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                            <AlertTriangle className="h-3 w-3" /> {t('drawer.expectedAmount', { amount: fmtLEK(cashStatus.expectedIfClosedNow) })}
                          </p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label>{t('drawer.notesLabel')}</Label>
                        <Textarea value={closingNotes} onChange={(e) => setClosingNotes(e.target.value)} rows={3} placeholder={t('drawer.notesPlaceholder')} />
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-4 py-2">
                      <div className="space-y-2">
                        <Label>{t('drawer.openingFloatLabel')}</Label>
                        <Input type="number" min={0} value={openingFloat} onChange={(e) => setOpeningFloat(e.target.value)} placeholder="0" />
                      </div>
                    </div>
                  )}
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setDrawerDialogOpen(false)}>{t('drawer.cancel')}</Button>
                    <Button
                      onClick={isDrawerOpen ? handleCloseDrawer : handleOpenDrawer}
                      disabled={drawerBusy}
                      className="bg-accent hover:bg-accent/90"
                    >
                      {drawerBusy ? t('drawer.saving') : isDrawerOpen ? t('drawer.closeButton') : t('drawer.openButton')}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="relative bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3">
            <div className="absolute top-0 left-0 right-0 h-[3px] strip-green" />
            <div className="flex items-center justify-between gap-2 mt-1">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('stats.income')}</p>
                <p className="text-xl font-bold ic-green leading-none">{fmtLEK(totalIncome)}</p>
                <p className="text-xs ic-green mt-1">{fmtEUR(totalIncome)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg ibg-green flex items-center justify-center shrink-0">
                <TrendingUp className="h-4 w-4 ic-green" />
              </div>
            </div>
          </div>
          <div className="relative bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3">
            <div className="absolute top-0 left-0 right-0 h-[3px] strip-red" />
            <div className="flex items-center justify-between gap-2 mt-1">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('stats.expenses')}</p>
                <p className="text-xl font-bold ic-red leading-none">{fmtLEK(totalExpense)}</p>
                <p className="text-xs ic-red mt-1">{fmtEUR(totalExpense)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg ibg-red flex items-center justify-center shrink-0">
                <TrendingDown className="h-4 w-4 ic-red" />
              </div>
            </div>
          </div>
          <div className="relative bg-card rounded-xl border border-border shadow-sm overflow-hidden p-3">
            <div className={`absolute top-0 left-0 right-0 h-[3px] ${balance >= 0 ? 'strip-blue' : 'strip-red'}`} />
            <div className="flex items-center justify-between gap-2 mt-1">
              <div>
                <p className="text-xs text-muted-foreground font-medium mb-1">{t('stats.balance')}</p>
                <p className={`text-xl font-bold leading-none ${balance >= 0 ? 'ic-green' : 'ic-red'}`}>{fmtLEK(balance)}</p>
                <p className={`text-xs mt-1 ${balance >= 0 ? 'ic-green' : 'ic-red'}`}>{fmtEUR(balance)}</p>
              </div>
              <div className="w-8 h-8 rounded-lg ibg-blue flex items-center justify-center shrink-0">
                <Wallet className="h-4 w-4 ic-blue" />
              </div>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{t('transactions.title')}</CardTitle>
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                  <Plus className="mr-2 h-4 w-4" />
                  {t('transactions.addButton')}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('transactions.addDialogTitle')}</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">{t('transactions.typeLabel')}</Label>
                    <Select
                      value={newTransaction.type}
                      onValueChange={(value: "hyrese" | "dalje") =>
                        setNewTransaction({ ...newTransaction, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('transactions.typePlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="hyrese">{t('transactions.typeIncome')}</SelectItem>
                        <SelectItem value="dalje">{t('transactions.typeExpense')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('transactions.amountLabel')}</Label>
                    <CurrencyInput
                      value={newTransaction.amount}
                      onChange={(v) => setNewTransaction({ ...newTransaction, amount: v })}
                      currency={currency}
                      onCurrencyChange={(c) => { setCurrency(c); setNewTransaction(prev => ({ ...prev, amount: '' })) }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="method">{t('transactions.methodLabel')}</Label>
                    <Select
                      value={newTransaction.method}
                      onValueChange={(value: "cash" | "karte" | "transfer") =>
                        setNewTransaction({ ...newTransaction, method: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={t('transactions.methodPlaceholder')} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">{t('method.cash')}</SelectItem>
                        <SelectItem value="karte">{t('method.karte')}</SelectItem>
                        <SelectItem value="transfer">{t('method.transferBank')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">{t('transactions.descriptionLabel')}</Label>
                    <Textarea
                      id="description"
                      value={newTransaction.description}
                      onChange={(e) =>
                        setNewTransaction({ ...newTransaction, description: e.target.value })
                      }
                      placeholder={t('transactions.descriptionPlaceholder')}
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsOpen(false)}>{t('transactions.cancel')}</Button>
                  <Button onClick={handleAddTransaction} className="bg-accent hover:bg-accent/90">{t('transactions.submit')}</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {todayTransactions.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Wallet className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>{t('transactions.empty')}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('transactions.table.time')}</TableHead>
                    <TableHead>{t('transactions.table.type')}</TableHead>
                    <TableHead>{t('transactions.table.description')}</TableHead>
                    <TableHead>{t('transactions.table.method')}</TableHead>
                    <TableHead className="text-right">{t('transactions.table.amount')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {todayTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleTimeString('sq-AL', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            transaction.type === "hyrese"
                              ? "chip-green"
                              : "chip-red"
                          }`}
                        >
                          {transaction.type === "hyrese" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {transaction.type === "hyrese" ? t('transactions.typeChipIncome') : t('transactions.typeChipExpense')}
                        </span>
                      </TableCell>
                      <TableCell>{transaction.description}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          {getMethodIcon(transaction.method)}
                          {getMethodLabel(transaction.method)}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-right font-medium ${
                          transaction.type === "hyrese" ? "ic-green" : "ic-red"
                        }`}
                      >
                        <span className="block">{transaction.type === "hyrese" ? "+" : "-"}{fmtLEK(transaction.amount)}</span>
                        <span className="block text-xs font-normal opacity-70">{fmtEUR(transaction.amount)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
