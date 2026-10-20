"use client"

import { use, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Topbar } from '@core/components/layout/topbar'
import { useAuth } from '@core/context/auth-context'
import { useData } from '@core/context/data-context'
import { PatientCard } from '@/components/patient/patient-card'
import { Button } from '@core/components/ui/button'
import { 
  Empty, 
  EmptyHeader, 
  EmptyTitle, 
  EmptyDescription, 
  EmptyContent, 
  EmptyMedia 
} from '@core/components/ui/empty'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@core/components/ui/alert-dialog'
import { ArrowLeft, User, Archive, FileDown } from 'lucide-react'
import { toast } from 'sonner'
import { archivePatient, exportPatientPdf } from '@core/lib/api/patients'
import { PortalAccessButton } from '@core/components/patient/portal-access-button'

export default function PatientProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const t = useTranslations('admin-pacientet-detail')
  const { user } = useAuth()
  const {
    getPatient,
    getTreatmentsByPatient,
    invoices,
    appointments,
    documents,
    addDocument,
    addDocumentsBatch,
    deleteDocument,
    getDocumentsByPatient,
    refreshPatients,
  } = useData()
  const [archiving, setArchiving] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [confirmArchive, setConfirmArchive] = useState(false)

  const patient = getPatient(id)
  const treatments = getTreatmentsByPatient(id)
  const patientInvoices = invoices.filter((inv) => inv.patientId === id)
  const patientAppointments = appointments.filter((app) => app.patientId === id)

  const handleAddDocument = async (file: File, category: 'general' | 'id_card' | 'insurance_card' | 'xray') => {
    try {
      await addDocument(id, file, category)
      toast.success(`Dokumenti "${file.name}" u ngarkua me sukses`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të dokumentit')
    }
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
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë ngarkimit të imazheve')
    }
  }

  const handleDeleteDocument = async (docId: string) => {
    try {
      await deleteDocument(docId)
      toast.success('Dokumenti u fshi me sukses')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gabim gjatë fshirjes')
    }
  }

  const handleArchive = async () => {
    if (!patient) return
    try {
      setArchiving(true)
      await archivePatient(id)
      await refreshPatients()
      toast.success('Pacienti u arkivua. Mund ta gjeni në seksionin Arkivë.')
      router.push('/admin/pacientet')
    } catch {
      toast.error('Gabim gjatë arkivimit')
    } finally {
      setArchiving(false)
      setConfirmArchive(false)
    }
  }

  const handleExportPdf = async () => {
    if (!patient) return
    try {
      setExporting(true)
      await exportPatientPdf(id, `${patient.firstName}_${patient.lastName}`)
      toast.success('PDF u shkarkua me sukses')
    } catch {
      toast.error('Gabim gjatë gjenerimit të PDF')
    } finally {
      setExporting(false)
    }
  }

  if (!patient) {
    return (
      <>
        <Topbar title={t('notFound.topbarTitle')} />
        <div className="flex-1 flex items-center justify-center p-6">
          <Empty>
            <EmptyMedia variant="icon">
              <User className="h-6 w-6" />
            </EmptyMedia>
            <EmptyHeader>
              <EmptyTitle>{t('notFound.title')}</EmptyTitle>
              <EmptyDescription>{t('notFound.description')}</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t('notFound.back')}
              </Button>
            </EmptyContent>
          </Empty>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={`${patient.firstName} ${patient.lastName}`}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('back')}
          </Button>
          <div className="flex items-center gap-2">
            <PortalAccessButton patientId={id} patientEmail={patient.email || undefined} />
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
              <FileDown className="h-4 w-4 mr-2" />
              {exporting ? t('exporting') : t('exportPdf')}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmArchive(true)}
              disabled={archiving}
              className="ic-amber border-[var(--p-amber)]/30 hover:bg-[var(--p-amber-bg)]"
            >
              <Archive className="h-4 w-4 mr-2" />
              {archiving ? t('archiving') : t('archive')}
            </Button>
          </div>
        </div>
        <PatientCard
          patient={patient}
          treatments={treatments}
          appointments={patientAppointments}
          invoices={patientInvoices}
          documents={getDocumentsByPatient(id)}
          onAddDocument={handleAddDocument}
          onAddDocumentsBatch={handleAddDocumentsBatch}
          onDeleteDocument={handleDeleteDocument}
          showActions={true}
        />
      </div>

      <AlertDialog open={confirmArchive} onOpenChange={setConfirmArchive}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('archiveDialog.title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('archiveDialog.confirmPrefix')} <strong>{patient.firstName} {patient.lastName}</strong>.
              {' '}{t('archiveDialog.confirmSuffix')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('archiveDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleArchive} className="bg-[var(--p-amber)] hover:opacity-90 text-white">
              {t('archiveDialog.confirm')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
