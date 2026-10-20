// Split out of queue.ts so lib/demo/mock-client.ts can import this shape
// without also pulling in queue.ts's functions (which import ../api-client,
// which itself imports mock-client.ts — that round trip was a real circular
// dependency at the module-graph level, flagged by webpack as "Circular
// dependency between chunks with runtime"). This file has zero imports of
// its own, so nothing can cycle back through it.
export interface QueueEntry {
  id: string
  patientId: string
  patientName: string
  patientPhone: string
  doctorId?: string
  doctorName?: string
  status: 'duke_pritur' | 'thirrur' | 'ne_sherbim' | 'perfunduar' | 'anuluar'
  priority: boolean
  notes?: string
  checkedInAt: string
  calledAt?: string
  completedAt?: string
}
