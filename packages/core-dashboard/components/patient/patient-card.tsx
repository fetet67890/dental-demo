"use client"

// The generic patient-detail card — no specialty-specific tabs/panels of its
// own (compare apps/dental/dashboard and apps/dermatology/dashboard's own
// components/patient/patient-card.tsx, each a full per-app override adding
// tooth-chart/implant/cosmetic or skin-lesion/aesthetic-plan/patch-test
// panels respectively, more honestly modeled as "this fork owns its own
// version" than forced into a generic slot under time pressure — see those
// files' own comments). Any specialty with no such extra tab content (this
// file was lifted verbatim from Gynecology's fork, the first with none)
// should use this shared version directly rather than copying it again.
import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@core/components/ui/card'
import { Button } from '@core/components/ui/button'
import { Badge } from '@core/components/ui/badge'
import { StatusBadge } from '@core/components/ui/status-badge'
import { DocumentUpload } from './document-upload'
import { DocumentList } from './document-list'
import { PatientRiskPanel } from '@core/components/patient/patient-risk-panel'
import { BeforeAfterPicker } from '@core/components/patient/before-after-picker'
import { PatientPackagesPanel } from '@core/components/patient/patient-packages-panel'
import { useTranslations } from 'next-intl'
import {
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Stethoscope,
  CreditCard,
  FileText,
  AlertCircle,
  Printer,
  Edit,
  Heart,
  Upload,
  Megaphone,
} from 'lucide-react'
import type { Patient, Treatment, Appointment, Invoice, PatientDocument } from '@core/types'
import { cn, fmtDate } from '@core/lib/utils'
import { referralSources, type ReferralSource } from '@core/lib/constants'

interface PatientCardProps {
  patient: Patient
  treatments?: Treatment[]
  appointments?: Appointment[]
  invoices?: Invoice[]
  documents?: PatientDocument[]
  onEdit?: () => void
  onAddDocument?: (file: File, category: PatientDocument['category']) => Promise<void>
  onAddDocumentsBatch?: (files: File[], imageSubtype: string) => Promise<void>
  onDeleteDocument?: (id: string) => void
  showActions?: boolean
}

