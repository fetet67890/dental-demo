import api from '../api-client'

// See Hypocrates-Api's demo-reset.controller.js — both actions are gated
// server-side behind ENABLE_DEMO_RESET; getDemoResetStatus lets the UI hide
// them entirely instead of showing buttons that only fail on click.
export function getDemoResetStatus(): Promise<{ enabled: boolean }> {
  return api.get('/api/admin/demo-reset/status')
}

export function wipeClinicData(): Promise<{ tablesCleared: number }> {
  return api.post('/api/admin/demo-reset/wipe', {})
}

export interface RestoreSampleDataResult {
  patients: number
  appointments: number
  treatments: number
  invoices: number
  inventoryItems: number
}

export function restoreSampleData(): Promise<RestoreSampleDataResult> {
  return api.post('/api/admin/demo-reset/restore-sample', {})
}
