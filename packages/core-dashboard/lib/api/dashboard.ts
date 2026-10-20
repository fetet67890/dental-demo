import api from '../api-client'

export interface DashboardStats {
  stats: {
    totalPatients:          number
    totalAppointmentsToday: number
    totalRevenue:           number
    pendingPayments:        number
    totalAppointments:      number
    completedTreatments:    number
  }
  monthlyRevenue: Array<{ month: string; revenue: number }>
  appointmentsByStatus: Array<{ status: string; count: number }>
  todayAppointments: Array<{
    id:          string
    patientName: string
    doctorName:  string
    time:        string
    type:        string
    status:      string
  }>
}

export function getDashboardStats(): Promise<DashboardStats> {
  return api.get<DashboardStats>('/api/dashboard/stats')
}

export interface RevenueForecast {
  history: Array<{ month: string; revenue: number }>
  forecast: Array<{ month: string; revenue: number; projected: true }>
  trend: { slope: number; direction: 'up' | 'down' | 'flat' } | null
  insufficientData: boolean
}

export function getRevenueForecast(months = 3): Promise<RevenueForecast> {
  return api.get<RevenueForecast>(`/api/dashboard/revenue-forecast?months=${months}`)
}
