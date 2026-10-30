import { Navigate, Outlet } from 'react-router-dom'
import { Skeleton } from '@/components/ui/card'
import { useRestoreSession } from '@/features/auth/hooks/useAuth'
import { homeFor, useAuthStore } from '@/store/authStore'
import type { Role } from '@/types/api'

export function ProtectedRoute() {
  const token = useAuthStore((s) => s.token)
  const user = useAuthStore((s) => s.user)
  const session = useRestoreSession()
  if (!token) return <Navigate to="/login" replace />
  if (!user && session.isPending) return <Skeleton className="m-6 h-40" />
  if (!user) return <Navigate to="/login" replace />
  return <Outlet />
}

/** Sends users who open a page their role can't use back to their own home. */
export function RoleRoute({ roles }: { roles: Role[] }) {
  const role = useAuthStore((s) => s.user?.role)
  if (!role || !roles.includes(role)) return <Navigate to={homeFor(role)} replace />
  return <Outlet />
}
