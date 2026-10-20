import api from '../api-client'
import type { AssistantMessage } from '../../types'

// Broadened from a closed union to a plain string — a specialty's own
// entity types (Dental's implant_plan/cosmetic_plan/periodontal_record,
// etc.) are registered via specialty.config.ts's entityDeleteHandlers
// instead of being named in this shared file. See assistant-widget.tsx.
export type PendingDeleteEntityType = string

export interface PendingDeleteAction {
  entityType: PendingDeleteEntityType
  entityId: string
  label: string
}

export interface AssistantChatResponse {
  reply: string
  messages: AssistantMessage[]
  pendingAction: PendingDeleteAction | null
}

// `locale` is the dashboard's own active language (sq/en) — the assistant
// answers in it instead of a language hardcoded on the backend. See
// Hypocrates-Api's assistant.controller.js for the matching system-prompt
// selection.
export function sendAssistantMessage(messages: AssistantMessage[], locale: string): Promise<AssistantChatResponse> {
  return api.post<AssistantChatResponse>('/api/assistant/chat', { messages, locale })
}

export interface AssistantUsageStatusFree {
  provider: string
  model: string
  tier: 'free'
  requestsToday: number
  requestsLastMinute: number
  dailyLimit: number | null
  percentUsed: number | null
}

export interface AssistantUsageStatusPremium {
  provider: string
  model: string
  tier: 'premium'
  spentThisMonthUSD: number
  monthlyCapUSD: number | null
  percentUsed: number | null
}

export type AssistantUsageStatus = AssistantUsageStatusFree | AssistantUsageStatusPremium

export function getAssistantUsageStatus(): Promise<AssistantUsageStatus> {
  return api.get<AssistantUsageStatus>('/api/assistant/usage-status')
}
