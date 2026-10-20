import api from '@core/lib/api-client'
import type { CosmeticPlan, CosmeticProcedureType, PlanStatus } from '@/types/specialty'

export function getCosmeticPlans(params?: { patientId?: string; doctorId?: string }): Promise<CosmeticPlan[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<CosmeticPlan[]>(`/api/cosmetic-plans${q ? '?' + q : ''}`)
}

export function getCosmeticPlan(id: string): Promise<CosmeticPlan> {
  return api.get<CosmeticPlan>(`/api/cosmetic-plans/${id}`)
}

export interface CreateCosmeticPlanInput {
  patientId: string
  doctorId: string
  treatmentId?: string
  cost?: number
  status?: PlanStatus
  notes?: string
  teeth: { toothNumber: number; procedureType: CosmeticProcedureType }[]
}

export function createCosmeticPlan(data: CreateCosmeticPlanInput): Promise<CosmeticPlan> {
  return api.post<CosmeticPlan>('/api/cosmetic-plans', data)
}

export function updateCosmeticPlan(id: string, data: Partial<Pick<CosmeticPlan, 'cost' | 'status' | 'notes'>>): Promise<CosmeticPlan> {
  return api.put<CosmeticPlan>(`/api/cosmetic-plans/${id}`, data)
}

export function deleteCosmeticPlan(id: string): Promise<void> {
  return api.delete(`/api/cosmetic-plans/${id}`)
}
