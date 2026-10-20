"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@core/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@core/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { PageLoadingGuard } from '@core/components/ui/page-loading-guard'
import { toast } from "sonner"
import { DualPrice } from "@core/components/ui/dual-price"
import { CurrencyInput } from "@core/components/ui/currency-input"
import { LEK_PER_EUR } from "@core/lib/currency"
import { cn } from "@core/lib/utils"
import type { Service } from "@core/types"

const EMPTY_FORM = { name: "", description: "", price: 0, duration: 30, category: "" }

export function SherbimetSection() {
  const t = useTranslations('sherbimet-section')
  const { services, addService, updateService, deleteService } = useData()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editingService, setEditingService] = useState<Service | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [svcErrors, setSvcErrors] = useState<Record<string, string>>({})
  const [priceCurrency, setPriceCurrency] = useState<"LEK" | "EUR">("EUR")
  const [priceInput, setPriceInput] = useState("")
  const [deletingService, setDeletingService] = useState<Service | null>(null)

  const filteredServices = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.category.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async () => {
    const rawPrice = parseFloat(priceInput) || 0
    const priceInLek = priceCurrency === "EUR" ? Math.round(rawPrice * LEK_PER_EUR) : rawPrice
    try {
      if (editingService) {
        await updateService(editingService.id, { ...form, price: priceInLek })
        toast.success("Shërbimi u përditësua me sukses")
      } else {
        await addService({ ...form, price: priceInLek, isActive: true })
        toast.success("Shërbimi u shtua me sukses")
      }
      setIsOpen(false)
      setEditingService(null)
      setForm(EMPTY_FORM)
      setSvcErrors({})
      setPriceInput("")
      setPriceCurrency("EUR")
    } catch {
      toast.error("Gabim gjatë ruajtjes")
    }
  }

  const handleEdit = (service: Service) => {
    setEditingService(service)
    setForm({
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      category: service.category,
    })
    setPriceCurrency("LEK")
    setPriceInput(service.price.toString())
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingService) return
    try {
      await deleteService(deletingService.id)
      toast.success("Shërbimi u fshi me sukses")
    } catch {
      toast.error("Gabim gjatë fshirjes")
    } finally {
      setDeletingService(null)
    }
  }

  const categories = [...new Set(services.map((s) => s.category).filter(Boolean))]

  return (
    <>
      <PageLoadingGuard cols={5} rows={8}>
      <Dialog
        open={isOpen}
        onOpenChange={(open) => {
          setIsOpen(open)
          if (!open) {
            setEditingService(null)
            setForm(EMPTY_FORM)
            setSvcErrors({})
            setPriceInput("")
            setPriceCurrency("EUR")
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingService ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
            <DialogDescription>
              {editingService ? t('dialog.editDescription') : t('dialog.addDescription')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">{t('dialog.nameLabel')}</Label>
              <Input
                id="name"
                value={form.name}
                onChange={(e) => { setForm({ ...form, name: e.target.value }); if (svcErrors.name) setSvcErrors(p => ({ ...p, name: '' })) }}
                placeholder={t('dialog.namePlaceholder')}
                className={cn(svcErrors.name && "border-destructive focus-visible:ring-destructive/30")}
              />
              {svcErrors.name && <p className="text-xs text-destructive mt-1">{svcErrors.name}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">{t('dialog.categoryLabel')}</Label>
              <Input
                id="category"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                placeholder={t('dialog.categoryPlaceholder')}
                list="categories"
              />
              <datalist id="categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">{t('dialog.priceLabel')}</Label>
                <CurrencyInput
                  value={priceInput}
                  onChange={(v) => { setPriceInput(v); if (svcErrors.price) setSvcErrors(p => ({ ...p, price: '' })) }}
                  currency={priceCurrency}
                  onCurrencyChange={setPriceCurrency}
                />
                {svcErrors.price && <p className="text-xs text-destructive mt-1">{svcErrors.price}</p>}
                {priceInput && parseFloat(priceInput) > 0 && (
                  <p className="text-xs text-muted-foreground">
                    {priceCurrency === "EUR"
                      ? `≈ ${Math.round(parseFloat(priceInput) * LEK_PER_EUR).toLocaleString()} LEK`
                      : `≈ €${(parseFloat(priceInput) / LEK_PER_EUR).toFixed(2)}`}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">{t('dialog.durationLabel')}</Label>
                <Input
                  id="duration"
                  type="number"
                  value={form.duration}
                  onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) || 30 })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">{t('dialog.descriptionLabel')}</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder={t('dialog.descriptionPlaceholder')}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              {t('dialog.cancel')}
            </Button>
            <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {editingService ? t('dialog.saveChanges') : t('addButton')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-4">
            <SearchInput
              placeholder={t('searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              containerClassName="flex-1 max-w-sm"
            />
            <Button
              size="sm"
              className="bg-accent hover:bg-accent/90 text-accent-foreground gap-1.5 shrink-0"
              onClick={() => setIsOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {t('addButton')}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {/* ── Desktop table ── */}
          <div className="hidden sm:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table.service')}</TableHead>
                <TableHead>{t('table.category')}</TableHead>
                <TableHead>{t('table.duration')}</TableHead>
                <TableHead>{t('table.price')}</TableHead>
                <TableHead>{t('table.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredServices.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{service.name}</p>
                      {service.description && <p className="text-sm text-muted-foreground truncate max-w-xs">{service.description}</p>}
                    </div>
                  </TableCell>
                  <TableCell>{service.category || "—"}</TableCell>
                  <TableCell>{service.duration} min</TableCell>
                  <TableCell><DualPrice amount={service.price} size="sm" /></TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(service)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingService(service)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {filteredServices.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">{t('emptyState')}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          </div>

          {/* ── Mobile cards ── */}
          <div className="sm:hidden divide-y divide-border">
            {filteredServices.map((service) => (
              <div key={service.id} className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-sm">{service.name}</p>
                    <p className="text-xs text-muted-foreground">{service.category || "—"} · {service.duration} min</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(service)}><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingService(service)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                </div>
                {service.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{service.description}</p>}
                <div className="mt-2">
                  <DualPrice amount={service.price} size="sm" />
                </div>
              </div>
            ))}
            {filteredServices.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">{t('emptyState')}</div>
            )}
          </div>

        </CardContent>
      </Card>
      </PageLoadingGuard>

      <AlertDialog open={!!deletingService} onOpenChange={(open) => { if (!open) setDeletingService(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.description', { name: deletingService?.name || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90 text-white"
            >
              {t('deleteDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
