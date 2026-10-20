import api from '../api-client'

export type WorkMode = 'fizik' | 'largesi'

export interface AttendanceRecord {
  id: string
  userId: string
  date: string
  clockIn: string | null
  clockOut: string | null
  workMode: WorkMode | null
  workModeSkipped: boolean
}

export interface StaffAttendanceStatus {
  userId: string
  name: string
  role: string
  clockIn: string | null
  clockOut: string | null
  workMode: WorkMode | null
  workModeSkipped: boolean
}

export function getMyAttendance(): Promise<AttendanceRecord | null> {
  return api.get<AttendanceRecord | null>('/api/attendance/me')
}

export function clockIn(): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>('/api/attendance/clock-in', {})
}

export function clockOut(): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>('/api/attendance/clock-out', {})
}

export function setWorkMode(mode: WorkMode | 'skip'): Promise<AttendanceRecord> {
  return api.post<AttendanceRecord>('/api/attendance/work-mode', { mode })
}

export function adminSetWorkMode(userId: string, date: string, mode: WorkMode | null): Promise<AttendanceRecord> {
  return api.put<AttendanceRecord>(`/api/attendance/${userId}/work-mode`, { date, mode })
}

export function getAttendance(date?: string): Promise<{ date: string; staff: StaffAttendanceStatus[] }> {
  return api.get(`/api/attendance${date ? `?date=${date}` : ''}`)
}

export interface StaffAttendanceRisk {
  userId: string
  name: string
  role: string
  daysPresent: number
  lookbackDays: number
  averageDaysPresent: number
  belowAverage: boolean
}

// Attendance *frequency*, not lateness — see staff-attendance-risk.js on the
// backend for why lateness isn't computable without a shift-schedule table.
export function getAttendanceRisk(): Promise<StaffAttendanceRisk[]> {
  return api.get<StaffAttendanceRisk[]>('/api/attendance/risk')
}
