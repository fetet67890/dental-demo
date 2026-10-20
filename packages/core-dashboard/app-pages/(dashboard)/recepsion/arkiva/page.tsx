"use client"

import { useState, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Topbar } from "@core/components/layout/topbar"
import { Card, CardContent } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { SearchInput } from "@core/components/ui/search-input"
import { Badge } from "@core/components/ui/badge"
import { Archive, FileDown, Phone, Mail, Calendar } from "lucide-react"
import { toast } from "sonner"
import { getArchivedPatients } from "@core/lib/api/patients"
import type { Patient } from "@core/types"

function formatDate(d?: string) {
  if (!d) return "-"
  return new Date(d).toLocaleDateString("sq-AL", { day: "2-digit", month: "short", year: "numeric" })
}

export default function RecepsionArkiva() {
  const t = useTranslations('recepsion-arkiva')
  const [patients, setPatients] = useState<Patient[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState("")
  const [exporting, setExporting] = useState<string | null>(null)

  const load = useCallback(async (q?: string) => {
    try {
      setLoading(true)
      const data = await getArchivedPatients(q ? { search: q } : undefined)
      setPatients(data)
    } catch {
      toast.error("Gabim gjatë ngarkimit të arkivës")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    const t = setTimeout(() => load(search), 300)
    return () => clearTimeout(t)
  }, [search, load])

  const handleExportPdf = (patient: Patient) => {
    setExporting(patient.id)
    const logoUrl = `${window.location.origin}/logo.png`
    const printDate = new Date().toLocaleDateString("sq-AL", { year: "numeric", month: "long", day: "numeric" })

    const infoRow = (l: string, v: string) =>
      v ? `<div class="ir"><span class="l">${l}</span><span class="v">${v}</span></div>` : ""

    const leftCol = [
      infoRow("Telefoni", patient.phone || ""),
      infoRow("Email", patient.email || ""),
      infoRow("Adresa", patient.address || ""),
    ].filter(Boolean)

    const rightCol = [
      infoRow("Datëlindja", patient.dateOfBirth || ""),
      infoRow("Gjinia", patient.gender === "M" ? "Mashkull" : patient.gender === "F" ? "Femër" : ""),
      infoRow("Gjaku", patient.bloodType || ""),
    ].filter(Boolean)

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
      .pat .st{font-size:9.5px;font-weight:600;padding:1px 7px;border-radius:99px;background:#f1f5f9;color:#64748b}
      .info2{display:grid;grid-template-columns:1fr 1fr;gap:0;margin-bottom:9px;border:1px solid #e2e8f0;border-radius:4px;overflow:hidden}
      .ir{display:flex;gap:0;padding:3px 8px;border-bottom:1px solid #f1f5f9}
      .ir:last-child{border-bottom:none}
      .ir .l{color:#64748b;min-width:80px;font-size:9.5px}
      .ir .v{color:#1e293b;font-weight:500}
      .alg{font-size:10px;margin-bottom:9px;padding:4px 8px;border-left:2px solid #1d4ed8;color:#1e293b}
      .alg b{color:#1d4ed8;margin-right:4px}
      .sh{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.1em;color:#2563eb;padding-bottom:3px;border-bottom:1px solid #bfdbfe;margin:10px 0 5px}
      .hist{padding-left:0;list-style:none}
      .hist li{padding:2px 0 2px 10px;font-size:10.5px;color:#334155;position:relative}
      .hist li::before{content:'·';position:absolute;left:0;color:#2563eb;font-weight:700}
      .arch{font-size:10px;margin-top:10px;padding:4px 8px;border-left:2px solid #94a3b8;color:#64748b}
      .ftr{margin-top:12px;padding-top:6px;border-top:1px solid #e2e8f0;text-align:center;font-size:9px;color:#94a3b8}
      .test-banner{background:#fef2f2;border:2px solid #dc2626;color:#991b1b;text-align:center;font-weight:700;font-size:9.5px;letter-spacing:.03em;padding:6px 10px;border-radius:5px;margin-bottom:10px;text-transform:uppercase}
      @media print{.prt{padding:14px 20px}@page{margin:.5cm;size:A4}}
    `

    const body = `
      <div class="test-banner">&#9888; Dokument për Qëllime Testimi — Sistemi Hypocrates në Zhvillim, Jo i Vlefshëm Realisht</div>
      <div class="hdr">
        <img src="${logoUrl}" alt="Hypocrates" onerror="this.style.display='none'"/>
        <div class="hdr-r"><div class="t">Kartelë Pacienti — Arkivë</div><div class="d">${printDate}</div></div>
      </div>

      <div class="pat">
        <span class="n">${patient.firstName} ${patient.lastName}</span>
        <span class="pid">#${patient.id.slice(0, 8).toUpperCase()}</span>
        <span class="st">Arkivuar</span>
      </div>

      ${(leftCol.length || rightCol.length) ? `
        <div class="info2">
          <div>${leftCol.join("")}</div>
          <div style="border-left:1px solid #e2e8f0">${rightCol.join("")}</div>
        </div>
      ` : ""}

      ${patient.allergies?.length ? `<div class="alg"><b>⚠️ Alergji:</b>${patient.allergies.join(", ")}</div>` : ""}

      ${patient.medicalHistory?.length ? `
        <div class="sh">Historiku Mjekësor</div>
        <ul class="hist">${patient.medicalHistory.map((h: string) => `<li>${h}</li>`).join("")}</ul>
      ` : ""}

      ${patient.archivedAt ? `<div class="arch">Arkivuar më: ${formatDate(patient.archivedAt)}</div>` : ""}

      <div class="ftr">Hypocrates &middot; Rruga Dëshmorët e Kombit, Tiranë &middot; +355 69 000 0000 &middot; info@hypocrates.local &middot; ${printDate}</div>
    `

    const wrap = document.createElement("div")
    wrap.id = "__pt"
    wrap.innerHTML = `<style>${styles}</style><div class="prt">${body}</div>`

    const media = document.createElement("style")
    media.id = "__pm"
    media.textContent = `@media print{body>*:not(#__pt){display:none!important}#__pt{display:block!important}}@media screen{#__pt{display:none!important}}`

    document.head.appendChild(media)
    document.body.appendChild(wrap)
    window.print()
    document.head.removeChild(media)
    document.body.removeChild(wrap)
    setExporting(null)
  }

  return (
    <>
      <Topbar
        title={t('title')}
      />

      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 bg-muted rounded-xl">
              <Archive className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-2xl font-bold">{patients.length}</p>
              <p className="text-xs text-muted-foreground">{t('archivedPatients')}</p>
            </div>
          </CardContent>
        </Card>

        <SearchInput
          placeholder={t('searchPlaceholder')}
          value={search}
          onChange={e => setSearch(e.target.value)}
          containerClassName="max-w-sm"
        />

        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-0">
            {loading ? (
              <div className="py-16 text-center text-muted-foreground">{t('loadingArchive')}</div>
            ) : patients.length === 0 ? (
              <div className="py-16 text-center text-muted-foreground">
                <Archive className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">{t('archiveEmpty')}</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {patients.map(p => (
                  <div key={p.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold">{p.firstName} {p.lastName}</p>
                        <Badge variant="secondary" className="bg-muted text-muted-foreground text-xs">
                          {t('archived')}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1">
                        {p.phone && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Phone className="h-3 w-3" />{p.phone}
                          </span>
                        )}
                        {p.email && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />{p.email}
                          </span>
                        )}
                        {p.archivedAt && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3" />
                            {t('archivedOn', { date: formatDate(p.archivedAt) })}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportPdf(p)}
                      disabled={exporting === p.id}
                      className="gap-1.5 shrink-0"
                    >
                      <FileDown className="h-4 w-4" />
                      {exporting === p.id ? t('generating') : t('downloadPdf')}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  )
}
