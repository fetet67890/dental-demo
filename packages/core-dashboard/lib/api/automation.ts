import api from '../api-client'

export interface AutomationRun {
  id: string
  jobName: string
  status: 'success' | 'failure'
  detail: string | null
  startedAt: string
  finishedAt: string
  durationMs: number
}

// One row per known job — its most recent run.
export function getLatestAutomationRuns(): Promise<AutomationRun[]> {
  return api.get<AutomationRun[]>('/api/automation/runs')
}

// Recent history for one job, newest first.
export function getAutomationRunHistory(jobName: string): Promise<AutomationRun[]> {
  return api.get<AutomationRun[]>(`/api/automation/runs/${encodeURIComponent(jobName)}`)
}
