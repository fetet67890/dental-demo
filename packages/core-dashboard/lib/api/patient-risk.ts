import api from '../api-client'

export type RiskLevel = 'ulet' | 'mesatar' | 'larte'

export interface PatientRiskSignal {
  points: number
  reasons: string[]
  [key: string]: unknown
}

export interface PatientRisk {
  patientId: string
  patientName: string
  points: number
  level: RiskLevel
  reasons: string[]
  breakdown: {
    financial: PatientRiskSignal & { overdueAmount: number; overdueCount: number; maxDaysOverdue: number }
    engagement: PatientRiskSignal & { isRecallDue: boolean; recallsIgnored: number }
    followups: PatientRiskSignal & { overdueCount: number }
    noShows: PatientRiskSignal & { count: number }
    // Every specialty contributes exactly one more signal here via its own
    // riskSignals entry (see patient-risk.js on the backend) — Dental's is
    // keyed 'periodontal', Dermatology's 'lesions', etc. Neither
    // patient-risk-panel.tsx nor at-risk-patients-panel.tsx reads a specific
    // specialty key (both only use the generic points/reasons/level), so an
    // index signature is enough here; a specialty needing to read its own
    // signal by name can narrow this with its own local cast.
    [specialtySignalKey: string]: PatientRiskSignal & Record<string, unknown>
  }
}

export function getPatientRisk(patientId: string): Promise<PatientRisk> {
  return api.get<PatientRisk>(`/api/patient-risk/${patientId}`)
}

export function getAllPatientRisks(): Promise<PatientRisk[]> {
  return api.get<PatientRisk[]>('/api/patient-risk')
}
