import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Table, Td, Th } from '@/components/ui/table'
import { fmtDateTime } from '@/lib/utils'
import { useAudit, useIcccEvents, usePasses } from '../hooks/useAdmin'
import { useUiStore } from '@/store/uiStore'

export function AuditTab() {
  const { data, isLoading } = useAudit()
  const openAlert = useUiStore((s) => s.openAlert)
  return (
    <Card className="p-0">
      {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : !data?.length ? <EmptyState title="No audit entries yet" /> : (
        <Table>
          <thead><tr><Th>Time</Th><Th>Actor</Th><Th>Action</Th><Th>Alert</Th><Th>Message</Th></tr></thead>
          <tbody>
            {data.map((e) => (
              <tr key={e.log_id}>
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDateTime(e.t)}</Td><Td>{e.actor}</Td><Td>{e.action.replace('_', ' ')}</Td>
                <Td>{e.alert_id ? <button className="font-mono text-info underline-offset-2 hover:underline" onClick={() => openAlert(e.alert_id!)}>{e.alert_id}</button> : '—'}</Td>
                <Td className="text-muted-foreground">{e.message}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}

export function IcccTab() {
  const { data, isLoading } = useIcccEvents()
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">Read-model of the lifecycle feed in ICCC envelope format. The outbound push goes live when the city's API spec is available.</p>
      <Card className="p-0">
        {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : !data?.length ? <EmptyState title="No events yet" /> : (
          <Table>
            <thead><tr><Th>Occurred</Th><Th>Event</Th><Th>Alert</Th><Th>Actor</Th><Th>Message</Th></tr></thead>
            <tbody>
              {data.map((e, i) => (
                <tr key={i}>
                  <Td className="whitespace-nowrap font-mono text-xs">{fmtDateTime(e.occurred_at)}</Td>
                  <Td><span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs">{e.event}</span></Td>
                  <Td className="font-mono">{e.alert_id}</Td><Td>{e.actor}</Td><Td className="text-muted-foreground">{e.message}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>
    </div>
  )
}

export function PassesTab() {
  const { data, isLoading } = usePasses()
  return (
    <Card className="p-0">
      {isLoading ? <div className="p-4"><Skeleton className="h-40" /></div> : !data?.length ? <EmptyState title="No vehicle passes yet" /> : (
        <Table>
          <thead><tr><Th>Received</Th><Th>Pass</Th><Th>Vehicle</Th><Th>Run</Th><Th className="text-right">GPS points</Th><Th>Alerts closed</Th></tr></thead>
          <tbody>
            {data.map((p) => (
              <tr key={p.pass_id}>
                <Td className="whitespace-nowrap font-mono text-xs">{fmtDateTime(p.received_at)}</Td><Td className="font-mono">{p.pass_id}</Td><Td>{p.vehicle_id}</Td>
                <Td className="max-w-48 truncate font-mono text-xs" title={p.run_id}>{p.run_id}</Td><Td className="text-right tabular-nums">{p.points}</Td>
                <Td>{p.closed.length ? p.closed.join(', ') : <span className="text-muted-foreground">—</span>}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </Card>
  )
}
