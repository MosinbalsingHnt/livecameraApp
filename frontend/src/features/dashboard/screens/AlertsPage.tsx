import { ChevronLeft, ChevronRight, Search, SearchX } from 'lucide-react'
import { useEffect, useState } from 'react'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { useVehicles, useWards } from '@/features/admin/hooks/useAdmin'
import { cn, fmtDateTime } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'
import { LIFECYCLE_STATUSES } from '@/types/api'
import { KpiCards } from '../components/KpiCards'
import { SlaCell } from '../components/SlaCell'
import { useAlerts, useStats } from '../hooks/useAlerts'

const PAGE = 25

function useDebounced<T>(value: T, ms = 350) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export default function AlertsPage() {
  const [status, setStatus] = useState('')
  const [type, setType] = useState('')
  const [ward, setWard] = useState('')
  const [vehicle, setVehicle] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const q = useDebounced(search)
  const openAlert = useUiStore((s) => s.openAlert)

  // any filter change returns to page 1
  useEffect(() => setPage(0), [status, type, ward, vehicle, q])

  const alerts = useAlerts({ status, type, ward_code: ward, vehicle_id: vehicle, q, limit: PAGE, offset: page * PAGE })
  const wards = useWards()
  const vehicles = useVehicles({})
  const stats = useStats()

  const total = alerts.data?.total ?? 0
  const pages = Math.max(1, Math.ceil(total / PAGE))
  const byStatus = stats.data?.by_status ?? {}

  return (
    <div className="space-y-4">
      <KpiCards />

      <Card className="p-0">
        <div className="space-y-3 border-b p-4">
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status filter">
            {['', ...LIFECYCLE_STATUSES].map((s) => (
              <Button key={s || 'all'} size="sm" variant={status === s ? 'default' : 'secondary'} onClick={() => setStatus(s)}>
                {s || 'All'}
                {s && byStatus[s] != null && <span className="opacity-70">{byStatus[s]}</span>}
              </Button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="relative min-w-52 flex-1">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search alert ID, ward, road" aria-label="Search alerts" />
            </div>
            <Select className="w-40" aria-label="Type" value={type} onChange={setType} options={[{ value: '', label: 'All types' }, { value: 'Heap', label: 'Heap' }, { value: 'Scattered litter', label: 'Scattered litter' }]} />
            <Select className="w-52" aria-label="Ward" value={ward} onChange={setWard} options={[{ value: '', label: 'All wards' }, ...(wards.data ?? []).map((w) => ({ value: w.ward_code, label: `${w.ward_code} · ${w.name}` }))]} />
            <Select className="w-40" aria-label="Vehicle" value={vehicle} onChange={setVehicle} options={[{ value: '', label: 'All vehicles' }, ...(vehicles.data ?? []).map((v) => ({ value: v.vehicle_id, label: v.label ?? v.vehicle_id }))]} />
          </div>
        </div>

        {alerts.isLoading ? (
          <div className="space-y-2 p-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
        ) : alerts.isError ? (
          <EmptyState title="Could not load alerts" hint="Check the backend connection and try again." />
        ) : !alerts.data?.alerts.length ? (
          <EmptyState icon={<SearchX className="size-8" />} title="No alerts match" hint="Clear a filter, or wait for the next detection to arrive." />
        ) : (
          <Table className={cn('min-w-[900px]', alerts.isFetching && 'opacity-80')}>
            <thead>
              <tr><Th>Alert</Th><Th>Type</Th><Th>Ward / road</Th><Th>Vehicle</Th><Th>Raised</Th><Th>Status</Th><Th>SLA</Th><Th>Assigned to</Th></tr>
            </thead>
            <tbody>
              {alerts.data.alerts.map((a) => (
                <tr key={a.alert_id} tabIndex={0} onClick={() => openAlert(a.alert_id)} onKeyDown={(e) => e.key === 'Enter' && openAlert(a.alert_id)} className="cursor-pointer hover:bg-muted focus-visible:bg-muted">
                  <Td className="font-mono font-medium">{a.alert_id}{a.seen_count > 1 && <span className="ml-1.5 font-sans text-xs text-muted-foreground">×{a.seen_count}</span>}</Td>
                  <Td><TypeBadge type={a.type} /></Td>
                  <Td>
                    <p className="font-medium">{a.ward ?? a.ward_code ?? '—'}</p>
                    <p className="text-xs text-muted-foreground">{a.road_segment ?? '—'}</p>
                  </Td>
                  <Td>{a.vehicle_id ?? '—'}</Td>
                  <Td className="whitespace-nowrap font-mono text-xs">{fmtDateTime(a.created_at)}</Td>
                  <Td><StatusBadge status={a.status} /></Td>
                  <Td><SlaCell alert={a} /></Td>
                  <Td>{a.assigned_to ?? <span className="text-muted-foreground">—</span>}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        <div className="flex items-center justify-between gap-3 p-3 text-sm text-muted-foreground">
          <span>{total ? `${page * PAGE + 1}–${Math.min(total, (page + 1) * PAGE)} of ${total}` : '0 alerts'}</span>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="icon" className="size-8" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page"><ChevronLeft className="size-4" /></Button>
            <span>Page {page + 1} / {pages}</span>
            <Button variant="secondary" size="icon" className="size-8" disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page"><ChevronRight className="size-4" /></Button>
          </div>
        </div>
      </Card>
    </div>
  )
}
