import { api } from '@/services/api/axios'
import type { Alert, AlertsQuery, AlertsResponse, DashboardStats, Recipients, TimelineEntry } from '@/types/api'

/** Drop empty filters so they don't hit the query string. */
const clean = <T extends object>(o: T) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => v !== '' && v != null && v !== false)) as Partial<T>

export const alertsApi = {
  list: (q: AlertsQuery) => api.get<AlertsResponse>('/alerts', { params: clean(q) }).then((r) => r.data),
  get: (id: string) => api.get<Alert>(`/alerts/${id}`).then((r) => r.data),
  timeline: (id: string) =>
    api.get<{ alert_id: string; timeline: TimelineEntry[] }>(`/alerts/${id}/timeline`).then((r) => r.data.timeline),
  recipients: (id: string) => api.get<Recipients>(`/alerts/${id}/recipients`).then((r) => r.data),

  assign: (id: string, b: { officer_id?: number; assigned_to?: string }) =>
    api.post<Alert>(`/alerts/${id}/assign`, b).then((r) => r.data),
  close: (id: string) => api.post<Alert>(`/alerts/${id}/close`).then((r) => r.data),
  dismiss: (id: string, reason: string) => api.post<Alert>(`/alerts/${id}/dismiss`, { reason }).then((r) => r.data),
  reopen: (id: string) => api.post<Alert>(`/alerts/${id}/reopen`).then((r) => r.data),
  override: (id: string, status: string, assigned_to?: string) =>
    api.post<Alert>(`/alerts/${id}/status`, { status, assigned_to }).then((r) => r.data),
  notify: (id: string) =>
    api
      .post<{ alert_id: string; channel: string; sent: boolean; recipients: string[]; reason?: string }>(`/alerts/${id}/notify`)
      .then((r) => r.data),
}

export const statsApi = {
  get: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
}
