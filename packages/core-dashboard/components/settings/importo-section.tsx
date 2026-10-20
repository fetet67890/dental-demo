"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useTranslations } from "next-intl"
import { Card, CardContent } from "@core/components/ui/card"
import { Button } from "@core/components/ui/button"
import { Badge } from "@core/components/ui/badge"
import { Checkbox } from "@core/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@core/components/ui/table"
import { Collapsible, CollapsibleContent } from "@core/components/ui/collapsible"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@core/components/ui/alert-dialog"
import { Upload, FileText, AlertTriangle, CheckCircle2, Loader2, Download, History, HelpCircle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@core/lib/utils"
import { format } from "date-fns"
import { sq } from "date-fns/locale"
import { useData } from "@core/context/data-context"
import {
  parseImportFile, commitImportRows, getImportLogs,
  type ImportEntity, type AnyImportRow, type ImportLog,
} from "@core/lib/api/data-import"
import { IMPORT_ENTITIES, configFor, sampleCsvFor } from "@core/components/settings/import-entity-configs"

// Every entity (patients, appointments, staff, services, inventory, and
// whatever gets registered next in import-entity-configs.tsx) shares this
// exact upload -> guide -> preview/select -> commit -> history flow. Nothing
// in this component branches on entity by name — it only ever reads from
// the active ImportEntityConfig, so adding entity #6 is a config-file edit,
// not a change here.
export function ImportoSection() {
  const t = useTranslations('importo-section')
  const { refreshPatients, refreshAppointments, refreshStaff, refreshServices } = useData()
  const [entity, setEntity] = useState<ImportEntity>('patients')
  const config = configFor(entity)
  // Closed by default — the guide used to be a full-width card that, closed,
  // still took up a whole row looking like an empty/broken section. Now it's
  // reachable only via the help-icon button in the upload card below, and
  // stays hidden until asked for.
  const [guideOpen, setGuideOpen] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [parsing, setParsing] = useState(false)
  const [rows, setRows] = useState<AnyImportRow[] | null>(null)
  const [totals, setTotals] = useState<{ total: number; valid: number; invalid: number } | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [committing, setCommitting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [commitResult, setCommitResult] = useState<{ imported: number; failed: number; errors: { index: number; reason: string }[] } | null>(null)
  const [logs, setLogs] = useState<ImportLog[]>([])
  const [logsLoading, setLogsLoading] = useState(true)

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await getImportLogs())
    } catch {
      // Non-critical: the import flow itself still works without history.
    } finally {
      setLogsLoading(false)
    }
  }, [])

  useEffect(() => { loadLogs() }, [loadLogs])

  const resetPreview = () => {
    setRows(null)
    setTotals(null)
    setSelected(new Set())
    setCommitResult(null)
  }

  const switchEntity = (next: ImportEntity) => {
    setEntity(next)
    resetPreview()
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setParsing(true)
    resetPreview()
    try {
      const data = await parseImportFile(entity, file)
      // parseImportFile's return type is genuinely correlated with `entity`
      // (ImportRowFor<E>), but `entity` here is the widened ImportEntity
      // state type, not a literal — TS can't distribute that generic over
      // AnyImportRow's union the way it can at a call site with a literal
      // key. The runtime shape is always correct (the server responds with
      // exactly the row shape for whichever entity was requested).
      setRows(data.rows as AnyImportRow[])
      setTotals({ total: data.totalRows, valid: data.validRows, invalid: data.invalidRows })
      setSelected(new Set(data.rows.filter((r) => r.valid).map((r) => r.index)))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('readError'))
    } finally {
      setParsing(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const toggleRow = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(index)) next.delete(index)
      else next.add(index)
      return next
    })
  }

  const handleCommit = async () => {
    if (!rows) return
    const rowsToImport = rows.filter((r) => selected.has(r.index))
    if (rowsToImport.length === 0) { toast.error(t('selectAtLeastOne')); return }

    setCommitting(true)
    try {
      const res = await commitImportRows(entity, rowsToImport as never[])
      setCommitResult(res)
      toast.success(t('importedCount', { count: res.imported }))
      setRows(null)
      setTotals(null)
      setSelected(new Set())
      if (res.imported > 0) {
        if (entity === 'patients') await refreshPatients()
        else if (entity === 'appointments') await refreshAppointments()
        else if (entity === 'staff') await refreshStaff()
        else if (entity === 'services') await refreshServices()
        // inventory: its own page fetches fresh on mount, no shared cache to invalidate here.
      }
      await loadLogs()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('commitError'))
    } finally {
      setCommitting(false)
      setConfirmOpen(false)
    }
  }

  const downloadSample = () => {
    const blob = new Blob([sampleCsvFor(config)], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = config.sampleFilename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">

      {/* Results/preview always render first — right after a file is chosen
          or a commit finishes, that's the thing worth seeing immediately,
          not something to scroll past the switcher/upload/guide to find. */}
      {commitResult && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 lg:p-6">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="h-5 w-5 ic-green" />
              <p className="font-semibold text-foreground">{t('importComplete')}</p>
            </div>
            <p className="text-sm text-muted-foreground">
              {t('importedCount', { count: commitResult.imported })}
              {commitResult.failed > 0 && ` ${t('failedCount', { count: commitResult.failed })}`}
            </p>
            {commitResult.errors.length > 0 && (
              <div className="mt-3 space-y-1">
                {commitResult.errors.map((e, i) => (
                  <p key={i} className="text-xs ic-red">{t('rowError', { row: e.index + 1, reason: e.reason })}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {rows && totals && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="p-5 lg:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5 text-muted-foreground">
                  <FileText className="h-4 w-4" />{t('totalRows', { count: totals.total })}
                </span>
                <span className="flex items-center gap-1.5 ic-green">
                  <CheckCircle2 className="h-4 w-4" />{t('validRows', { count: totals.valid })}
                </span>
                {totals.invalid > 0 && (
                  <span className="flex items-center gap-1.5 ic-red">
                    <AlertTriangle className="h-4 w-4" />{t('invalidRows', { count: totals.invalid })}
                  </span>
                )}
              </div>
              <Button onClick={() => setConfirmOpen(true)} disabled={committing || selected.size === 0} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
                {committing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                {t('importSelected', { count: selected.size })}
              </Button>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10" />
                    <TableHead>{t('table.row')}</TableHead>
                    {config.previewColumns.map((col) => (
                      <TableHead key={col.headerKey}>{t(col.headerKey)}</TableHead>
                    ))}
                    <TableHead>{t('table.status')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.index} className={cn(!row.valid && 'ibg-red')}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(row.index)}
                          onCheckedChange={() => toggleRow(row.index)}
                          disabled={!row.valid}
                        />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">#{row.index}</TableCell>
                      {config.previewColumns.map((col) => (
                        <TableCell key={col.headerKey} className="text-sm">{col.cell(row as never)}</TableCell>
                      ))}
                      <TableCell>
                        {row.errors.length > 0 ? (
                          <div className="space-y-0.5">
                            {row.errors.map((e, i) => (
                              <p key={i} className="text-xs ic-red">{e}</p>
                            ))}
                          </div>
                        ) : row.warnings.length > 0 ? (
                          <div className="space-y-0.5">
                            {row.warnings.map((w, i) => (
                              <p key={i} className="text-xs ic-amber">{w}</p>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs ic-green">{t('readyToImport')}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {totals.valid === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">{t('noValidRows')}</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Are-you-sure gate — the actual DB write only fires from here, never
          straight off the "Import Selected" click. */}
      <AlertDialog open={confirmOpen} onOpenChange={(o) => !committing && setConfirmOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm.description', { count: selected.size })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={committing}>{t('confirm.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleCommit() }}
              disabled={committing}
              className="bg-accent hover:bg-accent/90 gap-2"
            >
              {committing && <Loader2 className="h-4 w-4 animate-spin" />}
              {t('confirm.action')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Entity switcher — one button per registered ImportEntityConfig */}
      <div className="flex flex-wrap gap-2">
        {IMPORT_ENTITIES.map((c) => (
          <Button
            key={c.key}
            variant={entity === c.key ? 'accent' : 'outline'}
            size="sm"
            onClick={() => switchEntity(c.key)}
            className="gap-2"
          >
            <c.icon className="h-4 w-4" />{t(c.entityLabelKey)}
          </Button>
        ))}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2.5 bg-accent/10 rounded-xl shrink-0">
                <Upload className="h-5 w-5 text-accent" />
              </div>
              <div>
                <p className="font-semibold text-foreground">{t(config.uploadTitleKey)}</p>
                <p className="text-sm text-muted-foreground mt-0.5">{t(config.uploadDescriptionKey)}</p>
              </div>
            </div>
            {/* Help icon, not a full-width row — the guide it opens stays
                closed by default (see guideOpen's initial state above) so it
                doesn't dominate the page for anyone who already knows the
                format, but this stays visible so it's clear it exists. */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setGuideOpen((o) => !o)}
              aria-expanded={guideOpen}
              className="gap-1.5 text-muted-foreground hover:text-accent shrink-0"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">{guideOpen ? t('guide.toggleHide') : t('guide.toggleShow')}</span>
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => fileInputRef.current?.click()} disabled={parsing} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground">
              {parsing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {parsing ? t('reading') : t('chooseFile')}
            </Button>
            <Button variant="outline" onClick={downloadSample} className="gap-2">
              <Download className="h-4 w-4" />
              {t('downloadSample')}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv,.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      {/* In-depth tutorial: every accepted column (required/optional, every
          alias the parser recognizes, an example value) plus a rendered
          preview of an actual example file — not just a downloadable blob,
          so a staff member can see the expected shape before uploading
          anything. Closed by default, reached only via the help icon above. */}
      <Collapsible open={guideOpen}>
        <CollapsibleContent>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-5 lg:p-6 space-y-6">
              <p className="text-sm text-muted-foreground">{config.guideIntro}</p>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('guide.columnsTitle')}</p>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>{t('guide.column')}</TableHead>
                        <TableHead>{t('guide.requirement')}</TableHead>
                        <TableHead>{t('guide.acceptedNames')}</TableHead>
                        <TableHead>{t('guide.example')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.fields.map((f) => (
                        <TableRow key={f.label}>
                          <TableCell className="text-sm font-medium whitespace-nowrap">{f.label}</TableCell>
                          <TableCell>
                            <Badge variant={f.required ? 'default' : 'outline'} className="whitespace-nowrap">
                              {f.required ? t('guide.required') : t('guide.optional')}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{f.aliases}</TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{f.example || '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{t('guide.previewTitle')}</p>
                <p className="text-sm text-muted-foreground mb-2">{t('guide.previewNote')}</p>
                <div className="overflow-x-auto rounded-lg border border-border/50">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {config.sampleHeaders.map((h) => (
                          <TableHead key={h} className="whitespace-nowrap">{h}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {config.sampleRows.map((row, i) => (
                        <TableRow key={i}>
                          {row.map((cell, j) => (
                            <TableCell key={j} className="text-sm text-muted-foreground whitespace-nowrap">{cell || '—'}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </CardContent>
          </Card>
        </CollapsibleContent>
      </Collapsible>

      <Card className="border-border/50 shadow-sm">
        <CardContent className="p-5 lg:p-6 space-y-4">
          <div className="flex items-center gap-2">
            <History className="h-4 w-4 text-muted-foreground" />
            <p className="font-semibold text-foreground">{t('importHistory')}</p>
          </div>
          {logsLoading ? (
            <p className="text-sm text-muted-foreground">{t('loading')}</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('noImportsYet')}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('table.date')}</TableHead>
                    <TableHead>{t('table.entity')}</TableHead>
                    <TableHead>{t('table.by')}</TableHead>
                    <TableHead>{t('table.rows')}</TableHead>
                    <TableHead>{t('table.imported')}</TableHead>
                    <TableHead>{t('table.failed')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-sm text-muted-foreground">
                        {format(new Date(log.createdAt), 'd MMM yyyy, HH:mm', { locale: sq })}
                      </TableCell>
                      <TableCell className="text-sm">
                        {IMPORT_ENTITIES.some((c) => c.key === log.entity) ? t(`entity.${log.entity}` as never) : log.entity}
                      </TableCell>
                      <TableCell className="text-sm">{log.importedBy || '—'}</TableCell>
                      <TableCell className="text-sm">{log.totalRows}</TableCell>
                      <TableCell className="text-sm ic-green">{log.importedCount}</TableCell>
                      <TableCell className="text-sm">
                        {log.failedCount > 0 ? (
                          <span className="ic-red">{log.failedCount}</span>
                        ) : '0'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
