"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent, CardHeader } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@core/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@core/components/ui/dialog"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@core/components/ui/select"
import { toast } from "sonner"
import Link from "next/link"
import { cn, fmtDate, syncUrl } from "@core/lib/utils"

function Icon({ name, size = 16, className }: { name: string; size?: number; className?: string }) {
  return (
    <span
      className={cn("material-symbols-outlined select-none leading-none", className)}
      style={{ fontSize: size }}
    >
      {name}
    </span>
  )
}

function localDateStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function DoktorRecetat() {
  const t = useTranslations('doktor-recetat')
  const { user } = useAuth()
  const { prescriptions, patients, addPrescription } = useData()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")
  const [isOpen, setIsOpen] = useState(false)
  const [rxErrors, setRxErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    patientId:    '',
    medication:   '',
    dosage:       '',
    frequency:    '',
    duration:     '',
    instructions: '',
  })

  useEffect(() => {
    if (searchParams.get('action') === 'add') {
      setIsOpen(true)
      setRxErrors({})
      syncUrl('/doktor/recetat')
    }
  }, [searchParams]) // eslint-disable-line

  const myPrescriptions = (prescriptions || [])
    .filter((p) => p.doctorId === user?.id || p.doctorName?.includes(user?.name || ''))
    .filter(
      (p) =>
        (p.patientName ?? '').toLowerCase().includes(search.toLowerCase()) ||
        (p.medication  ?? '').toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => (b.issuedDate ?? '').localeCompare(a.issuedDate ?? ''))

  const handleAdd = () => {
    const patient = (patients || []).find((p) => p.id === form.patientId)
    addPrescription({
      patientId:    form.patientId,
      patientName:  patient ? `${patient.firstName} ${patient.lastName}` : 'Pacient',
      doctorId:     user?.id || '',
      doctorName:   user?.name || '',
      medication:   form.medication,
      dosage:       form.dosage,
      frequency:    form.frequency,
      duration:     form.duration,
      instructions: form.instructions,
      issuedDate:   localDateStr(),
    })
    toast.success('Receta u krijua')
    setIsOpen(false)
    setRxErrors({})
    setForm({ patientId: '', medication: '', dosage: '', frequency: '', duration: '', instructions: '' })
  }

  const handlePrint = (rx: (typeof myPrescriptions)[0]) => {
    const logoUrl = `${window.location.origin}/logo.png`
    const win = window.open('', '_blank', 'width=850,height=1100')
    if (!win) {
      alert('Ju lutem lejoni hapjen e dritareve pop-up për të printuar.')
      return
    }
    const html = `<!DOCTYPE html>
<html lang="sq">
<head>
<meta charset="utf-8">
<title>Recetë — ${rx.patientName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#333;padding:40px;max-width:680px;margin:0 auto}
  .logo-wrap{text-align:center;margin-bottom:4px}
  .logo-wrap img{height:52px;width:auto;display:inline-block;margin-bottom:8px}
  h1{font-size:20px;text-align:center;letter-spacing:3px;margin-bottom:5px;text-transform:uppercase;color:#0f2155}
  .header-info{text-align:center;font-size:11px;color:#555;margin-bottom:18px;line-height:1.8}
  hr.thick{border:none;border-top:2px solid #0f2155;margin:16px 0}
  hr.thin{border:none;border-top:1px solid #ddd;margin:14px 0}
  .section-title{font-weight:bold;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:10px;padding-bottom:5px;border-bottom:1px solid #ddd;color:#0f2155}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px;margin-bottom:14px}
  .field{font-size:11px;color:#444}
  .field strong{color:#222}
  .rx-badge{display:inline-block;background:#dbeafe;color:#1d4ed8;font-size:18px;font-weight:700;letter-spacing:2px;padding:6px 18px;border-radius:6px;margin-bottom:12px;border:1px solid #bfdbfe}
  table{width:100%;border-collapse:collapse;margin-bottom:16px}
  thead th{background:#f5f5f5;padding:9px 12px;text-align:left;font-size:11px;font-weight:bold;border-bottom:2px solid #ddd;color:#333}
  td{padding:9px 12px;border-bottom:1px solid #f0f0f0;font-size:12px;vertical-align:top}
  td.label{font-weight:600;color:#0f2155;width:140px;white-space:nowrap}
  .instructions-box{background:#fffbeb;border:1px solid #fde68a;border-radius:4px;padding:10px 14px;font-size:11.5px;color:#444;margin-bottom:16px;line-height:1.6}
  .instructions-box strong{color:#92400e;display:block;margin-bottom:3px}
  .sig-row{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:50px}
  .sig-block{text-align:center}
  .sig-stamp{border:1px dashed #aaa;width:110px;height:80px;margin:0 auto 8px;display:flex;align-items:center;justify-content:center;font-size:10px;color:#aaa;line-height:1.4;text-align:center}
  .sig-line{border-top:1px solid #333;padding-top:5px;font-size:11px;color:#444}
  .footer{text-align:center;margin-top:28px;padding-top:14px;border-top:1px solid #ddd;font-size:11px;color:#666;line-height:1.9}
  .test-banner{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;text-align:center;font-weight:700;font-size:11px;letter-spacing:.5px;padding:8px 12px;border-radius:6px;margin-bottom:16px;text-transform:uppercase}
  @media print{@page{margin:20mm}body{padding:0}}
</style>
</head>
<body>
<div class="test-banner">&#9888; Dokument për Qëllime Testimi — Sistemi Hypocrates në Zhvillim, Jo i Vlefshëm Realisht</div>
<div class="logo-wrap">
  <img src="${logoUrl}" alt="Hypocrates" onerror="this.style.display='none'">
</div>
<h1>Hypocrates</h1>
<div class="header-info">
  &#128205; Rruga Dëshmorët e Kombit, Tiranë, Shqipëri<br>
  &#128222; Tel: +355 69 000 0000 &nbsp;|&nbsp; &#9993; info@hypocrates.local<br>
  <span style="color:#1877f2">&#9658; Facebook:</span> Hypocrates &nbsp;|&nbsp; <span style="color:#e1306c">&#9679; Instagram:</span> hypocrates
</div>
<hr class="thick">

<div class="section-title">Të Dhënat e Recetës</div>
<div class="grid2">
  <div class="field"><strong>Pacienti:</strong> ${rx.patientName}</div>
  <div class="field"><strong>Data:</strong> ${rx.issuedDate || '—'}</div>
  <div class="field"><strong>Mjeku:</strong> Dr. ${rx.doctorName || user?.name || '—'}</div>
  <div class="field"><strong>Nr. Recetës:</strong> #${rx.id?.slice(0,8).toUpperCase() || '—'}</div>
</div>
<hr class="thin">

<div class="section-title">Receta Mjekësore &#8478;</div>
<div style="margin-bottom:12px"><span class="rx-badge">&#8478;</span></div>
<table>
  <thead>
    <tr>
      <th style="width:140px">Fusha</th>
      <th>Detajet</th>
    </tr>
  </thead>
  <tbody>
    <tr><td class="label">Bari (Medicamenti)</td><td><strong>${rx.medication}</strong></td></tr>
    <tr><td class="label">Doza</td><td>${rx.dosage}</td></tr>
    <tr><td class="label">Frekuenca</td><td>${rx.frequency || '—'}</td></tr>
    <tr><td class="label">Kohëzgjatja</td><td>${rx.duration || '—'}</td></tr>
  </tbody>
</table>

${rx.instructions ? `
<div class="instructions-box">
  <strong>&#9888; Udhëzime Speciale:</strong>
  ${rx.instructions}
</div>` : ''}

<div class="sig-row">
  <div class="sig-block">
    <div class="sig-stamp">VEND PËR<br>VULËN E<br>KLINIKËS</div>
    <div class="sig-line">Firma e Mjekut — Dr. ${rx.doctorName || user?.name || ''}</div>
  </div>
  <div class="sig-block">
    <div style="height:80px;margin-bottom:8px"></div>
    <div class="sig-line">Firma e Pacientit — ${rx.patientName}</div>
  </div>
</div>

<div class="footer">
  Kjo recetë është e vlefshme vetëm me vulën dhe firmën e mjekut.<br>
  <strong>Hypocrates</strong> &mdash; Rruga Dëshmorët e Kombit, Tiranë, Shqipëri<br>
  &#128222; +355 69 000 0000 &nbsp;|&nbsp; &#9993; info@hypocrates.local &nbsp;|&nbsp; &#9658; Hypocrates
</div>

<script>window.onload=function(){window.print();setTimeout(function(){window.close();},1000);}</script>
</body>
</html>`
    win.document.write(html)
    win.document.close()
  }

  return (
    <>
      <Topbar />

      <Dialog open={isOpen} onOpenChange={(v) => { setIsOpen(v); if (!v) setRxErrors({}) }}>
        <DialogContent className="max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-foreground">
              {t('dialog.title')}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {t('dialog.description')}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t('dialog.patientLabel')}</Label>
              <Select
                value={form.patientId}
                onValueChange={(v) => { setForm({ ...form, patientId: v }); if (rxErrors.patientId) setRxErrors(p => ({ ...p, patientId: '' })) }}
              >
                <SelectTrigger className={cn("rounded-xl border-border", rxErrors.patientId && "border-destructive")}>
                  <SelectValue placeholder={t('dialog.patientPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  {(patients || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.firstName} {p.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {rxErrors.patientId && <p className="text-xs text-destructive mt-1">{rxErrors.patientId}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t('dialog.medicationLabel')}</Label>
              <Input
                value={form.medication}
                onChange={(e) => { setForm({ ...form, medication: e.target.value }); if (rxErrors.medication) setRxErrors(p => ({ ...p, medication: '' })) }}
                placeholder={t('dialog.medicationPlaceholder')}
                className={cn("rounded-xl border-border", rxErrors.medication && "border-destructive focus-visible:ring-destructive/30")}
              />
              {rxErrors.medication && <p className="text-xs text-destructive mt-1">{rxErrors.medication}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t('dialog.dosageLabel')}</Label>
                <Input
                  value={form.dosage}
                  onChange={(e) => { setForm({ ...form, dosage: e.target.value }); if (rxErrors.dosage) setRxErrors(p => ({ ...p, dosage: '' })) }}
                  placeholder={t('dialog.dosagePlaceholder')}
                  className={cn("rounded-xl border-border", rxErrors.dosage && "border-destructive focus-visible:ring-destructive/30")}
                />
                {rxErrors.dosage && <p className="text-xs text-destructive mt-1">{rxErrors.dosage}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">{t('dialog.frequencyLabel')}</Label>
                <Input
                  value={form.frequency}
                  onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                  placeholder={t('dialog.frequencyPlaceholder')}
                  className="rounded-xl border-border"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t('dialog.durationLabel')}</Label>
              <Input
                value={form.duration}
                onChange={(e) => setForm({ ...form, duration: e.target.value })}
                placeholder={t('dialog.durationPlaceholder')}
                className="rounded-xl border-border"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground">{t('dialog.instructionsLabel')}</Label>
              <Textarea
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                placeholder={t('dialog.instructionsPlaceholder')}
                className="rounded-xl border-border resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="rounded-xl border-border"
            >
              {t('cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
            >
              {t('createPrescription')}
            </Button>
          </DialogFooter>
        </DialogContent>

        <div className="flex-1 overflow-auto p-6 lg:p-8 space-y-6">

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-foreground">{t('title')}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t('subtitle')}</p>
            </div>
            <DialogTrigger asChild>
              <Button className="bg-accent hover:bg-accent/90 text-accent-foreground gap-2 rounded-xl" data-tour="action-add-prescription">
                <Icon name="add" size={16} />
                {t('createPrescription')}
              </Button>
            </DialogTrigger>
          </div>

          <Card className="bg-card rounded-2xl border border-border shadow-sm">
            <CardHeader className="px-6 pt-5 pb-4 border-b border-border/50">
              <div className="relative max-w-sm">
                <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none z-10" />
                <Input
                  placeholder={t('searchPlaceholder')}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 rounded-xl border-border"
                />
              </div>
            </CardHeader>

            <CardContent className="px-0 pb-0 overflow-x-auto">
              {myPrescriptions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center">
                    <Icon name="description" size={32} className="text-muted-foreground/40" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-foreground">{t('emptyState.title')}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {search
                        ? t('emptyState.tryAnotherSearch')
                        : t('emptyState.noPrescriptions')}
                    </p>
                  </div>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30 border-y border-border/50">
                      <TableHead className="pl-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.date')}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.patient')}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.medication')}</TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.dosage')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.frequency')}</TableHead>
                      <TableHead className="hidden sm:table-cell text-xs font-semibold uppercase tracking-wide text-muted-foreground">{t('table.duration')}</TableHead>
                      <TableHead className="pr-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {myPrescriptions.map((rx) => (
                      <TableRow
                        key={rx.id}
                        className="border-b border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <TableCell className="pl-6 py-4 text-sm text-muted-foreground">
                          {fmtDate(rx.issuedDate)}
                        </TableCell>

                        <TableCell className="py-4">
                          <Link
                            href={`/doktor/pacientet/${rx.patientId}`}
                            className="text-sm font-medium text-foreground hover:text-accent transition-colors"
                          >
                            {rx.patientName}
                          </Link>
                        </TableCell>

                        <TableCell className="py-4">
                          <span className="text-sm font-medium text-foreground">{rx.medication}</span>
                        </TableCell>

                        <TableCell className="py-4 text-sm text-muted-foreground">
                          {rx.dosage}
                        </TableCell>

                        <TableCell className="hidden sm:table-cell py-4 text-sm text-muted-foreground">
                          {rx.frequency || '—'}
                        </TableCell>

                        <TableCell className="hidden sm:table-cell py-4 text-sm text-muted-foreground">
                          {rx.duration || '—'}
                        </TableCell>

                        <TableCell className="pr-6 py-4">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrint(rx)}
                            className="gap-1.5 rounded-xl hover:text-accent hover:bg-accent/10"
                          >
                            <Icon name="print" size={15} />
                            {t('print')}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </Dialog>
    </>
  )
}