export function PatientCard({
  patient,
  treatments = [],
  appointments = [],
  invoices = [],
  documents = [],
  onEdit,
  onAddDocument,
  onAddDocumentsBatch,
  onDeleteDocument,
  showActions = true,
}: PatientCardProps) {
  const t = useTranslations('patient-card')
  const tSource = useTranslations('referral-sources')
  const [uploadOpen, setUploadOpen] = useState(false)

  const totalPaid = invoices
    .filter(inv => inv.status === 'paguar')
    .reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)

  const totalPending = invoices
    .filter(inv => inv.status !== 'paguar')
    .reduce((sum, inv) => sum + (inv.remainingAmount || 0), 0)

  const upcomingAppointments = appointments
    .filter(apt => apt.status === 'planifikuar' || apt.status === 'ne_pritje')
    .slice(0, 3)

  const recentTreatments = treatments.slice(0, 5)

  return (
    <Card className="border-border/50 shadow-sm overflow-hidden">
      {/* Header */}
      <CardHeader className="pb-0 border-b border-border/50">
        <div className="flex items-start justify-between gap-4 pb-5">
          <div className="flex items-center gap-4">
            <div>
              <CardTitle className="text-xl flex items-center gap-2 flex-wrap">
                {patient.firstName} {patient.lastName}
                <StatusBadge status={patient.visitStatus === 'new' ? 'new' : 'returning'} />
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t('idLabel')}: {patient.id}
              </p>
            </div>
          </div>
          {showActions && (
            <div className="flex gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={onEdit}>
                <Edit className="h-4 w-4 mr-1" />
                {t('actions.edit')}
              </Button>
              <Button variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" />
                {t('actions.print')}
              </Button>
            </div>
          )}
        </div>

        <PatientRiskPanel patientId={patient.id} className="mb-5" />

        {/* Quick stats — plain counts/totals, not status indicators, so one
            calm accent tone throughout instead of an arbitrary color per
            metric (that pattern also made the purple "paid" tile hard to
            read once the glass theme was layered under it). */}
        <div className="grid grid-cols-3 gap-3 pb-5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-border/50">
            <div className="p-2 bg-accent/10 rounded-lg shrink-0">
              <Calendar className="h-4 w-4 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-foreground leading-none">{appointments.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('stats.appointments')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-border/50">
            <div className="p-2 bg-accent/10 rounded-lg shrink-0">
              <Stethoscope className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{treatments.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('stats.treatments')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-xl bg-accent/5 border border-border/50">
            <div className="p-2 bg-accent/10 rounded-lg shrink-0">
              <CreditCard className="h-4 w-4 text-accent" />
            </div>
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{totalPaid.toFixed(0)} <span className="text-sm font-medium">EUR</span></p>
              <p className="text-xs text-muted-foreground mt-0.5">{t('stats.paid')}</p>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="pt-5 pb-6 space-y-10">
        {/* One long page, section after another — no tab bar to click
            through. Each section keeps the same heading text the old
            TabsTrigger used to show, now as a plain section title. */}

        {/* Personal Info */}
        <section className="space-y-6">
          <h2 className="text-lg font-bold text-foreground">{t('tabs.info')}</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('info.contactInfo')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <Phone className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.phone')}</p>
                      <p className="font-medium">{patient.phone || t('info.notAvailable')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <Mail className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.email')}</p>
                      <p className="font-medium">{patient.email || t('info.notAvailable')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <MapPin className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.address')}</p>
                      <p className="font-medium">{patient.address || t('info.notAvailable')}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Personal Details */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                  {t('info.personalDetails')}
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <Calendar className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.dateOfBirth')}</p>
                      <p className="font-medium">{fmtDate(patient.dateOfBirth)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <User className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.gender')}</p>
                      <p className="font-medium">{patient.gender === 'M' ? t('info.male') : t('info.female')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <Heart className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.bloodType')}</p>
                      <p className="font-medium">{patient.bloodType || t('info.notAvailable')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-secondary/30 rounded-xl">
                    <Megaphone className="h-5 w-5 text-accent" />
                    <div>
                      <p className="text-xs text-muted-foreground">{t('info.referralSource')}</p>
                      <p className="font-medium">
                        {patient.referralSource && referralSources.includes(patient.referralSource as ReferralSource)
                          ? tSource(patient.referralSource)
                          : t('info.notAvailable')}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Allergies */}
            {patient.allergies && patient.allergies.length > 0 && (
              <div className="p-4 ibg-red border border-[var(--p-red)]/30 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="h-5 w-5 ic-red" />
                  <h3 className="font-semibold ic-red">{t('info.allergies')}</h3>
                </div>
                <div className="flex flex-wrap gap-2">
                  {patient.allergies.map((allergy, idx) => (
                    <Badge key={idx} variant="destructive" className="chip-red hover:opacity-80">
                      {allergy}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
        </section>

        {/* Medical History */}
        <section className="space-y-4 border-t border-border/50 pt-10">
          <h2 className="text-lg font-bold text-foreground">{t('tabs.history')}</h2>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('history.medicalHistory')}
            </h3>
            {patient.medicalHistory && patient.medicalHistory.length > 0 ? (
              <div className="space-y-3">
                {patient.medicalHistory.map((item, idx) => (
                  <div key={idx} className="p-4 bg-secondary/30 rounded-xl border border-border/50">
                    <p className="text-sm">{item}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('history.noMedicalHistory')}</p>
              </div>
            )}

            {/* Upcoming Appointments */}
            <div className="mt-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                {t('history.upcomingAppointments')}
              </h3>
              {upcomingAppointments.length > 0 ? (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <div key={apt.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-accent/10 rounded-lg">
                          <Calendar className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="font-medium">{fmtDate(apt.date)} — {apt.time}</p>
                          <p className="text-sm text-muted-foreground">{apt.doctorName}</p>
                        </div>
                      </div>
                      <StatusBadge status={apt.status} type="appointment" />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-6">{t('history.noUpcomingAppointments')}</p>
              )}
            </div>
        </section>

        {/* Treatments */}
        <section className="space-y-4 border-t border-border/50 pt-10">
          <h2 className="text-lg font-bold text-foreground">{t('tabs.treatments')}</h2>
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('treatmentsTab.heading')}
            </h3>
            {recentTreatments.length > 0 ? (
              <div className="space-y-3">
                {recentTreatments.map((treatment) => (
                  <div key={treatment.id} className="p-4 bg-secondary/30 rounded-xl border border-border/50 hover:border-accent/30 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 ibg-green rounded-lg">
                          <Stethoscope className="h-5 w-5 ic-green" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{treatment.type}</p>
                          <p className="text-sm text-muted-foreground mt-0.5">{treatment.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span>{fmtDate(treatment.date)}</span>
                            <span>{treatment.doctorName}</span>
                            {treatment.treatmentArea && (
                              <span>{t('treatmentsTab.areaLabel', { area: treatment.treatmentArea })}</span>
                            )}
                          </div>
                          {(treatment.soapSubjective || treatment.soapObjective || treatment.soapAssessment || treatment.soapPlan) && (
                            <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                              {treatment.soapSubjective && <p><span className="font-semibold text-accent">{t('treatmentsTab.soapS')}</span> {treatment.soapSubjective}</p>}
                              {treatment.soapObjective && <p><span className="font-semibold text-accent">{t('treatmentsTab.soapO')}</span> {treatment.soapObjective}</p>}
                              {treatment.soapAssessment && <p><span className="font-semibold text-accent">{t('treatmentsTab.soapA')}</span> {treatment.soapAssessment}</p>}
                              {treatment.soapPlan && <p><span className="font-semibold text-accent">{t('treatmentsTab.soapP')}</span> {treatment.soapPlan}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                      <p className="font-bold text-accent">{treatment.cost} EUR</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>{t('treatmentsTab.noTreatments')}</p>
              </div>
            )}
        </section>

        {/* Payments */}
        <section className="space-y-6 border-t border-border/50 pt-10">
          <h2 className="text-lg font-bold text-foreground">{t('tabs.payments')}</h2>
            {/* Payment Summary */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 ibg-green rounded-2xl border border-[var(--p-green)]/30">
                <p className="text-sm ic-green font-medium">{t('paymentsTab.totalPaid')}</p>
                <p className="text-2xl font-bold ic-green">{totalPaid.toFixed(2)} EUR</p>
              </div>
              <div className="p-4 ibg-amber rounded-2xl border border-[var(--p-amber)]/30">
                <p className="text-sm ic-amber font-medium">{t('paymentsTab.pending')}</p>
                <p className="text-2xl font-bold ic-amber">{totalPending.toFixed(2)} EUR</p>
              </div>
            </div>

            {/* Invoice List */}
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                {t('paymentsTab.invoices')}
              </h3>
              {invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((invoice) => (
                    <div key={invoice.id} className="flex items-center justify-between p-4 bg-secondary/30 rounded-xl border border-border/50">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          invoice.status === 'paguar' ? 'ibg-green' : 'ibg-amber'
                        )}>
                          <CreditCard className={cn(
                            "h-5 w-5",
                            invoice.status === 'paguar' ? 'ic-green' : 'ic-amber'
                          )} />
                        </div>
                        <div>
                          <p className="font-medium">{invoice.id}</p>
                          <p className="text-sm text-muted-foreground">{fmtDate(invoice.date)}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{invoice.totalAmount.toFixed(2)} EUR</p>
                        <StatusBadge status={invoice.status} type="invoice" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <CreditCard className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>{t('paymentsTab.noInvoices')}</p>
                </div>
              )}
            </div>
        </section>

        {/* Documents */}
        <section className="space-y-4 border-t border-border/50 pt-10">
          <h2 className="text-lg font-bold text-foreground">{t('tabs.documents')}</h2>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                {t('documentsTab.heading')}
              </h3>
              <div className="flex items-center gap-2">
                <BeforeAfterPicker documents={documents} />
                {onAddDocument && (
                  <Button onClick={() => setUploadOpen(true)} size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    {t('actions.uploadDocument')}
                  </Button>
                )}
              </div>
            </div>
            <DocumentList
              documents={documents}
              onDelete={onDeleteDocument || (() => {})}
              onUploadClick={() => setUploadOpen(true)}
            />
        </section>


        {/* Packages */}
        <section className="space-y-4 border-t border-border/50 pt-10">
          <h2 className="text-lg font-bold text-foreground">{t('tabs.packages')}</h2>
            <PatientPackagesPanel patientId={patient.id} />
        </section>

        {/* Document Upload Modal */}
        {onAddDocument && (
          <DocumentUpload
            open={uploadOpen}
            onOpenChange={setUploadOpen}
            onUpload={onAddDocument}
            onUploadBatch={onAddDocumentsBatch}
            patientName={`${patient.firstName} ${patient.lastName}`}
          />
        )}
      </CardContent>
    </Card>
  )
}
