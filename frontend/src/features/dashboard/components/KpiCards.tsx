import { CheckCircle2, Clock, Flame, Hourglass, Truck, TriangleAlert, UserCheck } from 'lucide-react'
import { Skeleton } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useStats } from '../hooks/useAlerts'

export function KpiCards() {
  const { data, isLoading } = useStats()
  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
      </div>
    )
  }
  const c = data.cards
  const tiles = [
    { label: 'New', value: c.new, icon: TriangleAlert, tone: 'text-info' },
    { label: 'Assigned / in progress', value: c.assigned + c.in_progress, icon: UserCheck, tone: 'text-warn' },
    { label: 'Awaiting confirmation', value: c.awaiting_confirmation, icon: Hourglass, tone: 'text-purple' },
    { label: 'SLA at risk', value: c.sla_at_risk, icon: Clock, tone: c.sla_at_risk ? 'text-danger' : '' },
    { label: 'Overdue', value: c.overdue, icon: Flame, tone: c.overdue ? 'text-danger' : '' },
    { label: 'Detected today', value: c.detected_today, icon: TriangleAlert, tone: '' },
    { label: 'Cleared today', value: c.cleared_today, icon: CheckCircle2, tone: 'text-ok' },
    { label: 'Vehicles online', value: `${c.vehicles_online} / ${c.vehicles_registered}`, icon: Truck, tone: '' },
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-8">
      {tiles.map(({ label, value, icon: Icon, tone }) => (
        <div key={label} className="rounded-2xl border bg-card p-3.5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-muted-foreground">{label}</p>
            <Icon className={cn('size-4 shrink-0 text-muted-foreground', tone)} />
          </div>
          <p className={cn('mt-2 text-3xl font-bold tabular-nums leading-none', tone)}>{value}</p>
        </div>
      ))}
    </div>
  )
}
