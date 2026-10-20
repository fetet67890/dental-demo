import api from '@core/lib/api-client'
import type { ImplantPlan, PlanStatus } from '@/types/specialty'

export function getImplantPlans(params?: { patientId?: string; doctorId?: string }): Promise<ImplantPlan[]> {
  const q = new URLSearchParams(params as Record<string, string> || {}).toString()
  return api.get<ImplantPlan[]>(`/api/implant-plans${q ? '?' + q : ''}`)
}

export function getImplantPlan(id: string): Promise<ImplantPlan> {
  return api.get<ImplantPlan>(`/api/implant-plans/${id}`)
}

export interface CreateImplantPlanInput {
  patientId: string
  doctorId: string
  treatmentId?: string
  toothNumbers: string
  brand?: string
  diameterMm?: number
  lengthMm?: number
  cost?: number
  status?: PlanStatus
  notes?: string
  stages?: { stageLabel: string; stageDate?: string }[]
}

export function createImplantPlan(data: CreateImplantPlanInput): Promise<ImplantPlan> {
  return api.post<ImplantPlan>('/api/implant-plans', data)
}

export function updateImplantPlan(id: string, data: Partial<Pick<ImplantPlan, 'brand' | 'diameterMm' | 'lengthMm' | 'cost' | 'status' | 'notes'>>): Promise<ImplantPlan> {
  return api.put<ImplantPlan>(`/api/implant-plans/${id}`, data)
}

export function deleteImplantPlan(id: string): Promise<void> {
  return api.delete(`/api/implant-plans/${id}`)
}

export function updateImplantPlanStage(
  planId: string,
  stageId: string,
  data: { stageDate?: string; appointmentId?: string; status?: PlanStatus }
): Promise<ImplantPlan> {
  return api.put<ImplantPlan>(`/api/implant-plans/${planId}/stages/${stageId}`, data)
}

export function addImplantPlanStage(
  planId: string,
  data: { stageLabel: string; stageDate?: string }
): Promise<ImplantPlan> {
  return api.post<ImplantPlan>(`/api/implant-plans/${planId}/stages`, data)
}

export function deleteImplantPlanStage(planId: string, stageId: string): Promise<ImplantPlan> {
  return api.delete<ImplantPlan>(`/api/implant-plans/${planId}/stages/${stageId}`)
}
