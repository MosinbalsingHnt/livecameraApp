import { Bell, Camera, CheckCircle2, RotateCcw, Send, UserPlus, XCircle } from 'lucide-react'
import { useState } from 'react'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardTitle, Label, SectionLabel, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MiniMap } from '@/components/ui/mini-map'
import { Select } from '@/components/ui/select'
import { useOfficers } from '@/features/admin/hooks/useAdmin'
import { fmtDateTime, fmtTime, pct } from '@/lib/utils'
import { useAuthStore } from '@/store/authStore'
import { useUiStore } from '@/store/uiStore'
import { LIFECYCLE_STATUSES, OPEN_STATUSES, type Alert } from '@/types/api'
import { useAlert, useAssign, useCloseAlert, useDismiss, useNotify, useOverride, useRecipients, useReopen, useTimeline } from '../hooks/useAlerts'
import { SlaCell } from './SlaCell'

const DISMISS_PRESETS = ['Not garbage', 'Duplicate', 'Private land', 'Already cleared']

export function AlertDrawer() {
  const id = useUiStore((s) => s.drawerAlertId)
  const close = useUiStore((s) => s.closeAlert)
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && close()} title={id ? `Alert ${id}` : 'Alert'} variant="sheet">
      {id && <DrawerBody id={id} />}
    </Dialog>
  )
}

function DrawerBody({ id }: { id: string }) {
  const { data: alert, isLoading, error } = useAlert(id)
  const timeline = useTimeline(id)
  if (isLoading) return <Skeleton className="h-96" />
  if (error || !alert) return <p className="text-sm text-danger">Could not load this alert.</p>

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={alert.status} />
        <TypeBadge type={alert.type} />
        {alert.seen_count > 1 && <span className="text-xs text-muted-foreground">seen {alert.seen_count}×</span>}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4">
          <Card className="space-y-3 p-3">
            <div className="grid h-44 place-items-center rounded-xl border border-dashed bg-muted text-center text-muted-foreground">
              <div>
                <Camera className="mx-auto mb-1 size-7" />
                <p className="text-sm font-semibold">Photo pending</p>
                <p className="font-mono text-xs">{alert.snapshot_path ?? 'no evidence file'}</p>
              </div>
            </div>
            <MiniMap lat={alert.latitude} lon={alert.longitude} color={alert.type === 'Heap' ? '#A63A14' : '#15508F'} />
          </Card>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <SectionLabel>Detection</SectionLabel>
              <p>{alert.type}</p>
              <p className="text-muted-foreground">Best {pct(alert.best_confidence)} · avg {pct(alert.avg_confidence)}</p>
              {alert.track_id != null && <p className="text-muted-foreground">Track #{alert.track_id}</p>}
            </Card>
            <Card>
              <SectionLabel>Location</SectionLabel>
              <p className="font-semibold">{alert.ward ?? '—'}</p>
              <p className="text-muted-foreground">{alert.ward_code ?? ''}</p>
              <p className="text-muted-foreground">Road: {alert.road_segment ?? '—'}</p>
              <p className="font-mono text-xs text-muted-foreground">{alert.latitude.toFixed(5)}, {alert.longitude.toFixed(5)}</p>
            </Card>
            <Card>
              <SectionLabel>Source</SectionLabel>
              <p>{alert.vehicle_id ?? '—'}</p>
              <p className="text-muted-foreground">Raised {fmtDateTime(alert.created_at)}</p>
              <p className="text-muted-foreground">Last seen {fmtDateTime(alert.last_detected_at)}</p>
            </Card>
          </div>
        </div>

        <div className="space-y-4">
          <Card>
            <SectionLabel>SLA</SectionLabel>
            <div className="flex items-center justify-between gap-2">
              <SlaCell alert={alert} />
              <span className="text-sm text-muted-foreground">Due {fmtDateTime(alert.due_at)}</span>
            </div>
            {alert.assigned_to && (
              <p className="mt-3 text-sm">Assigned to <b>{alert.assigned_to}</b><span className="text-muted-foreground"> · {fmtDateTime(alert.assigned_at)}</span></p>
            )}
            {alert.cant_reason && <p className="mt-2 rounded-lg bg-danger-soft px-3 py-2 text-sm font-medium text-danger">Crew could not clear: {alert.cant_reason}</p>}
            {alert.dismiss_reason && <p className="mt-2 text-sm text-muted-foreground">Dismissed: {alert.dismiss_reason}</p>}
            {alert.closure_source && <p className="mt-2 text-sm text-muted-foreground">Closed by {alert.closure_source.replace('_', ' ')} · {fmtDateTime(alert.closed_at)}</p>}
          </Card>
          <Actions alert={alert} />
          <Card>
            <CardTitle className="text-sm">Timeline</CardTitle>
            {timeline.isLoading ? <Skeleton className="h-24" /> : (
              <ol className="space-y-2">
                {timeline.data?.map((t, i) => (
                  <li key={i} className="flex gap-3 border-b pb-2 text-sm last:border-0">
                    <time className="w-12 shrink-0 font-mono text-xs text-muted-foreground" title={fmtDateTime(t.t)}>{fmtTime(t.t)}</time>
                    <div className="min-w-0">
                      <p>{t.message}</p>
                      <p className="text-xs text-muted-foreground">{t.actor} · {t.action.replace('_', ' ')}</p>
                    </div>
                  </li>
                ))}
                {!timeline.data?.length && <p className="text-sm text-muted-foreground">No activity yet.</p>}
              </ol>
            )}
          </Card>
        </div>
      </div>
    </div>
  )
}

