import { api } from '@/services/api/axios'
import type {
  AuditEntry, IcccEvent, Officer, OfficerInput, Pass, Settings, User, UserInput, Vehicle, VehicleInput, Ward,
} from '@/types/api'

export const wardsApi = {
  list: () => api.get<{ count: number; wards: Ward[] }>('/wards').then((r) => r.data.wards),
}

export const officersApi = {
  list: (p: { ward_code?: string; active_only?: boolean } = {}) =>
    api.get<Officer[] | { officers: Officer[] }>('/officers', { params: p }).then((r) => (Array.isArray(r.data) ? r.data : r.data.officers)),
  create: (b: OfficerInput) => api.post<Officer>('/officers', b).then((r) => r.data),
  update: (id: number, b: Partial<OfficerInput>) => api.put<Officer>(`/officers/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/officers/${id}`).then((r) => r.data),
}

export const vehiclesApi = {
  list: (p: { ward_code?: string; active_only?: boolean } = {}) =>
    api.get<Vehicle[] | { vehicles: Vehicle[] }>('/vehicles', { params: p }).then((r) => (Array.isArray(r.data) ? r.data : r.data.vehicles)),
  create: (b: VehicleInput) => api.post<Vehicle>('/vehicles', b).then((r) => r.data),
  update: (id: string, b: VehicleInput) => api.put<Vehicle>(`/vehicles/${encodeURIComponent(id)}`, b).then((r) => r.data),
  remove: (id: string) => api.delete(`/vehicles/${encodeURIComponent(id)}`).then((r) => r.data),
}

export const usersApi = {
  list: () => api.get<{ users: User[] }>('/users').then((r) => r.data.users),
  create: (b: UserInput) => api.post<User>('/users', b).then((r) => r.data),
  update: (id: number, b: UserInput) => api.put<User>(`/users/${id}`, b).then((r) => r.data),
  remove: (id: number) => api.delete(`/users/${id}`).then((r) => r.data),
}

export const settingsApi = {
  get: () => api.get<Settings>('/settings').then((r) => r.data),
  update: (b: Partial<Settings>) => api.put<Settings>('/settings', b).then((r) => r.data),
}

export const auditApi = {
  list: (limit = 100) => api.get<{ entries: AuditEntry[] }>('/audit', { params: { limit } }).then((r) => r.data.entries),
}

export const icccApi = {
  events: (limit = 20) =>
    api.get<{ events: IcccEvent[] }>('/integrations/iccc/events', { params: { limit } }).then((r) => r.data.events),
}

export const passesApi = {
  list: () => api.get<{ passes: Pass[] }>('/passes').then((r) => r.data.passes),
}
