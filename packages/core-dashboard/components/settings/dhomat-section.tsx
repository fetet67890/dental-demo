"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useData } from "@core/context/data-context"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Label } from "@core/components/ui/label"
import { Switch } from "@core/components/ui/switch"
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
import { Plus, Pencil, Trash2, DoorOpen } from "lucide-react"
import { PageLoadingGuard } from "@core/components/ui/page-loading-guard"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import type { Room } from "@core/types"

const EMPTY_FORM = { name: "", isActive: true }

export function DhomatSection() {
  const t = useTranslations('dhomat-section')
  const { rooms, addRoom, updateRoom, deleteRoom } = useData()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null)

  const filteredRooms = rooms.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))

  const handleSave = async () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = t('validation.nameRequired')
    if (Object.keys(e).length > 0) { setErrors(e); return }

    try {
      if (editingRoom) {
        await updateRoom(editingRoom.id, form)
        toast.success("Dhoma u përditësua me sukses")
      } else {
        await addRoom(form)
        toast.success("Dhoma u shtua me sukses")
      }
      setIsOpen(false)
      setEditingRoom(null)
      setForm(EMPTY_FORM)
      setErrors({})
    } catch {
      toast.error("Gabim gjatë ruajtjes")
    }
  }

  const handleEdit = (room: Room) => {
    setEditingRoom(room)
    setForm({ name: room.name, isActive: room.isActive })
    setIsOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingRoom) return
    try {
      await deleteRoom(deletingRoom.id)
      toast.success("Dhoma u fshi me sukses")
    } catch {
      toast.error("Gabim gjatë fshirjes")
    } finally {
      setDeletingRoom(null)
    }
  }

  return (
    <>
      <PageLoadingGuard cols={3} rows={6}>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open)
            if (!open) { setEditingRoom(null); setForm(EMPTY_FORM); setErrors({}) }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRoom ? t('dialog.editTitle') : t('dialog.addTitle')}</DialogTitle>
              <DialogDescription>
                {editingRoom ? t('dialog.editDescription') : t('dialog.addDescription')}
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
              <div className="flex items-center justify-between">
                <Label htmlFor="active">{t('dialog.activeLabel')}</Label>
                <Switch id="active" checked={form.isActive} onCheckedChange={(v) => setForm({ ...form, isActive: v })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsOpen(false)}>{t('dialog.cancel')}</Button>
              <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                {editingRoom ? t('dialog.saveChanges') : t('dialog.addSubmit')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <div className="flex items-center gap-4">
              <SearchInput placeholder={t('searchPlaceholder')} value={search} onChange={(e) => setSearch(e.target.value)} containerClassName="flex-1 max-w-sm" />
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
                    <TableHead>{t('table.room')}</TableHead>
                    <TableHead>{t('table.status')}</TableHead>
                    <TableHead>{t('table.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRooms.map((room) => (
                    <TableRow key={room.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                          <p className="font-medium">{room.name}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', room.isActive ? 'chip-green' : 'chip-neutral')}>
                          {room.isActive ? t('status.active') : t('status.inactive')}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm" onClick={() => handleEdit(room)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeletingRoom(room)}><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filteredRooms.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">{t('empty')}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="sm:hidden divide-y divide-border">
              {filteredRooms.map((room) => (
                <div key={room.id} className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex items-center gap-2">
                      <DoorOpen className="h-4 w-4 text-muted-foreground shrink-0" />
                      <p className="font-medium text-sm">{room.name}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(room)}><Pencil className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeletingRoom(room)}><Trash2 className="h-4 w-4" /></Button>
                    </div>
                  </div>
                  <div className="mt-2">
                    <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-full', room.isActive ? 'chip-green' : 'chip-neutral')}>
                      {room.isActive ? t('status.active') : t('status.inactive')}
                    </span>
                  </div>
                </div>
              ))}
              {filteredRooms.length === 0 && (
                <div className="py-8 text-center text-sm text-muted-foreground">{t('empty')}</div>
              )}
            </div>
          </CardContent>
        </Card>
      </PageLoadingGuard>

      <AlertDialog open={!!deletingRoom} onOpenChange={(open) => { if (!open) setDeletingRoom(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('deleteDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('deleteDialog.prefix')} <span className="font-semibold text-foreground">&quot;{deletingRoom?.name}&quot;</span>{t('deleteDialog.suffix')}
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
