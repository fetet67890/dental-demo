import api from '../api-client'

export interface AppointmentReminderSettings {
  leadHours: number
  enabled: boolean
}

export interface UpcomingReminderAppointment {
  id: string
  patientId: string
  patientName: string
  patientEmail: string
  date: string
  time: string | null
  type: string
  doctorName: string | null
}

export function getAppointmentReminderSettings(): Promise<AppointmentReminderSettings> {
  return api.get<AppointmentReminderSettings>('/api/appointment-reminders/settings')
}

export function updateAppointmentReminderSettings(data: Partial<AppointmentReminderSettings>): Promise<AppointmentReminderSettings> {
  return api.put<AppointmentReminderSettings>('/api/appointment-reminders/settings', data)
}

export function getDueAppointmentReminders(): Promise<{ leadHours: number; count: number; appointments: UpcomingReminderAppointment[] }> {
  return api.get('/api/appointment-reminders/due')
}

export function sendAppointmentReminders(): Promise<{ skipped: boolean; sent: number; failed: number; total?: number }> {
  return api.post('/api/appointment-reminders/send', {})
}
