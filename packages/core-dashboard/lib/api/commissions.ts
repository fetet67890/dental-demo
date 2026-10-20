import api from '../api-client'

export interface StaffCommission {
  staffId: string
  staffName: string
  rateType: 'flat' | 'per_service'
  rate?: number
  revenue: number
  commission: number
  serviceCount: number
  // Present only when a payout already exists for this exact period —
  // absence is what the "Mark as Paid" button in commissions-section.tsx
  // checks to decide whether to render.
  payoutId?: string
  paidAt?: string
}

export interface CommissionsReport {
  basis: 'cost' | 'payment'
  from: string
  to: string
  staff: StaffCommission[]
}

export function getCommissions(from: string, to: string): Promise<CommissionsReport> {
  return api.get<CommissionsReport>(`/api/commissions?from=${from}&to=${to}`)
}

export interface CommissionPayout {
  id: string
  staffId: string
  staffName?: string
  periodFrom: string
  periodTo: string
  amount: number
  basis: 'cost' | 'payment'
  paidAt: string
  paidByName?: string
  notes?: string
}

export function getCommissionPayouts(staffId?: string): Promise<CommissionPayout[]> {
  const qs = staffId ? `?staffId=${staffId}` : ''
  return api.get<CommissionPayout[]>(`/api/commission-payouts${qs}`)
}

// The amount is never sent — the API always recomputes it server-side from
// the same calculation getCommissions itself uses, so a payout can never
// reflect a stale or tampered figure the client happened to have on screen.
export function createCommissionPayout(staffId: string, periodFrom: string, periodTo: string): Promise<CommissionPayout> {
  return api.post<CommissionPayout>('/api/commission-payouts', { staffId, periodFrom, periodTo })
}
