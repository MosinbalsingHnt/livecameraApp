import { MapPinned, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Table, Td, Th } from '@/components/ui/table'
import { useWards } from '../hooks/useAdmin'
import { WardImportDialog } from './WardImportDialog'

export function WardsTab({ isAdmin }: { isAdmin: boolean }) {
  const wards = useWards()
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)

  const list = useMemo(() => {
    const n = q.trim().toLowerCase()
    const all = wards.data ?? []
    return n ? all.filter((w) => `${w.ward_code} ${w.name} ${w.city}`.toLowerCase().includes(n)) : all
  }, [wards.data, q])

  const addButton = isAdmin && (
    <Button onClick={() => setAdding(true)}><Plus className="size-4" /> Add ward</Button>
  )

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="relative min-w-52 max-w-sm flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search code, name or city" aria-label="Search wards" />
        </div>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {wards.data ? `${list.length}${q ? ` of ${wards.data.length}` : ''} ward${wards.data.length === 1 ? '' : 's'}` : '…'}
        </span>
        <span className="flex-1" />
        {addButton}
      </div>

      {wards.isLoading ? (
        <div className="space-y-2 p-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
      ) : wards.isError ? (
        <EmptyState title="Could not load wards" hint="Check the backend connection and try again." />
      ) : !wards.data?.length ? (
        <div className="pb-8">
          <EmptyState
            icon={<MapPinned className="size-9" />}
            title="No wards yet"
            hint="Alerts are matched to a ward by their GPS position, so import the ward boundaries first. Officers and vehicles also need a ward."
          />
          {isAdmin ? <div className="flex justify-center">{addButton}</div> : <p className="text-center text-xs text-muted-foreground">Ask an admin to import ward boundaries.</p>}
        </div>
      ) : !list.length ? (
        <EmptyState title="No ward matches" hint="Try a different search." />
      ) : (
        <Table>
          <thead><tr><Th>Code</Th><Th>Name</Th><Th>City</Th><Th>Source</Th></tr></thead>
          <tbody>
            {list.map((w) => (
              <tr key={w.ward_code} className="hover:bg-muted">
                <Td><span className="rounded-md bg-brand-soft px-2 py-0.5 font-mono text-xs font-bold">{w.ward_code}</span></Td>
                <Td className="font-medium">{w.name}</Td>
                <Td>{w.city || '—'}</Td>
                <Td className="max-w-64 truncate font-mono text-xs text-muted-foreground" title={w.source}>{w.source || '—'}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {!isAdmin && !!wards.data?.length && (
        <p className="border-t px-4 py-3 text-xs text-muted-foreground">Only admins can add or import ward boundaries.</p>
      )}
      {adding && <WardImportDialog onClose={() => setAdding(false)} />}
    </Card>
  )
}
