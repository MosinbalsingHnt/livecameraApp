import { BarChart3, Flame, LogOut, Map, Moon, Pause, Play, Settings, Smartphone, Sun, Trash2, TriangleAlert } from 'lucide-react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { AlertDrawer } from '@/features/dashboard/components/AlertDrawer'
import { useStats } from '@/features/dashboard/hooks/useAlerts'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { cn } from '@/lib/utils'
import type { Role } from '@/types/api'

const NAV: { to: string; label: string; icon: typeof Map; roles: Role[]; title: string }[] = [
  { to: '/alerts', label: 'Alerts', icon: TriangleAlert, roles: ['admin', 'operator', 'viewer'], title: 'Garbage alerts' },
  { to: '/map', label: 'Live map', icon: Map, roles: ['admin', 'operator', 'viewer'], title: 'Live map' },
  { to: '/hotspots', label: 'Hotspots', icon: Flame, roles: ['admin', 'operator', 'viewer'], title: 'Repeat hotspots' },
  { to: '/reports', label: 'Reports', icon: BarChart3, roles: ['admin', 'operator', 'viewer'], title: 'Reports and ward performance' },
  { to: '/admin', label: 'Admin', icon: Settings, roles: ['admin', 'operator'], title: 'Admin' },
  { to: '/officer', label: 'My tasks', icon: Smartphone, roles: ['officer'], title: 'My field tasks' },
]

export function AppShell() {
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const { theme, toggleTheme, livePaused, toggleLive } = useUiStore()
  const { pathname } = useLocation()
  const role = user?.role ?? 'viewer'
  const items = NAV.filter((n) => n.roles.includes(role))
  const title = NAV.find((n) => pathname.startsWith(n.to))?.title ?? ''
  const stats = useStats()
  const newCount = stats.data?.cards.new ?? 0

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <aside className="flex shrink-0 items-center gap-1 overflow-x-auto bg-rail p-2 text-rail-foreground lg:sticky lg:top-0 lg:h-screen lg:w-60 lg:flex-col lg:items-stretch lg:p-3">
        <div className="mr-2 flex items-center gap-2.5 px-2 py-1 lg:mb-4 lg:mr-0 lg:py-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand text-brand-foreground"><Trash2 className="size-5" /></span>
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-bold text-white">Garbage Control Room</p>
            <p className="text-[11px] opacity-70">PCMC · AI road detection</p>
          </div>
        </div>
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-white/5', isActive && 'bg-rail-active font-semibold text-white')
            }
          >
            <Icon className="size-5 shrink-0" />
            <span>{label}</span>
            {to === '/alerts' && newCount > 0 && (
              <span className="ml-auto rounded-full bg-accent px-2 py-px text-[11px] font-bold text-[#04202c]">{newCount}</span>
            )}
          </NavLink>
        ))}
        <p className="mt-auto hidden px-3 py-2 text-[11px] leading-relaxed opacity-60 lg:block">
          Hare &amp; Turtle AI Solutions
          <br />
          Map © OpenStreetMap contributors
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-3 gap-y-2 border-b bg-card px-4 py-3 lg:px-6">
          <h1 className="text-lg font-bold lg:text-xl">{title}</h1>
          <span className="flex-1" />
          <span className="inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold">
            <span className={cn('size-2 rounded-full bg-accent', !livePaused && 'animate-pulse')} />
            {livePaused ? 'Paused' : 'Live'}
          </span>
          <Button variant="secondary" size="sm" onClick={toggleLive} aria-pressed={livePaused}>
            {livePaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
            <span className="hidden sm:inline">{livePaused ? 'Resume' : 'Pause'}</span>
          </Button>
          <Button variant="secondary" size="icon" className="size-8" onClick={toggleTheme} aria-label="Toggle theme">
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <div className="flex items-center gap-2 border-l pl-3">
            <div className="hidden text-right leading-tight sm:block">
              <p className="text-sm font-semibold">{user?.name}</p>
              <p className="text-[11px] capitalize text-muted-foreground">
                {user?.role}
                {user?.ward_code ? ` · ${user.ward_code}` : ''}
              </p>
            </div>
            <Button variant="secondary" size="icon" className="size-8" onClick={logout} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </header>
        <main className="w-full max-w-[1600px] flex-1 p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
      <AlertDrawer />
    </div>
  )
}
