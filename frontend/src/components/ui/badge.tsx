import { cn } from '@/lib/utils'
import type { AlertStatus, AlertType, SlaState } from '@/types/api'

const base = 'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-bold'

export const Badge = ({ className, ...p }: React.HTMLAttributes<HTMLSpanElement>) => (
  <span className={cn(base, 'bg-muted text-muted-foreground', className)} {...p} />
)

const STATUS_STYLE: Record<AlertStatus, string> = {
  New: 'bg-info-soft text-info',
  Assigned: 'bg-warn-soft text-warn',
  'In Progress': 'bg-purple-soft text-purple',
  'Awaiting Confirmation': 'bg-ok-soft text-ok ring-1 ring-ok/30',
  Cleared: 'bg-brand text-brand-foreground',
  Dismissed: 'bg-muted text-muted-foreground',
  Duplicate: 'bg-muted text-muted-foreground',
}

export const StatusBadge = ({ status }: { status: AlertStatus }) => (
  <span className={cn(base, STATUS_STYLE[status] ?? 'bg-muted')}>
    <span className="size-1.5 rounded-full bg-current opacity-80" />
    {status}
  </span>
)

export const TypeBadge = ({ type }: { type: AlertType }) => (
  <span className={cn(base, type === 'Heap' ? 'bg-danger-soft text-danger' : 'bg-muted text-muted-foreground')}>{type}</span>
)

const SLA_STYLE: Record<NonNullable<SlaState>, { cls: string; label: string }> = {
  on_track: { cls: 'bg-ok-soft text-ok', label: 'On track' },
  at_risk: { cls: 'bg-warn-soft text-warn', label: 'At risk' },
  overdue: { cls: 'bg-danger-soft text-danger', label: 'Overdue' },
}

export const SlaBadge = ({ state }: { state: SlaState }) => {
  if (!state) return <span className="text-muted-foreground">—</span>
  const s = SLA_STYLE[state]
  return <span className={cn(base, s.cls)}>{s.label}</span>
}
