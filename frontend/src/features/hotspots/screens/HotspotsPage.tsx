import { Flame, MapPin } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, Label, Skeleton } from '@/components/ui/card'
import { Select } from '@/components/ui/select'
import { fmtCoords, hasCoords, timeAgo } from '@/lib/utils'
import { useState } from 'react'
import { useHotspots } from '../hooks/useHotspots'

export default function HotspotsPage() {
  const [days, setDays] = useState('30')
  const [minCount, setMinCount] = useState('3')
  const { data, isLoading, isError } = useHotspots(Number(days), Number(minCount))
  const ranked = [...(data ?? [])].sort((a, b) => b.alerts - a.alerts)
  const max = Math.max(1, ...ranked.map((h) => h.alerts))

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <p className="max-w-xl flex-1 text-sm text-muted-foreground">
          Locations grouped in ~100 m cells. Sightings include merged duplicates, so a spot that keeps reappearing ranks higher.
        </p>
        <div className="w-36">
          <Label>Window</Label>
          <Select value={days} onChange={setDays} options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]} />
        </div>
        <div className="w-40">
          <Label>Minimum sightings</Label>
          <Select value={minCount} onChange={setMinCount} options={['2', '3', '5', '10'].map((v) => ({ value: v, label: `${v}+` }))} />
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
      ) : isError ? (
        <Card><EmptyState title="Could not load hotspots" /></Card>
      ) : !ranked.length ? (
        <Card><EmptyState icon={<Flame className="size-8" />} title="No repeat hotspots" hint="Try a longer window or a lower minimum." /></Card>
      ) : (
        <div className="space-y-3">
          {ranked.map((h, i) => (
            <Card key={`${h.latitude},${h.longitude}`} className="flex flex-wrap items-center gap-4">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-foreground font-bold text-background">{i + 1}</span>
              <div className="min-w-48 flex-1">
                <p className="font-semibold">{h.ward} <span className="font-normal text-muted-foreground">· {h.ward_code}</span></p>
                <p className="text-xs text-muted-foreground">
                  {h.road_segment ?? 'Road not mapped'} · last seen {timeAgo(h.last_seen_at)} · {fmtCoords(h.latitude, h.longitude, 4)}
                </p>
                <div className="mt-2 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-danger" style={{ width: `${(h.alerts / max) * 100}%` }} /></div>
              </div>
              <div className="flex gap-2">
                <Badge className="bg-danger-soft text-danger">{h.alerts} sightings</Badge>
                <Badge>{h.spots} spot{h.spots === 1 ? '' : 's'}</Badge>
                <Badge className={h.open ? 'bg-warn-soft text-warn' : ''}>{h.open} open</Badge>
              </div>
              {hasCoords(h) && (
                <Button asChild variant="secondary" size="sm">
                  <Link to={`/map?lat=${h.latitude}&lon=${h.longitude}`}><MapPin className="size-3.5" /> View on map</Link>
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
