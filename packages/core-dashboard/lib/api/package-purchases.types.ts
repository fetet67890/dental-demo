// See queue.types.ts's header — same reason this is split out of package-purchases.ts.
export type PackagePurchaseStatus = 'active' | 'completed' | 'expired'

export interface PackagePurchase {
  id: string
  patientId: string
  packageId?: string
  packageName: string
  serviceId: string
  serviceName: string
  sessionsTotal: number
  sessionsUsed: number
  pricePaid: number
  purchasedAt: string
  expiresAt?: string
  invoiceId?: string
  status: PackagePurchaseStatus
}
