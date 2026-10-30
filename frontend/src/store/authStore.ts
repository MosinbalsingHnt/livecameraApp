import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Role, User } from '@/types/api'

interface AuthState {
  token: string | null
  user: User | null
  setSession: (token: string, user: User) => void
  setUser: (user: User) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      setSession: (token, user) => set({ token, user }),
      setUser: (user) => set({ user }),
      logout: () => set({ token: null, user: null }),
    }),
    { name: 'auth-store' },
  ),
)

export const useRole = (): Role | null => useAuthStore((s) => s.user?.role ?? null)
export const homeFor = (role: Role | null | undefined) => (role === 'officer' ? '/officer' : '/alerts')
