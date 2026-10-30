import { useMutation, useQuery } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/authStore'
import { authApi } from '../api/authApi'

export const useLogin = () => {
  const setSession = useAuthStore((s) => s.setSession)
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => authApi.login(email, password),
    onSuccess: (d) => setSession(d.access_token, d.user),
  })
}

/** Re-validates the stored session on app start (token may have expired or the account been deactivated). */
export const useRestoreSession = () => {
  const token = useAuthStore((s) => s.token)
  const setUser = useAuthStore((s) => s.setUser)
  const q = useQuery({ queryKey: ['me', token], queryFn: authApi.me, enabled: !!token, staleTime: 60_000, retry: false })
  useEffect(() => {
    if (q.data) setUser(q.data)
  }, [q.data, setUser])
  return q
}

export const useChangePassword = () =>
  useMutation({ mutationFn: (v: { current: string; next: string }) => authApi.changePassword(v.current, v.next) })
