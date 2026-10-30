import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardTitle, Skeleton } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import type { Settings } from '@/types/api'
import { useSaveSettings, useSettings } from '../hooks/useAdmin'

const ROWS: { key: keyof Settings; label: string; hint?: string; step?: number }[] = [
  { key: 'heap_sla_hours', label: 'Heap: clear within (hours)', hint: 'Applies to alerts created after the change' },
  { key: 'litter_sla_hours', label: 'Scattered litter: clear within (hours)', hint: 'Applies to alerts created after the change' },
  { key: 'confidence_threshold', label: 'Minimum confidence', hint: '0 to 1', step: 0.05 },
  { key: 'duplicate_radius_m', label: 'Merge detections within (m)' },
  { key: 'pass_radius_m', label: 'Next-pass verification radius (m)' },
  { key: 'vehicle_online_minutes', label: 'Vehicle counts as online for (minutes)' },
]

export function SettingsTab({ isAdmin }: { isAdmin: boolean }) {
  const { data, isLoading } = useSettings()
  const save = useSaveSettings()
  const [draft, setDraft] = useState<Settings | null>(null)
  useEffect(() => { if (data) setDraft(data) }, [data])
  if (isLoading || !draft || !data) return <Skeleton className="h-72" />

  // send only the keys that changed
  const changed = Object.fromEntries((Object.keys(draft) as (keyof Settings)[]).filter((k) => draft[k] !== data[k]).map((k) => [k, draft[k]]))
  const dirty = Object.keys(changed).length > 0

  return (
    <Card className="max-w-2xl">
      <CardTitle>Rules and SLAs</CardTitle>
      <div className="divide-y">
        {ROWS.map((r) => (
          <div key={r.key} className="flex items-center justify-between gap-4 py-3">
            <div><p className="font-medium">{r.label}</p>{r.hint && <p className="text-xs text-muted-foreground">{r.hint}</p>}</div>
            <Input type="number" className="w-28 text-right" step={r.step ?? 1} min={0} disabled={!isAdmin} value={draft[r.key] as number}
              onChange={(e) => setDraft({ ...draft, [r.key]: e.target.value === '' ? 0 : Number(e.target.value) })} />
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-3">
          <div><p className="font-medium">After photo required to clear</p><p className="text-xs text-muted-foreground">Officers must attach a photo when reporting cleared</p></div>
          <Switch disabled={!isAdmin} checked={draft.photo_required} onCheckedChange={(v) => setDraft({ ...draft, photo_required: v })} />
        </div>
      </div>
      {isAdmin ? (
        <div className="mt-4 flex gap-2">
          <Button disabled={!dirty} loading={save.isPending} onClick={() => save.mutate(changed)}>Save changes</Button>
          <Button variant="secondary" disabled={!dirty} onClick={() => setDraft(data)}>Reset</Button>
        </div>
      ) : <p className="mt-4 text-sm text-muted-foreground">Only admins can change rules.</p>}
    </Card>
  )
}
