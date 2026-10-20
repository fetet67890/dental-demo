import api from '../api-client'

// Mirrors the backend's IMPORTERS registry (Hypocrates-Api/src/controllers/
// data-import.controller.js) — adding an entity there means adding its key
// here (+ a row shape below + a config entry in
// components/settings/import-entity-configs.tsx), nothing else on this file
// needs to change. Routes are already entity-agnostic
// (/api/data-import/:entity/parse|commit) on the backend, so this stays a
// thin, generic pass-through rather than one function pair per entity.
export type ImportEntity = 'patients' | 'appointments' | 'staff' | 'services' | 'inventory'

export interface PatientImportData {
  firstName: string
  lastName: string
  phone: string
  email?: string
  dateOfBirth?: string
  gender: 'M' | 'F'
  address?: string
  bloodType?: string
}

export interface AppointmentImportData {
  patientId: string | null
  doctorId: string | null
  serviceId?: string
  date?: string
  time?: string
  duration: number
  type: string
  status: string
  notes?: string
  // Display-only, resolved server-side — never re-sent on commit.
  patientLabel?: string
  doctorLabel?: string
}

export interface StaffImportData {
  name: string
  email?: string
  phone?: string
  role: 'admin' | 'mjek' | 'recepsion'
  specialization?: string
  joinedAt: string
}

export interface ServiceImportData {
  name: string
  description?: string
  price?: number
  duration: number
  category?: string
  isActive: boolean
}

export interface InventoryImportData {
  name: string
  category?: string
  quantity: number
  unit: string
  lowStockThreshold: number
  expiryDate?: string
  lotNumber?: string
}

export interface ImportDataMap {
  patients: PatientImportData
  appointments: AppointmentImportData
  staff: StaffImportData
  services: ServiceImportData
  inventory: InventoryImportData
}

export interface ImportRow<D> {
  index: number
  data: D
  errors: string[]
  warnings: string[]
  valid: boolean
  duplicate?: boolean
  duplicateInFile?: boolean
}

export type PatientImportRow = ImportRow<PatientImportData>
export type AppointmentImportRow = ImportRow<AppointmentImportData>
export type StaffImportRow = ImportRow<StaffImportData>
export type ServiceImportRow = ImportRow<ServiceImportData>
export type InventoryImportRow = ImportRow<InventoryImportData>

export type ImportRowFor<E extends ImportEntity> = ImportRow<ImportDataMap[E]>
export type AnyImportRow = PatientImportRow | AppointmentImportRow | StaffImportRow | ServiceImportRow | InventoryImportRow

export interface ParseImportResponse<Row> {
  totalRows: number
  validRows: number
  invalidRows: number
  rows: Row[]
}

export interface CommitImportResponse {
  imported: number
  failed: number
  errors: { index: number; reason: string }[]
}

export interface ImportLog {
  id: string
  entity: ImportEntity
  importedBy: string
  totalRows: number
  importedCount: number
  failedCount: number
  errors: { index: number; reason: string }[]
  createdAt: string
}

// Real CSV/Excel parsing (column-alias resolution, per-entity validation,
// duplicate detection against existing records) lives entirely server-side
// — replicating it client-side for the demo isn't worth it for a page a
// walkthrough is unlikely to linger on. Before this explicit guard, demo
// mode fell through to api-client.ts's generic mock fallback, which returns
// `{ id: 'demo-xxxxx' }` for any unmocked POST — nothing like
// ParseImportResponse's real shape — so importo-section.tsx's own shape
// access threw and surfaced as `t('readError')` ("gabim gjatë leximit të
// skedarit"), reading exactly like a real bug instead of an intentional
// demo limit. Same explicit-throw pattern as exportPatientPdf/
// exportPatientData in patients.ts — an honest, specific message instead.
export function parseImportFile<E extends ImportEntity>(entity: E, file: File): Promise<ParseImportResponse<ImportRowFor<E>>> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return Promise.reject(new Error('Importimi i skedarëve nuk është i disponueshëm në demo'))
  const fd = new FormData()
  fd.append('file', file)
  return api.upload<ParseImportResponse<ImportRowFor<E>>>(`/api/data-import/${entity}/parse`, fd)
}

export function commitImportRows<E extends ImportEntity>(entity: E, rows: ImportRowFor<E>[]): Promise<CommitImportResponse> {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') return Promise.reject(new Error('Importimi i skedarëve nuk është i disponueshëm në demo'))
  return api.post<CommitImportResponse>(`/api/data-import/${entity}/commit`, { rows })
}

export function getImportLogs(): Promise<ImportLog[]> {
  return api.get<ImportLog[]>('/api/data-import/logs')
}
