import { CheckCircle2, ClipboardCheck, Navigation, Play, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { SlaCell } from '@/features/dashboard/components/SlaCell'
import { fmtDateTime } from '@/lib/utils'
import type { Alert } from '@/types/api'
import { useOfficerAction, useOfficerTasks } from '../hooks/useOfficerTasks'

const CANT_PRESETS = ['Needs truck', 'Blocked or private', 'Nothing found', 'Wrong location']

export default function OfficerPage() {
  const { data, isLoading, isError } = useOfficerTasks()
  const act = useOfficerAction()
  const [cantFor, setCantFor] = useState<Alert | null>(null)
  const [reason, setReason] = useState('')

  const submitCant = () => {
    if (!cantFor || !reason.trim()) return
    act.mutate({ id: cantFor.alert_id, kind: 'cant', reason: reason.trim() }, { onSuccess: () => { setCantFor(null); setReason('') } })
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div>
        <h2 className="text-lg font-bold">Ward {data?.ward_code ?? ''} tasks</h2>
        <p className="text-sm text-muted-foreground">Open alerts in your ward. Marking cleared is confirmed by the next camera pass.</p>
      </div>

      {isLoading ? <Skeleton className="h-40" /> : isError ? (
        <Card><EmptyState title="Could not load your tasks" hint="Pull to refresh or check your connection." /></Card>
      ) : !data?.tasks.length ? (
        <Card><EmptyState icon={<CheckCircle2 className="size-10" />} title="No open tasks" hint="Nothing to clear in your ward right now. Thank you." /></Card>
      ) : (
        data.tasks.map((t) => (
          <Card key={t.alert_id} className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-semibold">{t.alert_id}</span>
              <TypeBadge type={t.type} />
              <StatusBadge status={t.status} />
              <span className="ml-auto"><SlaCell alert={t} /></span>
            </div>
            <div>
              <p className="text-base font-semibold">{t.ward ?? t.ward_code}</p>
              <p className="text-sm text-muted-foreground">{t.road_segment ?? 'Road not mapped'} · raised {fmtDateTime(t.created_at)}</p>
              <p className="font-mono text-xs text-muted-foreground">{t.latitude.toFixed(5)}, {t.longitude.toFixed(5)}</p>
            </div>
            {t.cant_reason && <p className="flex gap-2 rounded-lg bg-danger-soft px-3 py-2 text-sm text-danger"><TriangleAlert className="size-4 shrink-0" />Last time: {t.cant_reason}</p>}

            <Button asChild variant="secondary" size="lg" className="w-full">
              <a href={`https://www.google.com/maps/dir/?api=1&destination=${t.latitude},${t.longitude}`} target="_blank" rel="noreferrer"><Navigation className="size-5" /> Navigate</a>
            </Button>
            {t.status === 'Assigned' && (
              <Button size="lg" className="w-full" loading={act.isPending && act.variables?.id === t.alert_id && act.variables.kind === 'start'} onClick={() => act.mutate({ id: t.alert_id, kind: 'start' })}>
                <Play className="size-5" /> Start work
              </Button>
            )}
            {(t.status === 'Assigned' || t.status === 'In Progress') && (
              <>
                <Button size="lg" className="w-full" loading={act.isPending && act.variables?.id === t.alert_id && act.variables.kind === 'cleared'} onClick={() => act.mutate({ id: t.alert_id, kind: 'cleared' })}>
                  <ClipboardCheck className="size-5" /> Mark cleared
                </Button>
                <Button variant="danger" className="w-full" onClick={() => { setCantFor(t); setReason('') }}>Could not clear</Button>
              </>
            )}
            {t.status === 'Awaiting Confirmation' && <p className="text-sm text-muted-foreground">Reported cleared. Waiting for the next camera pass to confirm.</p>}
          </Card>
        ))
      )}

      <Dialog open={!!cantFor} onOpenChange={(o) => !o && setCantFor(null)} title="Could not clear" description={cantFor?.alert_id}>
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {CANT_PRESETS.map((p) => <Button key={p} size="sm" variant={reason === p ? 'default' : 'secondary'} onClick={() => setReason(p)}>{p}</Button>)}
          </div>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason shown to the operator" />
          <Button className="w-full" disabled={!reason.trim()} loading={act.isPending} onClick={submitCant}>Send to operator</Button>
        </div>
      </Dialog>
    </div>
  )
}
