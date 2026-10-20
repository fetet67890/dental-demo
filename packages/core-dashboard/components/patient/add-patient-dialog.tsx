"use client"

import { useState, useRef } from "react"
import { useTranslations } from "next-intl"
import { Button } from "@core/components/ui/button"
import { Input } from "@core/components/ui/input"
import { Label } from "@core/components/ui/label"
import { Textarea } from "@core/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@core/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@core/components/ui/select"
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { toastError } from "@core/lib/toast-error"
import { cn } from "@core/lib/utils"
import { referralSources } from "@core/lib/constants"
import type { Patient } from "@core/types"

interface UploadedFile {
  file: File
  preview?: string
  type: 'image' | 'pdf'
}

interface AddPatientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAdd: (patient: Omit<Patient, 'id' | 'createdAt'>, files: File[], assignedDoctorId?: string) => Promise<void>
  doctors?: { id: string; name: string }[]
}

export function AddPatientDialog({ open, onOpenChange, onAdd, doctors = [] }: AddPatientDialogProps) {
  const t = useTranslations('patient-add-patient-dialog')
  const tSource = useTranslations('referral-sources')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "M" as "M" | "F",
    address: "",
    bloodType: "",
    referralSource: "",
    allergies: "",
    medicalNotes: "",
    assignedDoctorId: "",
  })

  const handleFileSelect = (files: FileList | null) => {
    if (!files) return

    const validFiles: UploadedFile[] = []
    
    Array.from(files).forEach(file => {
      const isImage = file.type.startsWith('image/')
      const isPdf = file.type === 'application/pdf'
      
      if (!isImage && !isPdf) {
        toast.error(`${file.name} nuk eshte format i vlefshem. Lejohen vetem imazhe dhe PDF.`)
        return
      }

      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} eshte shume i madh. Madhesia maksimale: 10MB`)
        return
      }

      const uploadedFile: UploadedFile = {
        file,
        type: isImage ? 'image' : 'pdf',
        preview: isImage ? URL.createObjectURL(file) : undefined,
      }
      validFiles.push(uploadedFile)
    })

    setUploadedFiles(prev => [...prev, ...validFiles])
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const removeFile = (index: number) => {
    setUploadedFiles(prev => {
      const file = prev[index]
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((_, i) => i !== index)
    })
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!formData.firstName.trim()) e.firstName = t('errors.firstNameRequired')
    if (!formData.lastName.trim()) e.lastName = t('errors.lastNameRequired')
    if (!formData.phone.trim()) e.phone = t('errors.phoneRequired')
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async () => {
    if (!validate()) {
      toast.error("Hej! Nuk i ke plotësuar të gjitha fushat e detyrueshme.")
      return
    }

    setIsSubmitting(true)
    try {
      const patient: Omit<Patient, 'id' | 'createdAt'> = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        address: formData.address,
        bloodType: formData.bloodType || undefined,
        referralSource: formData.referralSource || undefined,
        medicalHistory: formData.medicalNotes ? [formData.medicalNotes] : [],
        allergies: formData.allergies ? formData.allergies.split(',').map(a => a.trim()) : [],
        status: "aktiv",
      }

      const files = uploadedFiles.map(uf => uf.file)
      await onAdd(patient, files, formData.assignedDoctorId || undefined)

      // Clean up
      uploadedFiles.forEach(uf => {
        if (uf.preview) URL.revokeObjectURL(uf.preview)
      })
      setFormData({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        dateOfBirth: "",
        gender: "M",
        address: "",
        bloodType: "",
        referralSource: "",
        allergies: "",
        medicalNotes: "",
        assignedDoctorId: "",
      })
      setErrors({})
      setUploadedFiles([])
      onOpenChange(false)
      toast.success("Pacienti u regjistrua me sukses!")
    } catch (err) {
      toastError(err, 'Gabim gjatë regjistrimit të pacientit')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    uploadedFiles.forEach(uf => {
      if (uf.preview) URL.revokeObjectURL(uf.preview)
    })
    setUploadedFiles([])
    setErrors({})
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{t('title')}</DialogTitle>
          <DialogDescription>
            {t('description')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          {/* Basic Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('personalDataSection')}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">{t('firstName')}</Label>
                <Input
                  id="firstName"
                  value={formData.firstName}
                  onChange={(e) => { setFormData({ ...formData, firstName: e.target.value }); if (errors.firstName) setErrors(p => ({ ...p, firstName: '' })) }}
                  placeholder={t('firstNamePlaceholder')}
                  className={cn("rounded-xl", errors.firstName && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.firstName && <p className="text-xs text-destructive mt-1">{errors.firstName}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">{t('lastName')}</Label>
                <Input
                  id="lastName"
                  value={formData.lastName}
                  onChange={(e) => { setFormData({ ...formData, lastName: e.target.value }); if (errors.lastName) setErrors(p => ({ ...p, lastName: '' })) }}
                  placeholder={t('lastNamePlaceholder')}
                  className={cn("rounded-xl", errors.lastName && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.lastName && <p className="text-xs text-destructive mt-1">{errors.lastName}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone">{t('phone')}</Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => { setFormData({ ...formData, phone: e.target.value }); if (errors.phone) setErrors(p => ({ ...p, phone: '' })) }}
                  placeholder="+383 4X XXX XXX"
                  className={cn("rounded-xl", errors.phone && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="dateOfBirth">{t('dateOfBirth')}</Label>
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => { setFormData({ ...formData, dateOfBirth: e.target.value }); if (errors.dateOfBirth) setErrors(p => ({ ...p, dateOfBirth: '' })) }}
                  className={cn("rounded-xl", errors.dateOfBirth && "border-destructive focus-visible:ring-destructive/30")}
                />
                {errors.dateOfBirth && <p className="text-xs text-destructive mt-1">{errors.dateOfBirth}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">{t('gender')}</Label>
                <Select
                  value={formData.gender}
                  onValueChange={(value) => setFormData({ ...formData, gender: value as "M" | "F" })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">{t('male')}</SelectItem>
                    <SelectItem value="F">{t('female')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bloodType">{t('bloodType')}</Label>
                <Select
                  value={formData.bloodType}
                  onValueChange={(value) => setFormData({ ...formData, bloodType: value })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue placeholder={t('selectPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">{t('address')}</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder={t('addressPlaceholder')}
                className="rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralSource">{t('referralSource')}</Label>
              <Select
                value={formData.referralSource || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, referralSource: value === "__none__" ? "" : value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('selectPlaceholder')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('unspecified')}</SelectItem>
                  {referralSources.map((src) => (
                    <SelectItem key={src} value={src}>{tSource(src)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="assignedDoctor">{t('assignedDoctor')}</Label>
              <Select
                value={formData.assignedDoctorId || "__none__"}
                onValueChange={(value) => setFormData({ ...formData, assignedDoctorId: value === "__none__" ? "" : value })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder={t('selectDoctor')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">{t('noDoctor')}</SelectItem>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id}>
                      {doc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {doctors.length === 0 && (
                <p className="text-xs text-muted-foreground">{t('noActiveDoctors')}</p>
              )}
            </div>
          </div>

          {/* Medical Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('medicalInfoSection')}
            </h3>
            <div className="space-y-2">
              <Label htmlFor="allergies">{t('allergies')}</Label>
              <Input
                id="allergies"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                placeholder={t('allergiesPlaceholder')}
                className="rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medicalNotes">{t('medicalNotes')}</Label>
              <Textarea
                id="medicalNotes"
                value={formData.medicalNotes}
                onChange={(e) => setFormData({ ...formData, medicalNotes: e.target.value })}
                placeholder={t('medicalNotesPlaceholder')}
                className="rounded-xl min-h-[80px]"
              />
            </div>
          </div>

          {/* Document Upload */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              {t('documentsSection')}
            </h3>

            {/* Drop Zone */}
            <div
              className={cn(
                "border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer",
                dragOver 
                  ? "border-accent bg-accent/5" 
                  : "border-border hover:border-accent/50 hover:bg-secondary/30"
              )}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*,.pdf"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files)}
              />
              <Upload className={cn(
                "h-10 w-10 mx-auto mb-3 transition-colors",
                dragOver ? "text-accent" : "text-muted-foreground"
              )} />
              <p className="text-sm font-medium text-foreground mb-1">
                {t('dropzoneTitle')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('dropzoneSubtitle')}
              </p>
            </div>

            {/* Uploaded Files */}
            {uploadedFiles.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {uploadedFiles.map((uf, index) => (
                  <div
                    key={index}
                    className="relative group bg-secondary/50 rounded-xl p-3 border border-border/50"
                  >
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-md z-10"
                    >
                      <X className="h-3 w-3" />
                    </button>

                    {uf.type === 'image' && uf.preview ? (
                      <div className="aspect-square rounded-lg overflow-hidden mb-2 bg-card">
                        <img
                          src={uf.preview}
                          alt={uf.file.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="aspect-square rounded-lg bg-card flex items-center justify-center mb-2">
                        {uf.type === 'image' ? (
                          <ImageIcon className="h-8 w-8 text-accent" />
                        ) : (
                          <FileText className="h-8 w-8 ic-red" />
                        )}
                      </div>
                    )}

                    <p className="text-xs font-medium truncate">{uf.file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatFileSize(uf.file.size)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} className="rounded-xl">
            {t('cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {t('registering')}
              </>
            ) : (
              t('registerPatient')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
