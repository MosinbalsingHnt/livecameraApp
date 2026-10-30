import { Pencil, Plus, Power } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, Td, Th } from '@/components/ui/table'
import { timeAgo } from '@/lib/utils'
import type { Vehicle } from '@/types/api'
import { useDeactivateVehicle, useSaveVehicle, useVehicles, useWards } from '../hooks/useAdmin'
import { ActiveChip, Field, blankToNull } from './shared'

export function VehiclesTab({ isAdmin }: { isAdmin: boolean }) {
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Vehicle | 'new' | null>(null)
  const vehicles = useVehicles({ active_only: !showInactive }, true)
  const deactivate = useDeactivateVehicle()

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <label className="flex items-center gap-2 text-sm"><Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive</label>
        <span className="flex-1" />
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" /> Register vehicle</Button>}
      </div>
      {vehicles.isLoading ? <div className="p-4"><Skeleton className="h-32" /></div> : !vehicles.data?.length ? <EmptyState title="No vehicles registered" hint="Register the vehicle ID the camera app reports. Unregistered vehicles still ingest fine." /> : (
        <Table>
          <thead><tr><Th>Vehicle</Th><Th>Type</Th><Th>Reg. no.</Th><Th>Ward</Th><Th>Link</Th><Th>Last seen</Th><Th>Status</Th>{isAdmin && <Th />}</tr></thead>
          <tbody>
            {vehicles.data.map((v) => (
              <tr key={v.vehicle_id}>
                <Td><p className="font-medium">{v.label ?? v.vehicle_id}</p><p className="font-mono text-xs text-muted-foreground">{v.vehicle_id}</p></Td>
                <Td>{v.vehicle_type ?? '—'}</Td><Td>{v.registration_no ?? '—'}</Td><Td>{v.ward_code ?? '—'}</Td>
                <Td><span className={`rounded-full px-2 py-0.5 text-xs font-bold ${v.online ? 'bg-ok-soft text-ok' : 'bg-warn-soft text-warn'}`}>{v.online ? 'Online' : 'Offline'}</span></Td>
                <Td className="text-muted-foreground">{timeAgo(v.last_seen_at)}</Td>
                <Td><ActiveChip active={v.active} /></Td>
                {isAdmin && (
                  <Td className="whitespace-nowrap text-right">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${v.vehicle_id}`} onClick={() => setEditing(v)}><Pencil className="size-4" /></Button>
                    {v.active && <Button variant="ghost" size="icon" aria-label={`Deactivate ${v.vehicle_id}`} onClick={() => confirm(`Deactivate ${v.vehicle_id}?`) && deactivate.mutate(v.vehicle_id)}><Power className="size-4" /></Button>}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {editing && <VehicleForm vehicle={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function VehicleForm({ vehicle, onClose }: { vehicle: Vehicle | null; onClose: () => void }) {
  const wards = useWards()
  const save = useSaveVehicle()
  const [f, setF] = useState({ vehicle_id: vehicle?.vehicle_id ?? '', label: vehicle?.label ?? '', vehicle_type: vehicle?.vehicle_type ?? '', registration_no: vehicle?.registration_no ?? '', ward_code: vehicle?.ward_code ?? '', device_id: vehicle?.device_id ?? '', active: vehicle?.active ?? true })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={vehicle ? 'Edit vehicle' : 'Register vehicle'}>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault()
        save.mutate({
          id: vehicle?.vehicle_id,
          data: { ...(vehicle ? {} : { vehicle_id: f.vehicle_id.trim() }), label: blankToNull(f.label), vehicle_type: blankToNull(f.vehicle_type), registration_no: blankToNull(f.registration_no), ward_code: f.ward_code || null, device_id: blankToNull(f.device_id), ...(vehicle ? { active: f.active } : {}) },
        }, { onSuccess: onClose })
      }}>
        <Field label="Vehicle ID (as sent by the camera app)"><Input required disabled={!!vehicle} value={f.vehicle_id} onChange={(e) => set('vehicle_id', e.target.value)} placeholder="PCMC-14" /></Field>
        <Field label="Label"><Input value={f.label} onChange={(e) => set('label', e.target.value)} placeholder="Truck 14" /></Field>
        <Field label="Type"><Input value={f.vehicle_type} onChange={(e) => set('vehicle_type', e.target.value)} placeholder="Garbage truck" /></Field>
        <Field label="Registration no."><Input value={f.registration_no} onChange={(e) => set('registration_no', e.target.value)} /></Field>
        <Field label="Ward"><Select value={f.ward_code} onChange={(v) => set('ward_code', v)} options={[{ value: '', label: 'None' }, ...(wards.data ?? []).map((w) => ({ value: w.ward_code, label: `${w.ward_code} · ${w.name}` }))]} /></Field>
        <Field label="Device ID"><Input value={f.device_id} onChange={(e) => set('device_id', e.target.value)} /></Field>
        {vehicle && <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => set('active', v)} /> Active</label>}
        <Button type="submit" className="w-full" loading={save.isPending}>Save</Button>
      </form>
    </Dialog>
  )
}
