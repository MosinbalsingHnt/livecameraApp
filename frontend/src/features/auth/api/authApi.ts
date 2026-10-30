import { api } from '@/services/api/axios'
import type { LoginResponse, User } from '@/types/api'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data),
  me: () => api.get<User>('/auth/me').then((r) => r.data),
  changePassword: (current_password: string, new_password: string) =>
    api.post<{ ok: boolean }>('/auth/change-password', { current_password, new_password }).then((r) => r.data),
}
