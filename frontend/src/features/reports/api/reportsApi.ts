import { api } from '@/services/api/axios'
import type { DailyPoint, WardPerformance } from '@/types/api'

export const reportsApi = {
  daily: (days: number) => api.get<{ days: number; series: DailyPoint[] }>('/reports/daily', { params: { days } }).then((r) => r.data.series),
  wards: () => api.get<{ wards: WardPerformance[] }>('/reports/wards').then((r) => r.data.wards),
}
