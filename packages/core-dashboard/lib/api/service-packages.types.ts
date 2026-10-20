// See queue.types.ts's header — same reason this is split out of service-packages.ts.
export interface ServicePackage {
  id: string
  name: string
  description?: string
  serviceId: string
  serviceName?: string
  sessionCount: number
  price: number
  validityDays?: number
  isActive: boolean
  sortOrder: number
}
