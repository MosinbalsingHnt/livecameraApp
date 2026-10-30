import { api } from '@/services/api/axios'
import type { Alert } from '@/types/api'

export const officerApi = {
  tasks: () => api.get<{ ward_code: string; tasks: Alert[] }>('/officer/tasks').then((r) => r.data),
  start: (id: string) => api.post<Alert>(`/alerts/${id}/start`).then((r) => r.data),
  reportCleared: (id: string) => api.post<Alert>(`/alerts/${id}/report-cleared`).then((r) => r.data),
  cantClear: (id: string, reason: string) => api.post<Alert>(`/alerts/${id}/cant-clear`, { reason }).then((r) => r.data),
}
