import api from '../api-client'

export type { PackagePurchaseStatus, PackagePurchase } from './package-purchases.types'
import type { PackagePurchase } from './package-purchases.types'

export function getPackagePurchases(patientId: string): Promise<PackagePurchase[]> {
  return api.get<PackagePurchase[]>(`/api/package-purchases?patientId=${encodeURIComponent(patientId)}`)
}

export function sellPackage(patientId: string, packageId: string): Promise<PackagePurchase> {
  return api.post<PackagePurchase>('/api/package-purchases', { patientId, packageId })
}

export function redeemPackageSession(purchaseId: string, doctorId: string, appointmentId?: string): Promise<PackagePurchase> {
  return api.post<PackagePurchase>(`/api/package-purchases/${purchaseId}/redeem`, { doctorId, appointmentId })
}
