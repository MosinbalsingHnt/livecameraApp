import { SlaBadge } from '@/components/ui/badge'
import { timeLeft } from '@/lib/utils'
import { OPEN_STATUSES, type Alert } from '@/types/api'

/** SLA state badge + remaining time; closed alerts have no SLA. */
export function SlaCell({ alert }: { alert: Alert }) {
  if (!OPEN_STATUSES.includes(alert.status)) return <span className="text-muted-foreground">—</span>
  const left = timeLeft(alert.due_at)
  return (
    <div className="flex flex-col items-start gap-0.5">
      <SlaBadge state={alert.sla_state} />
      {left && <span className="text-xs text-muted-foreground">{left.mins < 0 ? `${left.text} late` : `${left.text} left`}</span>}
    </div>
  )
}
