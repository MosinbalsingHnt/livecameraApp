import { Pencil, Plus, UserX } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Skeleton } from '@/components/ui/card'
import { Dialog } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Table, Td, Th } from '@/components/ui/table'
import { useAuthStore } from '@/store/authStore'
import type { Role, User } from '@/types/api'
import { useDeactivateUser, useOfficers, useSaveUser, useUsers, useWards } from '../hooks/useAdmin'
import { ActiveChip, Field } from './shared'

const ROLES: Role[] = ['admin', 'operator', 'officer', 'viewer']

export function UsersTab() {
  const me = useAuthStore((s) => s.user)
  const users = useUsers()
  const deactivate = useDeactivateUser()
  const [editing, setEditing] = useState<User | 'new' | null>(null)

  return (
    <Card className="p-0">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <p className="text-sm text-muted-foreground">Dashboard logins. Officers sign in with an account linked to their officer record and ward.</p>
        <Button onClick={() => setEditing('new')}><Plus className="size-4" /> Add user</Button>
      </div>
      {users.isLoading ? <div className="p-4"><Skeleton className="h-32" /></div> : !users.data?.length ? <EmptyState title="No users" /> : (
        <Table>
          <thead><tr><Th>Name</Th><Th>Email</Th><Th>Role</Th><Th>Ward</Th><Th>Status</Th><Th /></tr></thead>
          <tbody>
            {users.data.map((u) => (
              <tr key={u.user_id}>
                <Td className="font-medium">{u.name}{u.user_id === me?.user_id && <span className="ml-2 text-xs text-muted-foreground">(you)</span>}</Td>
                <Td>{u.email}</Td><Td className="capitalize">{u.role}</Td><Td>{u.ward_code ?? '—'}</Td><Td><ActiveChip active={u.active} /></Td>
                <Td className="whitespace-nowrap text-right">
                  <Button variant="ghost" size="icon" aria-label={`Edit ${u.name}`} onClick={() => setEditing(u)}><Pencil className="size-4" /></Button>
                  {u.active && u.user_id !== me?.user_id && <Button variant="ghost" size="icon" aria-label={`Deactivate ${u.name}`} onClick={() => confirm(`Deactivate ${u.name}?`) && deactivate.mutate(u.user_id)}><UserX className="size-4" /></Button>}
                </Td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      {editing && <UserForm user={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    </Card>
  )
}

function UserForm({ user, onClose }: { user: User | null; onClose: () => void }) {
  const wards = useWards()
  const [f, setF] = useState({ name: user?.name ?? '', email: user?.email ?? '', password: '', role: (user?.role ?? 'operator') as Role, ward_code: user?.ward_code ?? '', officer_id: user?.officer_id ? String(user.officer_id) : '', active: user?.active ?? true })
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((s) => ({ ...s, [k]: v }))
  const isOfficer = f.role === 'officer'
  const officers = useOfficers({ ward_code: f.ward_code || undefined }, isOfficer)
  const save = useSaveUser()

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()} title={user ? 'Edit user' : 'Add user'}>
      <form className="space-y-3" onSubmit={(e) => {
        e.preventDefault()
        save.mutate({
          id: user?.user_id,
          data: { name: f.name.trim(), email: f.email.trim(), role: f.role, ...(f.password ? { password: f.password } : {}), ward_code: isOfficer ? f.ward_code || null : null, officer_id: isOfficer && f.officer_id ? Number(f.officer_id) : null, ...(user ? { active: f.active } : {}) },
        }, { onSuccess: onClose })
      }}>
        <Field label="Name"><Input required value={f.name} onChange={(e) => set('name', e.target.value)} /></Field>
        <Field label="Email"><Input required type="email" value={f.email} onChange={(e) => set('email', e.target.value)} /></Field>
        <Field label={user ? 'New password (leave blank to keep)' : 'Password (min 8 characters)'}><Input type="password" autoComplete="new-password" required={!user} minLength={8} value={f.password} onChange={(e) => set('password', e.target.value)} /></Field>
        <Field label="Role"><Select value={f.role} onChange={(v) => set('role', v as Role)} options={ROLES.map((r) => ({ value: r, label: r }))} /></Field>
        {isOfficer && (
          <>
            <Field label="Ward"><Select value={f.ward_code} onChange={(v) => { set('ward_code', v); set('officer_id', '') }} placeholder="Select ward" options={(wards.data ?? []).map((w) => ({ value: w.ward_code, label: `${w.ward_code} · ${w.name}` }))} /></Field>
            <Field label="Officer record"><Select value={f.officer_id} onChange={(v) => set('officer_id', v)} placeholder="Select officer" options={(officers.data ?? []).map((o) => ({ value: String(o.officer_id), label: o.name }))} /></Field>
          </>
        )}
        {user && <label className="flex items-center gap-2 text-sm"><Switch checked={f.active} onCheckedChange={(v) => set('active', v)} /> Active</label>}
        <Button type="submit" className="w-full" disabled={isOfficer && (!f.ward_code || !f.officer_id)} loading={save.isPending}>Save</Button>
      </form>
    </Dialog>
  )
}
