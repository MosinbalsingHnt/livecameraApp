import axios, { AxiosError } from 'axios'
import { toast } from 'sonner'
import { useAuthStore } from '@/store/authStore'

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ?? 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
  timeout: 20000,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token && !config.url?.includes('/auth/login')) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    const status = error.response?.status
    const isLogin = error.config?.url?.includes('/auth/login')
    if (status === 401 && !isLogin) {
      // ProtectedRoute redirects to /login once the token is gone
      if (useAuthStore.getState().token) toast.error('Session expired. Please sign in again.')
      useAuthStore.getState().logout()
    } else if (status === 403) {
      toast.error('Not permitted for your role.')
    }
    return Promise.reject(error)
  },
)

/** Backend errors are `{ detail: string }`; FastAPI 422s may carry a list of issues. */
export function getErrorMessage(err: unknown, fallback = 'Something went wrong'): string {
  if (axios.isAxiosError(err)) {
    if (!err.response) return 'Cannot reach the server. Check the backend URL and your network.'
    const detail = (err.response.data as { detail?: unknown } | undefined)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail)) {
      return detail.map((d: { loc?: unknown[]; msg?: string }) => `${d.loc?.slice(-1)[0] ?? ''}: ${d.msg ?? ''}`).join('; ')
    }
  }
  return err instanceof Error ? err.message : fallback
}