function Actions({ alert }: { alert: Alert }) {
  const role = useAuthStore((s) => s.user?.role)
  const canTriage = role === 'admin' || role === 'operator'
  if (!canTriage) return <Card><p className="text-sm text-muted-foreground">Read-only access.</p></Card>
  const isOpen = OPEN_STATUSES.includes(alert.status)

  return (
    <>
      {alert.status === 'New' && <AssignCard alert={alert} />}
      {isOpen && <DismissCard alert={alert} />}
      <Card className="flex flex-wrap gap-2">
        {isOpen && alert.status !== 'New' && <CloseButton id={alert.alert_id} />}
        {(alert.status === 'Cleared' || alert.status === 'Dismissed') && <ReopenButton id={alert.alert_id} />}
        {isOpen && alert.status !== 'New' && <NotifyBlock id={alert.alert_id} />}
      </Card>
      {role === 'admin' && <OverrideCard alert={alert} />}
    </>
  )
}

function AssignCard({ alert }: { alert: Alert }) {
  const officers = useOfficers({ ward_code: alert.ward_code ?? undefined }, !!alert.ward_code)
  const assign = useAssign()
  const [officerId, setOfficerId] = useState('')
  return (
    <Card>
      <CardTitle className="text-sm">Assign</CardTitle>
      <Label>Officer in {alert.ward_code ?? 'ward'}</Label>
      <Select
        value={officerId}
        onChange={setOfficerId}
        options={[{ value: '', label: 'Ward sanitary officer (default)' }, ...(officers.data ?? []).map((o) => ({ value: String(o.officer_id), label: o.name }))]}
      />
      <Button className="mt-3 w-full" loading={assign.isPending} onClick={() => assign.mutate({ id: alert.alert_id, officer_id: officerId ? Number(officerId) : undefined })}>
        <UserPlus className="size-4" /> Assign and notify
      </Button>
    </Card>
  )
}

function DismissCard({ alert }: { alert: Alert }) {
  const dismiss = useDismiss()
  const [reason, setReason] = useState('')
  return (
    <Card>
      <CardTitle className="text-sm">Dismiss (false positive)</CardTitle>
      <div className="mb-2 flex flex-wrap gap-1.5">
        {DISMISS_PRESETS.map((p) => (
          <Button key={p} size="sm" variant={reason === p ? 'default' : 'secondary'} onClick={() => setReason(p)}>{p}</Button>
        ))}
      </div>
      <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (saved for model tuning)" />
      <Button variant="danger" className="mt-3 w-full" disabled={!reason.trim()} loading={dismiss.isPending} onClick={() => dismiss.mutate({ id: alert.alert_id, reason: reason.trim() })}>
        <XCircle className="size-4" /> Dismiss alert
      </Button>
    </Card>
  )
}

function CloseButton({ id }: { id: string }) {
  const m = useCloseAlert()
  return <Button loading={m.isPending} onClick={() => m.mutate(id)}><CheckCircle2 className="size-4" /> Close manually</Button>
}
function ReopenButton({ id }: { id: string }) {
  const m = useReopen()
  return <Button variant="secondary" loading={m.isPending} onClick={() => m.mutate(id)}><RotateCcw className="size-4" /> Reopen</Button>
}

function NotifyBlock({ id }: { id: string }) {
  const notify = useNotify()
  const [show, setShow] = useState(false)
  const rec = useRecipients(id, show)
  return (
    <div className="w-full space-y-2">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" loading={notify.isPending} onClick={() => notify.mutate(id)}><Send className="size-3.5" /> Re-send email</Button>
        <Button variant="ghost" size="sm" onClick={() => setShow((s) => !s)}><Bell className="size-3.5" /> {show ? 'Hide' : 'Who gets notified'}</Button>
      </div>
      {show && (
        <ul className="rounded-lg bg-muted p-2 text-sm">
          {rec.isLoading && <li className="text-muted-foreground">Loading…</li>}
          {rec.data?.officers.map((o) => <li key={o.officer_id}>{o.name} <span className="text-muted-foreground">· {o.email ?? 'no email'}</span></li>)}
          {rec.data && !rec.data.officers.length && <li className="text-muted-foreground">No active officers in this ward.</li>}
        </ul>
      )}
    </div>
  )
}

function OverrideCard({ alert }: { alert: Alert }) {
  const m = useOverride()
  const [status, setStatus] = useState<string>(alert.status)
  return (
    <Card>
      <CardTitle className="text-sm">Admin override</CardTitle>
      <div className="flex gap-2">
        <Select value={status} onChange={setStatus} options={LIFECYCLE_STATUSES.map((s) => ({ value: s, label: s }))} />
        <Button variant="secondary" disabled={status === alert.status} loading={m.isPending} onClick={() => m.mutate({ id: alert.alert_id, status })}>Apply</Button>
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">Audited. Use only to correct a stuck alert.</p>
    </Card>
  )
}
