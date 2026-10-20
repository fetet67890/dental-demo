// Shared "who's least busy" heuristic used by the availability grids and the
// booking dialog to help reception balance load across doctors/rooms. This is
// a live, same-day computation over already-loaded appointment data — not a
// trained model or a historical-pattern prediction.

import type { Appointment } from '@core/types'

export interface ResourceLoad {
  id: string
  name: string
  minutes: number
  count: number
}

export function computeResourceLoad(
  resources: { id: string; name: string }[],
  appointments: Appointment[],
  dateStr: string,
  getResourceId: (apt: Appointment) => string | undefined
): ResourceLoad[] {
  const map = new Map<string, ResourceLoad>(
    resources.map(r => [r.id, { id: r.id, name: r.name, minutes: 0, count: 0 }])
  )
  for (const apt of appointments || []) {
    if (apt.status === 'anuluar' || apt.status === 'mungoi') continue
    const aptDate = (apt.date || apt.data || '').substring(0, 10)
    if (aptDate !== dateStr) continue
    const resId = getResourceId(apt)
    if (!resId) continue
    const entry = map.get(resId)
    if (!entry) continue
    entry.minutes += apt.duration || apt.kohezgjatja || 30
    entry.count += 1
  }
  return Array.from(map.values())
}

// Returns the resource(s) tied for the lowest load, or [] when there's
// nothing meaningful to recommend (fewer than 2 resources, or everyone
// already carries the exact same load — including everyone being free).
export function getLeastBusy(loads: ResourceLoad[]): ResourceLoad[] {
  if (loads.length < 2) return []
  const minutesList = loads.map(l => l.minutes)
  const min = Math.min(...minutesList)
  const max = Math.max(...minutesList)
  if (min === max) return []
  return loads.filter(l => l.minutes === min)
}
