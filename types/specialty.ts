// Dental-only types — implant/cosmetic planning + the tooth-condition
// odontogram. Not part of @hypocrates/core-dashboard's shared types since
// no other specialty has an anatomical chart shaped like this one.

export type PlanStatus = 'planifikuar' | 'ne_proces' | 'perfunduar'

export interface ImplantPlanStage {
  id: string
  planId: string
  stageLabel: string
  stageDate?: string
  appointmentId?: string
  appointmentDate?: string
  appointmentTime?: string
  status: PlanStatus
  sortOrder: number
}

export interface ImplantPlan {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  treatmentId?: string
  toothNumbers: string
  brand?: string
  diameterMm?: number
  lengthMm?: number
  cost: number
  status: PlanStatus
  notes?: string
  createdAt: string
  stages: ImplantPlanStage[]
}

export type CosmeticProcedureType = 'faceta' | 'zbardhim' | 'bonding' | 'tjeter'

export interface CosmeticPlanTooth {
  id: string
  toothNumber: number
  procedureType: CosmeticProcedureType
}

export interface CosmeticPlan {
  id: string
  patientId: string
  patientName: string
  doctorId: string
  doctorName: string
  treatmentId?: string
  cost: number
  status: PlanStatus
  notes?: string
  createdAt: string
  teeth: CosmeticPlanTooth[]
}

export type ToothConditionType =
  | 'shendoshe'     // healthy
  | 'mungon'        // missing
  | 'mbushje'       // filling
  | 'kurore'        // crown
  | 'ure'           // bridge
  | 'implant'       // implant
  | 'kanal_rrenjor' // root canal

export interface ToothCondition {
  id: string
  patientId: string
  toothNumber: number
  condition: ToothConditionType
  notes?: string
  updatedBy?: string
  updatedAt: string
}
