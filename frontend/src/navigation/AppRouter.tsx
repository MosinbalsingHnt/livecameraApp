import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from '@/components/layout/AppShell'
import { Skeleton } from '@/components/ui/card'
import LoginPage from '@/features/auth/screens/LoginPage'
import { homeFor, useAuthStore } from '@/store/authStore'
import { ProtectedRoute, RoleRoute } from './guards'

// Map and chart libraries are heavy, so each screen loads on demand.
const AlertsPage = lazy(() => import('@/features/dashboard/screens/AlertsPage'))
const MapPage = lazy(() => import('@/features/dashboard/screens/MapPage'))
const HotspotsPage = lazy(() => import('@/features/hotspots/screens/HotspotsPage'))
const ReportsPage = lazy(() => import('@/features/reports/screens/ReportsPage'))
const AdminPage = lazy(() => import('@/features/admin/screens/AdminPage'))
const OfficerPage = lazy(() => import('@/features/officer/screens/OfficerPage'))

export function AppRouter() {
  const role = useAuthStore((s) => s.user?.role)
  return (
    <Suspense fallback={<Skeleton className="m-6 h-64" />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route element={<RoleRoute roles={['admin', 'operator', 'viewer']} />}>
              <Route path="/alerts" element={<AlertsPage />} />
              <Route path="/map" element={<MapPage />} />
              <Route path="/hotspots" element={<HotspotsPage />} />
              <Route path="/reports" element={<ReportsPage />} />
            </Route>
            <Route element={<RoleRoute roles={['admin', 'operator']} />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>
            <Route element={<RoleRoute roles={['officer']} />}>
              <Route path="/officer" element={<OfficerPage />} />
            </Route>
          </Route>
        </Route>
        <Route path="*" element={<Navigate to={role ? homeFor(role) : '/login'} replace />} />
      </Routes>
    </Suspense>
  )
}
