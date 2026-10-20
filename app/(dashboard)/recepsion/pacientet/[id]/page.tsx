"use client"

import { use, useState } from "react"
import { useTranslations } from "next-intl"
import { useAuth } from "@core/context/auth-context"
import { useData } from "@core/context/data-context"
import { Topbar } from "@core/components/layout/topbar"
import { PatientCard } from "@/components/patient/patient-card"
import { Button } from "@core/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@core/components/ui/card"
import {
  ArrowLeft,
  Plus,
  Calendar,
  CreditCard,
  FileDown,
} from "lucide-react"
import Link from "next/link"
import { toast } from "sonner"
import { exportPatientPdf } from "@core/lib/api/patients"
import { PortalAccessButton } from "@core/components/patient/portal-access-button"

export default function RecepsionPacientProfile({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const t = useTranslations('recepsion-pacient-profili')
  const { user } = useAuth()
  const {
    patients,
    appointments,
    treatments,
    invoices,
    documents,
    addDocument,
    addDocumentsBatch,
    deleteDocument,
    getDocumentsByPatient
  } = useData()
  const [exporting, setExporting] = useState(false)

  const patient = patients.find((p) => p.id === id)
  
  // Filter data for this patient
  const patientAppointments = (appointments || []).filter((a) => 
    a.patientId === id || a.patientName?.includes(patient?.firstName || '')
  )
  const patientTreatments = (treatments || []).filter((t) => 
    t.patientId === id || t.patientName?.includes(patient?.firstName || '')
  )
  const patientInvoices = (invoices || []).filter((inv) => 
    inv.patientId === id || inv.patientName?.includes(patient?.firstName || '')
  )

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
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <p className="text-muted-foreground text-lg">{t('notFound.message')}</p>
            <Link href="/recepsion/pacientet">
              <Button>
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t('notFound.back')}
              </Button>
            </Link>
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <Topbar
        title={`${patient.firstName} ${patient.lastName}`}
      />
      <div className="flex-1 overflow-auto p-4 lg:p-8 space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/recepsion/pacientet">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              {t('back')}
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <PortalAccessButton patientId={id} patientEmail={patient.email || undefined} />
            <Button variant="outline" size="sm" onClick={handleExportPdf} disabled={exporting}>
              <FileDown className="mr-2 h-4 w-4" />
              {exporting ? t('exporting') : t('exportPdf')}
            </Button>
            <Link href={`/recepsion/takimet?pacient=${patient.id}`}>
              <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Plus className="mr-2 h-4 w-4" />
                {t('addAppointment')}
              </Button>
            </Link>
          </div>
        </div>
        {/* Patient Card with Documents */}
        <PatientCard
          patient={patient}
          treatments={patientTreatments}
          appointments={patientAppointments}
          invoices={patientInvoices}
          documents={getDocumentsByPatient(id)}
          onAddDocument={handleAddDocument}
          onAddDocumentsBatch={handleAddDocumentsBatch}
          onDeleteDocument={handleDeleteDocument}
          showActions={true}
        />

        {/* Quick Actions */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link href={`/recepsion/takimet?pacient=${patient.id}`} className="block">
            <Card className="border-border/50 hover:border-accent/30 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 ibg-blue rounded-xl">
                  <Calendar className="h-6 w-6 ic-blue" />
                </div>
                <div>
                  <p className="font-semibold">{t('quickActions.createAppointment.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('quickActions.createAppointment.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
          
          <Link href={`/recepsion/faturat?pacient=${patient.id}`} className="block">
            <Card className="border-border/50 hover:border-accent/30 hover:shadow-lg transition-all cursor-pointer">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="p-3 ibg-green rounded-xl">
                  <CreditCard className="h-6 w-6 ic-green" />
                </div>
                <div>
                  <p className="font-semibold">{t('quickActions.viewInvoices.title')}</p>
                  <p className="text-sm text-muted-foreground">{t('quickActions.viewInvoices.subtitle')}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    </>
  )
}
