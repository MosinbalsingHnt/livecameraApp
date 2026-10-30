import { Pencil, Plus, UserX } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Table, Td, Th } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import type { Officer } from '@/types/api'
import { useDeactivateOfficer, useOfficers, useSaveOfficer, useWards } from '../hooks/useAdmin'
import { ActiveChip, Field, blankToNull } from './shared'

export function OfficersTab({ isAdmin }: { isAdmin: boolean }) {
  const [ward, setWard] = useState('')
  const [showInactive, setShowInactive] = useState(false)
  const [editing, setEditing] = useState<Officer | 'new' | null>(null)
  const wards = useWards()
  const officers = useOfficers({ ward_code: ward || undefined, active_only: !showInactive })
  const deactivate = useDeactivateOfficer()

  return (
    <Card className="p-0">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="w-56"><Select aria-label="Ward" value={ward} onChange={setWard} options={[{ value: '', label: 'All wards' }, ...(wards.data ?? []).map((w) => ({ value: w.ward_code, label: `${w.ward_code} · ${w.name}` }))]} /></div>
        <label className="flex items-center gap-2 text-sm"><Switch checked={showInactive} onCheckedChange={setShowInactive} /> Show inactive</label>
        <span className="flex-1" />
        {isAdmin && <Button onClick={() => setEditing('new')}><Plus className="size-4" /> Add officer</Button>}
      </div>
      {officers.isLoading ? <div className="p-4"><Skeleton className="h-32" /></div> : !officers.data?.length ? <EmptyState title="No officers" hint="Add the sanitary officers who should be notified for each ward." /> : (
        <Table>
          <thead><tr><Th>Name</Th><Th>Ward</Th><Th>Phone</Th><Th>Email</Th><Th>Role</Th><Th>Status</Th>{isAdmin && <Th />}</tr></thead>
          <tbody>
            {officers.data.map((o) => (
              <tr key={o.officer_id}>
                <Td className="font-medium">{o.name}</Td><Td>{o.ward_code}</Td><Td>{o.phone ?? '—'}</Td><Td>{o.email ?? '—'}</Td><Td>{o.role ?? '—'}</Td>
                <Td><ActiveChip active={o.active} /></Td>
                {isAdmin && (
                  <Td className="text-right whitespace-nowrap">
                    <Button variant="ghost" size="icon" aria-label={`Edit ${o.name}`} onClick={() => setEditing(o)}><Pencil className="size-4" /></Button>
                    {o.active && <Button variant="ghost" size="icon" aria-label={`Deactivate ${o.name}`} onClick={() => confirm(`Deactivate ${o.name}? They stop receiving notifications.`) && deactivate.mutate(o.officer_id)}><UserX className="size-4" /></Button>}
                  </Td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {editing && <OfficerForm officer={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function OfficerForm({ officer, onClose }: { officer: Officer | null; onClose: () => void }) {
  const wards = useWards()
  const save = useSaveOfficer()
  const [f, setF] = useState({ name: officer?.name ?? '', ward_code: officer?.ward_code ?? '', phone: officer?.phone ?? '', email: officer?.email ?? '', role: officer?.role ?? '', active: officer?.active ?? true })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={officer ? 'Edit officer' : 'Add officer'}>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault()
        save.mutate({ id: officer?.officer_id, data: { name: f.name.trim(), ward_code: f.ward_code, phone: blankToNull(f.phone), email: blankToNull(f.email), role: blankToNull(f.role), ...(officer ? { active: f.active } : {}) } }, { onSuccess: onClose })
      }}>
        <Field label="Name"><Input required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Ward"><Select value={f.ward_code} onChange={(v) => set('ward_code', v)} placeholder="Select ward" options={(wards.data ?? []).map((w) => ({ value: w.ward_code, label: `${w.ward_code} · ${w.name}` }))} /></Field>
        <Field label="Phone"><Input type="tel" value={f.phone} onChange={(e) => set('phone', e.target.value)} /></Field>
        <Field label="Email (alerts are sent here)"><Input type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label="Role"><Input value={f.role} onChange={(e) => set('role', e.target.value)} placeholder="e.g. Sanitary inspector" /></Field>
        {officer && <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => set('active', v)} /> Active</label>}
        <Button type="submit" className="w-full" disabled={!f.ward_code} loading={save.isPending}>Save</Button>
      </form>
    </Dialog>
  )
}
