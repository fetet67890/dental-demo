"use client"

import { use, useState } from "react"
import { useTranslations } from 'next-intl'
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { Button } from "@core/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@core/components/ui/tabs"
import { Textarea } from "@core/components/ui/textarea"
import { StatusBadge } from "@core/components/ui/status-badge"
import { DocumentUpload } from "@core/components/patient/document-upload"
import { DocumentList } from "@core/components/patient/document-list"
import { PatientRiskPanel } from "@core/components/patient/patient-risk-panel"
import { DictateButton } from "@core/components/ui/dictate-button"
import { BeforeAfterPicker } from "@core/components/patient/before-after-picker"
import Link from "next/link"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { fmtLEK, fmtEUR } from "@core/lib/currency"
import type { PatientDocument } from "@core/types"

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

export default function DoktorPacientProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('doktor-pacient-detaje')
  const {
    patients, appointments, treatments, invoices, addDocument, addDocumentsBatch, deleteDocument, getDocumentsByPatient,
  } = useData()

  const [clinicalNote, setClinicalNote] = useState("")
  const [uploadOpen, setUploadOpen] = useState(false)

  const patient = patients.find((p) => p.id === id)
  const patientAppointments = (appointments || []).filter((a) => a.patientId === id)
  const patientTreatments   = (treatments   || []).filter((t) => t.patientId === id)
  const patientInvoices     = (invoices     || []).filter((i) => i.patientId === id)
  const patientDocuments    = getDocumentsByPatient(id)

  const handleAddDocument = async (file: File, category: PatientDocument['category']) => {
    try { await addDocument(id, file, category); toast.success(`"${file.name}" u ngarkua`) }
    catch (err) { toast.error(err instanceof Error ? err.message : "Gabim gjatë ngarkimit") }
  }
  const handleAddDocumentsBatch = async (files: File[], imageSubtype: string) => {
    try {
      const result = await addDocumentsBatch(id, files, imageSubtype)
      if (result.failed.length > 0) {
        toast.error(`${result.documents.length} imazhe u ngarkuan, ${result.failed.length} dështuan`)
      } else {
        toast.success(`${result.documents.length} imazhe u ngarkuan me sukses`)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Gabim gjatë ngarkimit të imazheve")
    }
  }
  const handleDeleteDocument = async (docId: string) => {
    try { await deleteDocument(docId); toast.success("Dokumenti u fshi") }
    catch (err) { toast.error(err instanceof Error ? err.message : "Gabim gjatë fshirjes") }
  }

  const handlePrint = () => {
    if (!patient) return
    const logoUrl = `${window.location.origin}/logo.png`
    const printDate = new Date().toLocaleDateString('sq-AL', { year: 'numeric', month: 'long', day: 'numeric' })
    const totalPaidVal    = patientInvoices.filter(i => i.status === 'paguar').reduce((s, i) => s + (i.totalAmount || 0), 0)
    const totalPendingVal = patientInvoices.filter(i => i.status !== 'paguar').reduce((s, i) => s + (i.remainingAmount || 0), 0)

    const infoRow = (l: string, v: string) =>
      v ? `<div class="ir"><span class="l">${l}</span><span class="v">${v}</span></div>` : ''

    const tRows = patientTreatments.slice(0, 15).map(t =>
      `<tr><td>${t.date?.substring(0,10)||'—'}</td><td>${t.type||'—'}</td><td>${t.treatmentArea||'—'}</td><td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${t.description||'—'}</td><td style="text-align:right;font-weight:600;white-space:nowrap">${t.cost?`${t.cost.toLocaleString()} L`:'—'}</td></tr>`
    ).join('')
    const tExtra = patientTreatments.length > 15 ? `<tr><td colspan="5" style="color:#64748b;font-style:italic;padding-top:4px">+ ${patientTreatments.length - 15} trajtime të tjera…</td></tr>` : ''

    const styles = `
      *{box-sizing:border-box;margin:0;padding:0}
      .prt{font-family:'Segoe UI',Arial,sans-serif;font-size:11px;color:#1e293b;background:#fff;padding:22px 28px}
      .hdr{display:flex;align-items:flex-start;justify-content:space-between;padding-bottom:9px;border-bottom:2px solid #1d4ed8;margin-bottom:12px}
      .hdr img{height:24px;width:auto}
      .hdr-r{text-align:right}
      .hdr-r .t{font-size:13px;font-weight:700;color:#1d4ed8}
      .hdr-r .d{font-size:9.5px;color:#64748b;margin-top:2px}
      .pat{display:flex;align-items:center;gap:8px;margin-bottom:9px}
      .pat .n{font-size:15px;font-weight:700;color:#0f172a}
      .pat .pid{font-size:9.5px;color:#2563eb;font-family:monospace;border:1px solid #bfdbfe;padding:1px 5px;border-radius:3px}
      .pat .st{font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:99px;background:#dbeafe;color:#1d4ed8}
      .info2{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:9px;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden}
      .ir{display:flex;gap:0;padding:3px 8px;border-bottom:1px solid #f1f5f9}
      .ir:last-child{border-bottom:none}
      .ir .l{color:#64748b;min-width:80px;font-size:9.5px}
      .ir .v{color:#1e293b;font-weight:500}
      .alg{font-size:10px;margin-bottom:9px;padding:4px 8px;border-left:2px solid #1d4ed8;color:#1e293b}
      .alg b{color:#1d4ed8;margin-right:4px}
      .sh{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2563eb;padding-bottom:3px;border-bottom:1px solid #bfdbfe;margin:10px 0 5px}
      .sh:first-child{margin-top:0}
      .hist{padding-left:0;list-style:none}
      .hist li{padding:2px 0 2px 10px;font-size:10.5px;color:#334155;position:relative}
      .hist li::before{content:'·';position:absolute;left:0;color:#2563eb;font-weight:700}
      table{width:100%;border-collapse:collapse;font-size:10px}
      th{padding:3px 6px;text-align:left;font-size:8.5px;text-transform:uppercase;letter-spacing:.07em;color:#2563eb;border-bottom:1.5px solid #1d4ed8;font-weight:700}
      td{padding:3px 6px;border-bottom:1px solid #f1f5f9;color:#334155;vertical-align:top}
      tr:last-child td{border-bottom:none}
      .fin{display:flex;gap:10px;margin-top:5px}
      .fb{flex:1;padding:5px 10px;border:1px solid #bfdbfe;border-radius:3px;background:#eff6ff}
      .fb .fl{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#2563eb}
      .fb .fv{font-size:14px;font-weight:700;color:#1d4ed8;margin-top:1px}
      .ftr{margin-top:12px;padding-top:6px;border-top:1px solid #e2e8f0;text-align:center;font-size:9px;color:#94a3b8}
      .test-banner{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;text-align:center;font-weight:700;font-size:9.5px;letter-spacing:.03em;padding:6px 10px;border-radius:5px;margin-bottom:10px;text-transform:uppercase}
      @media print{.prt{padding:14px 20px}@page{margin:.5cm;size:A4}}
    `

    const leftCol = [
      infoRow('Telefoni', patient.phone || ''),
      infoRow('Email', patient.email || ''),
      infoRow('Adresa', patient.address || ''),
    ].filter(Boolean)

    const rightCol = [
      infoRow('Datëlindja', patient.dateOfBirth || ''),
      infoRow('Gjinia', patient.gender === 'M' ? 'Mashkull' : patient.gender === 'F' ? 'Femër' : ''),
      infoRow('Gjaku', patient.bloodType || ''),
    ].filter(Boolean)

    const body = `
      <div class="test-banner">&#9888; Dokument për Qëllime Testimi — Sistemi Hypocrates në Zhvillim, Jo i Vlefshëm Realisht</div>
      <div class="hdr">
        <img src="${logoUrl}" alt="Hypocrates" onerror="this.style.display='none'"/>
        <div class="hdr-r"><div class="t">Kartelë Pacienti</div><div class="d">${printDate}</div></div>
      </div>

      <div class="pat">
        <span class="n">${patient.firstName} ${patient.lastName}</span>
        <span class="pid">#${patient.id.slice(0,8).toUpperCase()}</span>
        <span class="st">${patient.status === 'aktiv' ? 'Aktiv' : 'Joaktiv'}</span>
      </div>

      <div class="info2">
        <div>${leftCol.join('')}</div>
        <div style="border-left:1px solid #e2e8f0">${rightCol.join('')}</div>
      </div>

      ${patient.allergies?.length ? `<div class="alg"><b>⚠ Alergji:</b>${patient.allergies.join(', ')}</div>` : ''}

      ${patient.medicalHistory?.length ? `
        <div class="sh">Historiku Mjekësor</div>
        <ul class="hist">${patient.medicalHistory.map(h => `<li>${h}</li>`).join('')}</ul>
      ` : ''}

      ${patientTreatments.length > 0 ? `
        <div class="sh">Trajtimet (${patientTreatments.length})</div>
        <table>
          <thead><tr><th>Data</th><th>Lloji</th><th>Zona</th><th>Përshkrimi</th><th style="text-align:right">Çmimi</th></tr></thead>
          <tbody>${tRows}${tExtra}</tbody>
        </table>
      ` : ''}

      ${patientInvoices.length > 0 ? `
        <div class="sh">Financiare</div>
        <div class="fin">
          <div class="fb"><div class="fl">Paguar</div><div class="fv">${totalPaidVal.toLocaleString()} L</div></div>
          <div class="fb"><div class="fl">Në Pritje</div><div class="fv">${totalPendingVal.toLocaleString()} L</div></div>
        </div>
      ` : ''}

      <div class="ftr">Hypocrates &middot; Rruga Dëshmorët e Kombit, Tiranë &middot; +355 69 000 0000 &middot; info@hypocrates.local &middot; ${printDate}</div>
    `

    const wrap = document.createElement('div')
    wrap.id = '__pt'
    wrap.innerHTML = `<style>${styles}</style><div class="prt">${body}</div>`

    const media = document.createElement('style')
    media.id = '__pm'
    media.textContent = `@media print{body>*:not(#__pt){display:none!important}#__pt{display:block!important}}@media screen{#__pt{display:none!important}}`

    document.head.appendChild(media)
    document.body.appendChild(wrap)
    window.print()
    document.head.removeChild(media)
    document.body.removeChild(wrap)
  }

  if (!patient) {
    return (
      <>
        <Topbar />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
              <Icon name="person_off" size={32} className="text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-base font-semibold text-foreground">{t('notFound.title')}</p>
              <p className="text-sm text-muted-foreground/60 mt-1">{t('notFound.subtitle')}</p>
            </div>
            <Link href="/doktor/pacientet">
              <Button className="gap-2 rounded-xl"><Icon name="arrow_back" size={16} />{t('notFound.backToList')}</Button>
            </Link>
          </div>
        </div>
      </>
    )
  }

  const fullName = `${patient.firstName} ${patient.lastName}`
  const totalPaid    = patientInvoices.filter(i => i.status === 'paguar').reduce((s, i) => s + (i.totalAmount || 0), 0)
  const totalPending = patientInvoices.filter(i => i.status !== 'paguar').reduce((s, i) => s + (i.remainingAmount || 0), 0)
  const upcomingApts = patientAppointments.filter(a => a.status === 'planifikuar' || a.status === 'ne_pritje')

  return (
    <>
      <Topbar />

      <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 space-y-5">

        {/* Header row */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link href="/doktor/pacientet">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
              <Icon name="arrow_back" size={15} />
              {t('header.back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5 rounded-xl hidden sm:flex" onClick={handlePrint}>
              <Icon name="print" size={15} />
              {t('header.print')}
            </Button>
            <Link href={`/doktor/recetat?pacient=${patient.id}`}>
              <Button variant="outline" size="sm" className="gap-1.5 rounded-xl">
                <Icon name="description" size={15} />
                <span className="hidden sm:inline">{t('header.prescription')}</span>
              </Button>
            </Link>
            <Link href={`/doktor/trajtimet/shto?pacient=${patient.id}`}>
              <Button size="sm" className="gap-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground">
                <Icon name="add" size={15} />
                {t('header.addTreatment')}
              </Button>
            </Link>
          </div>
        </div>

        {/* Patient hero */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="h-1.5 bg-accent" />
          <div className="p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start gap-5">

              {/* Details */}
              <div className="flex items-start gap-4 flex-1 min-w-0">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-xl font-bold text-foreground leading-tight">{fullName}</h1>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
                      patient.status === 'aktiv' ? 'chip-green' : 'chip-neutral'
                    )}>
                      {patient.status === 'aktiv' ? t('status.active') : t('status.inactive')}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground/60 mt-0.5 font-mono">#{patient.id.slice(0, 8).toUpperCase()}</p>

                  <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                    {patient.phone && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="phone" size={13} className="ic-blue" />{patient.phone}
                      </span>
                    )}
                    {patient.email && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="mail" size={13} className="text-muted-foreground/60" />{patient.email}
                      </span>
                    )}
                    {patient.dateOfBirth && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="cake" size={13} className="text-muted-foreground/60" />{patient.dateOfBirth}
                      </span>
                    )}
                    {patient.gender && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="person" size={13} className="text-muted-foreground/60" />
                        {patient.gender === 'M' ? t('gender.male') : t('gender.female')}
                      </span>
                    )}
                    {patient.bloodType && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="water_drop" size={13} className="ic-red" />{patient.bloodType}
                      </span>
                    )}
                    {patient.address && (
                      <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Icon name="location_on" size={13} className="text-muted-foreground/60" />{patient.address}
                      </span>
                    )}
                  </div>

                  {patient.allergies && patient.allergies.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-3">
                      <Icon name="warning" size={14} className="ic-red shrink-0" />
                      <span className="text-xs font-semibold ic-red mr-1">{t('allergiesLabel')}</span>
                      {patient.allergies.map((a, i) => (
                        <span key={i} className="chip-red text-xs font-medium px-2 py-0.5 rounded-full">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Stat chips — plain counts, not status indicators, so one calm
                  accent tone throughout rather than an arbitrary rainbow per chip. */}
              <div className="flex items-center gap-2 sm:shrink-0">
                {[
                  { value: patientAppointments.length, label: t('statChips.appointments'), icon: 'calendar_month' },
                  { value: patientTreatments.length,   label: t('statChips.treatments'),   icon: 'stethoscope'    },
                  { value: patientInvoices.length,     label: t('statChips.invoices'),     icon: 'receipt'        },
                ].map(({ value, label, icon }) => (
                  <div key={label} className="flex flex-col items-center gap-1 px-3 py-3 rounded-xl border border-border/50 bg-accent/5">
                    <Icon name={icon} size={15} className="text-accent" />
                    <p className="text-xl font-bold leading-none text-accent">{value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <PatientRiskPanel patientId={patient.id} />

        {/* Tabbed content */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <Tabs defaultValue="overview">
            {/* Tab bar */}
            <div className="px-2 sm:px-5 pt-4 overflow-x-auto">
              <TabsList className="flex-wrap h-auto">
                {[
                  { value: 'overview',   icon: 'badge',          label: t('tabs.overview')  },
                  { value: 'treatments', icon: 'stethoscope',    label: t('tabs.treatments')  },
                  { value: 'payments',   icon: 'receipt',        label: t('tabs.payments')    },
                  { value: 'documents',  icon: 'folder_open',    label: t('tabs.documents') },
                ].map(({ value, icon, label }) => (
                  <TabsTrigger key={value} value={value} className="gap-1.5 whitespace-nowrap">
                    <Icon name={icon} size={14} />
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* Përmbledhje — contact/personal details, clinical notes, medical
                history and upcoming appointments in one scannable tab (was
                two separate "Details"/"History" tabs — merged since they're
                both just reference info a doctor skims once per visit). */}
            <TabsContent value="overview" className="p-5 sm:p-6 space-y-6 m-0">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('info.contactHeading')}</p>
                  {[
                    { icon: 'phone',    label: t('info.phone'), value: patient.phone || '—'   },
                    { icon: 'mail',     label: t('info.email'),    value: patient.email || '—'   },
                    { icon: 'home',     label: t('info.address'),   value: patient.address || '—' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                        <Icon name={icon} size={15} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground/60 font-medium">{label}</p>
                        <p className="text-sm text-foreground font-medium">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('info.personalHeading')}</p>
                  {[
                    { icon: 'cake',        label: t('info.dateOfBirth'),     value: patient.dateOfBirth || '—' },
                    { icon: 'person',      label: t('info.gender'),          value: patient.gender === 'M' ? t('gender.male') : patient.gender === 'F' ? t('gender.female') : '—' },
                    { icon: 'water_drop',  label: t('info.bloodType'), value: patient.bloodType || '—' },
                  ].map(({ icon, label, value }) => (
                    <div key={label} className="flex items-center gap-3 p-3 bg-secondary/50 rounded-xl">
                      <div className="w-8 h-8 rounded-lg bg-card border border-border flex items-center justify-center shrink-0">
                        <Icon name={icon} size={15} className="text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-[11px] text-muted-foreground/60 font-medium">{label}</p>
                        <p className="text-sm text-foreground font-medium">{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('history.medicalHistoryHeading')}</p>
                  {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
                    <div className="space-y-2">
                      {patient.medicalHistory.map((item, idx) => (
                        <div key={idx} className="flex items-start gap-3 p-3.5 bg-secondary/50 rounded-xl">
                          <Icon name="article" size={15} className="text-muted-foreground/60 shrink-0 mt-0.5" />
                          <p className="text-sm text-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center gap-2">
                      <Icon name="article" size={28} className="text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground/60">{t('history.noMedicalHistory')}</p>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('history.upcomingHeading')}</p>
                  {upcomingApts.length > 0 ? (
                    <div className="space-y-2">
                      {upcomingApts.map((apt) => (
                        <div key={apt.id} className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-xl">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                              <Icon name="calendar_month" size={18} className="text-accent" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground">{apt.date?.substring(0, 10)} · {apt.time}</p>
                              <p className="text-xs text-muted-foreground mt-0.5 truncate">{apt.type || t('history.visitFallback')}{apt.doctorName ? ` — ${apt.doctorName}` : ''}</p>
                            </div>
                          </div>
                          <StatusBadge status={apt.status} type="appointment" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-8 text-center gap-2">
                      <Icon name="event_available" size={28} className="text-muted-foreground/30" />
                      <p className="text-sm text-muted-foreground/60">{t('history.noUpcoming')}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('info.clinicalNotesHeading')}</p>
                  <DictateButton onTranscript={(text) => setClinicalNote((p) => (p ? p + ' ' : '') + text)} />
                </div>
                <Textarea
                  placeholder={t('info.clinicalNotesPlaceholder')}
                  value={clinicalNote}
                  onChange={(e) => setClinicalNote(e.target.value)}
                  className="min-h-[100px] resize-none rounded-xl border-border focus-visible:ring-accent/30"
                />
                <Button
                  onClick={() => { if (clinicalNote.trim()) { toast.success("Shënimi u ruajt"); setClinicalNote("") } }}
                  disabled={!clinicalNote.trim()}
                  className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
                >
                  <Icon name="save" size={15} />
                  {t('info.saveNote')}
                </Button>
              </div>
            </TabsContent>

            {/* Trajtimet */}
            <TabsContent value="treatments" className="p-5 sm:p-6 m-0">
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('treatmentsTab.heading')}</p>
                {patientTreatments.length > 0 ? (
                  <div className="space-y-2">
                    {patientTreatments.map((t) => (
                      <div key={t.id} className="flex items-start justify-between p-4 bg-secondary/50 rounded-xl hover:bg-secondary/60 transition-colors">
                        <div className="flex items-start gap-3 min-w-0">
                          <div className="w-9 h-9 rounded-xl ibg-green flex items-center justify-center shrink-0 mt-0.5">
                            <Icon name="stethoscope" size={17} className="ic-green" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{t.type}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.description}</p>
                            <div className="flex flex-wrap items-center gap-3 mt-1.5">
                              <span className="text-xs text-muted-foreground/60">{t.date?.substring(0, 10)}</span>
                              {t.treatmentArea && <span className="text-xs bg-secondary text-muted-foreground px-1.5 py-0.5 rounded font-mono">{t.treatmentArea}</span>}
                            </div>
                            {(t.soapSubjective || t.soapObjective || t.soapAssessment || t.soapPlan) && (
                              <div className="grid grid-cols-2 gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                                {t.soapSubjective && <p className="line-clamp-1"><span className="font-semibold text-accent">S:</span> {t.soapSubjective}</p>}
                                {t.soapObjective && <p className="line-clamp-1"><span className="font-semibold text-accent">O:</span> {t.soapObjective}</p>}
                                {t.soapAssessment && <p className="line-clamp-1"><span className="font-semibold text-accent">A:</span> {t.soapAssessment}</p>}
                                {t.soapPlan && <p className="line-clamp-1"><span className="font-semibold text-accent">P:</span> {t.soapPlan}</p>}
                              </div>
                            )}
                          </div>
                        </div>
                        {t.cost ? (
                          <span className="inline-flex flex-col items-end shrink-0 ml-3">
                            <span className="text-sm font-bold text-foreground">{fmtLEK(t.cost)}</span>
                            <span className="text-xs text-muted-foreground">{fmtEUR(t.cost)}</span>
                          </span>
                        ) : null}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 text-center gap-2">
                    <Icon name="stethoscope" size={32} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground/60">{t('treatmentsTab.empty')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Pagesat */}
            <TabsContent value="payments" className="p-5 sm:p-6 space-y-5 m-0">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 ibg-green rounded-xl border border-border/50">
                  <p className="text-[11px] font-semibold ic-green uppercase tracking-wide">{t('payments.paid')}</p>
                  <p className="text-2xl font-bold ic-green mt-1">{fmtLEK(totalPaid)}</p>
                  <p className="text-xs ic-green opacity-70">{fmtEUR(totalPaid)}</p>
                </div>
                <div className="p-4 ibg-amber rounded-xl border border-border/50">
                  <p className="text-[11px] font-semibold ic-amber uppercase tracking-wide">{t('payments.pending')}</p>
                  <p className="text-2xl font-bold ic-amber mt-1">{fmtLEK(totalPending)}</p>
                  <p className="text-xs ic-amber opacity-70">{fmtEUR(totalPending)}</p>
                </div>
              </div>
              <div className="space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('payments.invoicesHeading')}</p>
                {patientInvoices.length > 0 ? (
                  <div className="space-y-2">
                    {patientInvoices.map((inv) => (
                      <div key={inv.id} className="flex items-center justify-between p-3.5 bg-secondary/50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
                            inv.status === 'paguar' ? 'ibg-green' : 'ibg-amber'
                          )}>
                            <Icon name="receipt" size={17} className={inv.status === 'paguar' ? 'ic-green' : 'ic-amber'} />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">#{inv.id.slice(-6).toUpperCase()}</p>
                            <p className="text-xs text-muted-foreground/60 mt-0.5">{inv.createdAt?.substring(0, 10) || inv.date || '—'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="inline-flex flex-col items-end">
                            <span className="text-sm font-bold text-foreground">{fmtLEK(inv.totalAmount || 0)}</span>
                            <span className="text-xs text-muted-foreground">{fmtEUR(inv.totalAmount || 0)}</span>
                          </span>
                          <StatusBadge status={inv.status} type="invoice" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center py-10 text-center gap-2">
                    <Icon name="receipt" size={32} className="text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground/60">{t('payments.empty')}</p>
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Dokumentet */}
            <TabsContent value="documents" className="p-5 sm:p-6 space-y-4 m-0">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-muted-foreground/60 uppercase tracking-wider">{t('documents.heading')}</p>
                <div className="flex items-center gap-2">
                  <BeforeAfterPicker documents={patientDocuments} />
                  <Button
                    onClick={() => setUploadOpen(true)}
                    size="sm"
                    className="gap-1.5 rounded-xl bg-accent hover:bg-accent/90 text-accent-foreground"
                  >
                    <Icon name="upload" size={14} />
                    {t('documents.upload')}
                  </Button>
                </div>
              </div>
              <DocumentList
                documents={patientDocuments}
                onDelete={handleDeleteDocument}
                onUploadClick={() => setUploadOpen(true)}
              />
            </TabsContent>
          </Tabs>
        </div>

      </div>

      <DocumentUpload
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onUpload={handleAddDocument}
        onUploadBatch={handleAddDocumentsBatch}
        patientName={fullName}
      />
    </>
  )
}
