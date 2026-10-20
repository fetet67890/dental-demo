// See queue.types.ts's header — same reason this is split out of waitlist.ts.
export interface WaitlistEntry {
  id: string
  patientId: string
  patientName: string
  doctorId?: string
  doctorName?: string
  preferredDate?: string
  notes?: string
  status: 'aktiv' | 'njoftuar' | 'plotesuar' | 'anuluar'
  createdAt: string
  notifiedAt?: string
}
