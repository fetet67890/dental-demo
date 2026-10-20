export type UserRole = 'admin' | 'mjek' | 'recepsion'

export interface User {
  id: string
  email: string
  name: string
  role: UserRole
  avatar?: string
  canAddStaff?: boolean
  mfaEnabled?: boolean
}

export interface Patient {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  gender: 'M' | 'F'
  address: string
  bloodType?: string
  referralSource?: string
  medicalHistory: string[]
  allergies: string[]
  createdAt: string
  lastVisit?: string
  status: 'aktiv' | 'joaktiv'
  archived?: boolean
  archivedAt?: string
  anonymizedAt?: string
  visitStatus?: 'new' | 'returning'
  statusi?: string // Albanian alias for status
  emri?: string // Albanian alias for firstName
  mbiemri?: string // Albanian alias for lastName
}

export interface Appointment {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  date: string
  time: string
  duration: number
  type: string
  serviceId?: string
  roomId?: string | null
  roomName?: string
  status: 'planifikuar' | 'ne_pritje' | 'ne_trajtim' | 'perfunduar' | 'anuluar' | 'mungoi'
  notes?: string
  data?: string // Albanian alias for date
  ora?: string  // Albanian alias for time
  statusi?: string // Albanian alias for status
  pacientId?: string // Albanian alias for patientId
  doktorId?: string // Albanian alias for doctorId
  lloji?: string // Albanian alias for type
  kohezgjatja?: number // Albanian alias for duration
}

export interface Treatment {
  id: string
  patientId: string
  doctorId: string
  doctorName?: string
  appointmentId?: string
  type: string
  description: string
  cost: number
  date: string
  treatmentArea?: string
  status: 'planifikuar' | 'ne_proces' | 'perfunduar'
  notes?: string
  soapSubjective?: string
  soapObjective?: string
  soapAssessment?: string
  soapPlan?: string
  patientName?: string
  acknowledgeAllergies?: boolean
  cmimi?: number // Albanian alias for cost
  lloji?: string // Albanian alias for type
  doktorId?: string // Albanian alias for doctorId
}

export interface TreatmentFollowup {
  id: string
  treatmentId: string
  treatmentType: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  label: string
  dueDate: string
  status: 'ne_pritje' | 'kryer' | 'anuluar' | 'humbur'
  notes?: string
  appointmentId?: string
  createdAt: string
  completedAt?: string
}

export interface OrthoProgression {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  treatmentId?: string
  stageLabel: string
  stageDate: string
  notes?: string
  createdAt: string
}

// implant_plans/cosmetic_plans (dental implant/veneer/whitening planning)
// live in this app's own types/specialty.ts, not here — not part of every
// specialty. See SPECIALTY-ADAPTATION.md.

export interface FollowupTemplate {
  id: string
  treatmentType: string
  label: string
  daysAfter: number
  sortOrder: number
  isActive: boolean
}

export interface OrthoStageTemplate {
  id: string
  label: string
  sortOrder: number
  isActive: boolean
}

// Opaque conversation turns exchanged with the backend AI assistant.
// `content` can be a plain string (what the UI sends) or Anthropic content
// blocks echoed back by the server (tool_use/tool_result) — the frontend
// never needs to interpret it, only pass it back verbatim on the next turn.
export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: unknown
}

export interface Invoice {
  id: string
  patientId: string
  patientName: string
  treatments: string[]
  totalAmount: number
  paidAmount: number
  remainingAmount: number
  status: 'paguar' | 'pjeserisht' | 'papaguar'
  createdAt: string
  dueDate: string
  payments: Payment[]
  date?: string // Alias for createdAt or similar
  statusi?: string // Albanian alias for status
  totali?: number // Albanian alias for totalAmount
}

export interface Payment {
  id: string
  invoiceId: string
  amount: number
  method: 'cash' | 'karte' | 'transfer'
  date: string
  notes?: string
}

export interface Staff {
  id: string
  name: string
  email: string
  role: UserRole
  phone: string
  specialization?: string
  status: 'aktiv' | 'joaktiv'
  joinedAt: string
  canAddStaff?: boolean
  avatar?: string
  commissionEnabled?: boolean
  commissionRateType?: 'flat' | 'per_service'
  commissionRate?: number
  showOnWebsite?: boolean
  websiteBio?: string
  websiteSortOrder?: number
  roli?: string // Albanian alias for role
  emri?: string // Albanian alias for name (first part)
  mbiemri?: string // Albanian alias for name (second part)
}

export interface AuditLog {
  id: string
  action: string
  user: string
  role: UserRole
  timestamp: string
  details: string
}

export interface AppNotification {
  id: string
  type: 'takim' | 'trajtim' | 'pacient' | 'recetë' | 'staf' | 'shërbim' | 'transaksion' | 'faturë'
  title: string
  message: string
  isRead: boolean
  createdAt: string
  href?: string | null
}

export interface DailyTransaction {
  id: string
  type: 'hyrese' | 'dalje'
  amount: number
  description: string
  method: 'cash' | 'karte' | 'transfer'
  createdAt: string
  createdBy: string
}

export interface Prescription {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  medication: string
  dosage: string
  frequency: string
  duration: string
  instructions?: string
  issuedDate: string
  acknowledgeAllergies?: boolean
}

export interface PatientDocument {
  id: string
  patientId: string
  name: string
  type: 'image' | 'pdf'
  // Category/subtype value sets are specialty-owned (see
  // useSpecialtyConfig().documentConfig) — 'general'/'id_card'/
  // 'insurance_card' are the only values every specialty shares.
  category: string
  studyId?: string
  imageSubtype?: string
  size: number
  url: string
  uploadedAt: string
  uploadedBy: string
}

export interface Service {
  id: string
  name: string
  description: string
  price: number
  duration: number
  category: string
  isActive: boolean
}

export interface Room {
  id: string
  name: string
  isActive: boolean
  createdAt: string
}

export interface ClinicDocument {
  id: string
  name: string
  description: string
  fileType: 'image' | 'pdf'
  fileSize: number
  category: 'preventive' | 'personal'
  passwordProtected: boolean
  uploadedBy: string
  uploadedById: string
  uploadedAt: string
}

// ToothConditionType/ToothCondition (dental odontogram state) live in this
// app's own types/specialty.ts, not here. See SPECIALTY-ADAPTATION.md.

export interface NotificationLog {
  id: string
  type: 'email'
  recipient: string
  message: string
  status: 'derguar' | 'deshtuar' | 'ne_pritje'
  createdAt: string
}

export interface PatientService {
  id: string
  patientId: string
  serviceId: string
  serviceName: string
  quantity: number
  priceSnapshot: number
  date: string
  doctorId: string
  doctorName?: string
  appointmentId?: string
  notes?: string
  invoiced: boolean
  invoiceId?: string
}
