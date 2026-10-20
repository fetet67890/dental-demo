"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@core/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Plus, Pencil, Trash2, Minus, AlertTriangle, Package, Truck, Check, X, CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { cn, fmtDate } from "@core/lib/utils"
import {
  getInventory, createInventoryItem, updateInventoryItem, adjustInventoryItem, deleteInventoryItem,
  type InventoryItem,
} from "@core/lib/api/inventory"
import {
  getReorderRequests, updateReorderRequestStatus,
  type ReorderRequest,
} from "@core/lib/api/inventory-reorders"

const EMPTY_FORM = { name: "", category: "", quantity: 0, unit: "copë", lowStockThreshold: 5, expiryDate: "", lotNumber: "" }

export default function InventariPage() {
  const t = useTranslations('admin-inventari')
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deletingItem, setDeletingItem] = useState<InventoryItem | null>(null)
  const [adjustingId, setAdjustingId] = useState<string | null>(null)

  const [reorderRequests, setReorderRequests] = useState<ReorderRequest[]>([])
  const [reorderBusyId, setReorderBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await getInventory({ search: search || undefined })
      setItems(data)
    } catch {
      toast.error("Gabim gjatë ngarkimit")
    } finally {
      setLoading(false)
    }
  }, [search])

  const loadReorderRequests = useCallback(async () => {
    try {
      const [pending, ordered] = await Promise.all([
        getReorderRequests('ne_pritje'),
        getReorderRequests('porositur'),
      ])
      setReorderRequests([...pending, ...ordered])
    } catch {
      // Non-critical: the inventory table below still works without this.
    }
  }, [])

  useEffect(() => { load() }, [load])
  useEffect(() => { loadReorderRequests() }, [loadReorderRequests])

  const handleReorderStatus = async (id: string, status: 'porositur' | 'pranuar' | 'anuluar') => {
    setReorderBusyId(id)
    try {
      await updateReorderRequestStatus(id, status)
      await loadReorderRequests()
    } catch {
      toast.error("Gabim gjatë përditësimit të kërkesës")
    } finally {
      setReorderBusyId(null)
    }
  }

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('errors.nameRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }

    try {
      if (editingItem) {
        await updateInventoryItem(editingItem.id, {
          name: form.name, category: form.category, unit: form.unit, lowStockThreshold: form.lowStockThreshold,
          expiryDate: form.expiryDate, lotNumber: form.lotNumber,
        })
        toast.success("Artikulli u përditësua me sukses")
      } else {
        await createInventoryItem({ ...form, expiryDate: form.expiryDate || undefined, lotNumber: form.lotNumber || undefined })
        toast.success("Artikulli u shtua me sukses")
      }
      setIsOpen(false)
      setEditingItem(null)
      setForm(EMPTY_FORM)
      setErrors({})
      load()
    } catch {
      toast.error("Gabim gjatë ruajtjes")
    }
  }

  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item)
    setForm({
      name: item.name, category: item.category || "", quantity: item.quantity, unit: item.unit,
      lowStockThreshold: item.lowStockThreshold,
      expiryDate: item.expiryDate ? item.expiryDate.substring(0, 10) : "",
      lotNumber: item.lotNumber || "",
    })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingItem) return
    try {
      await deleteInventoryItem(deletingItem.id)
      toast.success("Artikulli u fshi me sukses")
      load()
    } catch {
      toast.error("Gabim gjatë fshirjes")
    } finally {
      setDeletingItem(null)
    }
  }

  const handleAdjust = async (item: InventoryItem, delta: number) => {
    setAdjustingId(item.id)
    try {
      const updated = await adjustInventoryItem(item.id, delta)
      setItems((prev) => prev.map((i) => i.id === item.id ? updated : i))
      if (updated.lowStock && !item.lowStock) {
        toast.warning(`${updated.name} ka stok të ulët (${updated.quantity} ${updated.unit})`)
        loadReorderRequests()
      }
    } catch {
      toast.error("Gabim gjatë përditësimit")
    } finally {
      setAdjustingId(null)
    }
  }

  const categories = [...new Set(items.map((i) => i.category).filter(Boolean))] as string[]
  const lowStockCount = items.filter((i) => i.lowStock).length
  const expiringItems = items.filter((i) => i.expiryStatus === 'expiring_soon' || i.expiryStatus === 'expired')

  return (
    <>
      <Topbar title={t('topbar.title')} />
      <div className="flex-1 overflow-auto p-4 lg:p-8">

        {lowStockCount > 0 && (
          <div className="flex items-center gap-2.5 p-3 mb-4 ibg-red border border-[var(--p-red)]/30 rounded-xl">
            <AlertTriangle className="h-4 w-4 ic-red shrink-0" />
            <p className="text-sm ic-red">
              <strong>{lowStockCount}</strong> {lowStockCount === 1 ? t('lowStockBanner.singular') : t('lowStockBanner.plural')} {t('lowStockBanner.suffix')}
            </p>
          </div>
        )}

        {expiringItems.length > 0 && (
          <div className="flex items-center gap-2.5 p-3 mb-4 ibg-amber border border-[var(--p-amber)]/30 rounded-xl">
            <CalendarClock className="h-4 w-4 ic-amber shrink-0" />
            <p className="text-sm ic-amber">
              <strong>{expiringItems.length}</strong> {expiringItems.length === 1 ? t('expiringBanner.singular') : t('expiringBanner.plural')} {t('expiringBanner.suffix')}
            </p>
          </div>
        )}

        {reorderRequests.length > 0 && (
          <Card className="border-border/50 shadow-sm mb-4">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-accent" />
                <p className="font-semibold text-foreground">{t('reorders.title')}</p>
                <span className="text-xs text-muted-foreground">({reorderRequests.length})</span>
              </div>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {reorderRequests.map((r) => (
                <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-secondary/30 rounded-xl border border-border/50">
                  <div>
                    <p className="text-sm font-medium">{r.itemName}</p>
                    <p className="text-xs text-muted-foreground">
                      {t('reorders.requestedQuantity')}: {r.requestedQuantity} · {r.status === 'ne_pritje' ? t('reorders.statusPending') : t('reorders.statusOrdered')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {r.status === 'ne_pritje' && (
                      <Button size="sm" variant="outline" disabled={reorderBusyId === r.id} onClick={() => handleReorderStatus(r.id, 'porositur')} className="gap-1.5">
                        <Truck className="h-3.5 w-3.5" /> {t('reorders.markOrdered')}
                      </Button>
                    )}
                    {r.status === 'porositur' && (
                      <Button size="sm" variant="outline" disabled={reorderBusyId === r.id} onClick={() => handleReorderStatus(r.id, 'pranuar')} className="gap-1.5 ic-green border-[var(--p-green)]/30 hover:bg-[var(--p-green-bg)]">
                        <Check className="h-3.5 w-3.5" /> {t('reorders.accepted')}
                      </Button>
                    )}
                    <Button size="sm" variant="ghost" disabled={reorderBusyId === r.id} onClick={() => handleReorderStatus(r.id, 'anuluar')} className="gap-1.5 text-destructive hover:text-destructive">
                      <X className="h-3.5 w-3.5" /> {t('reorders.cancel')}
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) { setEditingItem(null); setForm(EMPTY_FORM); setErrors({}) }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingItem ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
              <DialogDescription>
                {editingItem ? t('dialog.editDescription') : t('dialog.addDescription')}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('dialog.nameLabel')}</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => { setForm({ ...form, name: e.target.value }); if (errors.name) setErrors(p => ({ ...p, name: '' })) }}
                  placeholder={t('dialog.namePlaceholder')}
                  className={cn(errors.name && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">{t('dialog.categoryLabel')}</Label>
                <Input
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder={t('dialog.categoryPlaceholder')}
                  list="inv-categories"
                />
                <datalist id="inv-categories">
                  {categories.map((cat) => <option key={cat} value={cat} />)}
                </datalist>
              </div>
              <div className="grid grid-cols-3 gap-4">
                {!editingItem && (
                  <div className="space-y-2">
                    <Label htmlFor="quantity">{t('dialog.quantityLabel')}</Label>
                    <Input id="quantity" type="number" min={0} value={form.quantity}
                      onChange={(e) => setForm({ ...form, quantity: parseInt(e.target.value) || 0 })} />
                  </div>
                )}
                <div className="space-y-2">
                  <Label htmlFor="unit">{t('dialog.unitLabel')}</Label>
                  <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder={t('dialog.unitPlaceholder')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="threshold">{t('dialog.thresholdLabel')}</Label>
                  <Input id="threshold" type="number" min={0} value={form.lowStockThreshold}
                    onChange={(e) => setForm({ ...form, lowStockThreshold: parseInt(e.target.value) || 0 })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="expiryDate">{t('dialog.expiryDateLabel')}</Label>
                  <Input id="expiryDate" type="date" value={form.expiryDate}
                    onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lotNumber">{t('dialog.lotNumberLabel')}</Label>
                  <Input id="lotNumber" value={form.lotNumber}
                    onChange={(e) => setForm({ ...form, lotNumber: e.target.value })}
                    placeholder={t('dialog.lotNumberPlaceholder')} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>{t('dialog.cancel')}</Button>
              <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {editingItem ? t('dialog.saveChanges') : t('dialog.addItem')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <SearchInput placeholder={t('search.placeholder')} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="flex-1 max-w-sm" />
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 shrink-0" onClick={() => setIsOpen(true)}>
                <Plus className="h-4 w-4" />
                {t('addButton')}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="hidden sm:block overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.item')}</TableHead>
                    <TableHead>{t('table.category')}</TableHead>
                    <TableHead>{t('table.quantity')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {(item.expiryDate || item.lotNumber) && (
                              <p className="text-xs text-muted-foreground">
                                {item.expiryDate && t('table.expiresOn', { date: fmtDate(item.expiryDate) })}
                                {item.expiryDate && item.lotNumber ? ' · ' : ''}
                                {item.lotNumber && t('table.lot', { number: item.lotNumber })}
                              </p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{item.category || "—"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={adjustingId === item.id} onClick={() => handleAdjust(item, -1)}>
                            <Minus className="h-3 w-3" />
                          </Button>
                          <span className="w-14 text-center font-semibold">{item.quantity} {item.unit}</span>
                          <Button variant="outline" size="icon" className="h-7 w-7" disabled={adjustingId === item.id} onClick={() => handleAdjust(item, 1)}>
                            <Plus className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', item.lowStock ? 'chip-red' : 'chip-green')}>
                            {item.lowStock ? t('status.lowStock') : t('status.ok')}
                          </span>
                          {item.expiryStatus === 'expired' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full chip-red">{t('status.expired')}</span>
                          )}
                          {item.expiryStatus === 'expiring_soon' && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full chip-amber">{t('status.expiringSoon')}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingItem(item)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!loading && items.length === 0 && (
                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('empty')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {items.map((item) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{item.name}</p>
                      <p className="text-xs text-muted-foreground">{item.category || "—"}</p>
                      {(item.expiryDate || item.lotNumber) && (
                        <p className="text-xs text-muted-foreground">
                          {item.expiryDate && t('table.expiresOn', { date: fmtDate(item.expiryDate) })}
                          {item.expiryDate && item.lotNumber ? ' · ' : ''}
                          {item.lotNumber && t('table.lot', { number: item.lotNumber })}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', item.lowStock ? 'chip-red' : 'chip-green')}>
                        {item.lowStock ? t('status.lowStockShort') : t('status.okShort')}
                      </span>
                      {item.expiryStatus === 'expired' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full chip-red">{t('status.expired')}</span>
                      )}
                      {item.expiryStatus === 'expiring_soon' && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full chip-amber">{t('status.expiringSoon')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={adjustingId === item.id} onClick={() => handleAdjust(item, -1)}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-14 text-center font-semibold text-sm">{item.quantity} {item.unit}</span>
                      <Button variant="outline" size="icon" className="h-7 w-7" disabled={adjustingId === item.id} onClick={() => handleAdjust(item, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(item)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingItem(item)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                </div>
              ))}
              {!loading && items.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={!!deletingItem} onOpenChange={(open) => { if (!open) setDeletingItem(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: deletingItem?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('deleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90 text-white">
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
