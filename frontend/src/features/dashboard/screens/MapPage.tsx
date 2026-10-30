import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { useSearchParams } from 'react-router-dom'
import { StatusBadge, TypeBadge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, EmptyState, SectionLabel } from '@/components/ui/card'
import { OSM_ATTR, OSM_URL } from '@/components/ui/mini-map'
import { useHotspots } from '@/features/hotspots/hooks/useHotspots'
import { cn, fmtDateTime } from '@/lib/utils'
import { useUiStore } from '@/store/uiStore'
import { OPEN_STATUSES, type Alert } from '@/types/api'
import { useAlerts } from '../hooks/useAlerts'

const PUNE: [number, number] = [18.5204, 73.8567]

const colorOf = (a: Alert) =>
  a.status === 'Cleared' ? '#1F6B45' : a.status === 'Dismissed' ? '#7C8B83' : a.type === 'Heap' ? '#C2410C' : '#1D6FB8'

/** Moves the map when the target changes (list click, hotspot link) or fits all pins on first load. */
function Camera({ target, points }: { target: [number, number] | null; points: [number, number][] }) {
  const map = useMap()
  const [fitted, setFitted] = useState(false)
  useEffect(() => {
    if (target) map.flyTo(target, Math.max(map.getZoom(), 16), { duration: 0.6 })
  }, [target, map])
  useEffect(() => {
    if (!fitted && !target && points.length) {
      map.fitBounds(points, { padding: [50, 50], maxZoom: 16 })
      setFitted(true)
    }
  }, [points, target, fitted, map])
  return null
}

export default function MapPage() {
  const [params] = useSearchParams()
  const openAlert = useUiStore((s) => s.openAlert)
  const [showAlerts, setShowAlerts] = useState(true)
  const [showHot, setShowHot] = useState(false)
  const [onlyOpen, setOnlyOpen] = useState(true)
  const [selected, setSelected] = useState<string | null>(null)

  const alerts = useAlerts({ limit: 500 })
  const hotspots = useHotspots(30, 3)

  const paramLat = Number(params.get('lat'))
  const paramLon = Number(params.get('lon'))
  const [target, setTarget] = useState<[number, number] | null>(paramLat && paramLon ? [paramLat, paramLon] : null)

  const all = alerts.data?.alerts ?? []
  const shown = useMemo(() => (onlyOpen ? all.filter((a) => OPEN_STATUSES.includes(a.status)) : all), [all, onlyOpen])
  const points = useMemo(() => shown.map((a) => [a.latitude, a.longitude] as [number, number]), [shown])
  const sel = all.find((a) => a.alert_id === selected)
  const open = all.filter((a) => OPEN_STATUSES.includes(a.status))

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_20rem] 2xl:grid-cols-[1fr_24rem]">
      <div className="relative isolate z-0 h-[calc(100dvh-9rem)] min-h-[420px] overflow-hidden rounded-2xl border shadow-sm lg:h-[calc(100dvh-7rem)] 2xl:h-[calc(100dvh-8rem)]">
        <MapContainer center={target ?? PUNE} zoom={14} className="size-full" scrollWheelZoom>
          <TileLayer url={OSM_URL} attribution={OSM_ATTR} />
          <Camera target={target} points={points} />
          {showHot && hotspots.data?.map((h, i) => (
            <CircleMarker key={i} center={[h.latitude, h.longitude]} radius={14 + h.alerts * 2.5} pathOptions={{ color: '#E2552B', weight: 1, fillColor: '#E2552B', fillOpacity: 0.28 }}>
              <Tooltip>{h.ward} · {h.alerts} sightings ({h.open} open)</Tooltip>
            </CircleMarker>
          ))}
          {showAlerts && shown.map((a) => (
            <CircleMarker
              key={a.alert_id}
              center={[a.latitude, a.longitude]}
              radius={a.alert_id === selected ? 13 : a.type === 'Heap' ? 10 : 8}
              pathOptions={{ color: '#fff', weight: a.alert_id === selected ? 3 : 2, fillColor: colorOf(a), fillOpacity: 1 }}
              eventHandlers={{ click: () => setSelected(a.alert_id) }}
            >
              <Tooltip>{a.alert_id} · {a.type}</Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>

        <div className="absolute left-3 top-3 z-[500] flex flex-wrap gap-1.5 rounded-xl border bg-card/90 p-1.5 shadow backdrop-blur">
          <Button size="sm" variant={showAlerts ? 'default' : 'secondary'} aria-pressed={showAlerts} onClick={() => setShowAlerts((v) => !v)}>Alerts</Button>
          <Button size="sm" variant={showHot ? 'default' : 'secondary'} aria-pressed={showHot} onClick={() => setShowHot((v) => !v)}>Hotspots</Button>
          <Button size="sm" variant={onlyOpen ? 'default' : 'secondary'} aria-pressed={onlyOpen} onClick={() => setOnlyOpen((v) => !v)}>Open only</Button>
        </div>
        <div className="absolute bottom-3 left-3 z-[500] flex flex-wrap gap-3 rounded-xl border bg-card/90 px-3 py-2 text-xs shadow backdrop-blur">
          <span><b className="text-[#C2410C]">●</b> Heap</span>
          <span><b className="text-[#1D6FB8]">●</b> Litter</span>
          <span><b className="text-[#1F6B45]">●</b> Cleared</span>
          <span><b className="text-[#E2552B]">◯</b> Hotspot</span>
        </div>
      </div>

      <aside className="space-y-4">
        <Card>
          {sel ? (
            <div className="space-y-2">
              <SectionLabel>Selected</SectionLabel>
              <p className="font-mono text-base font-semibold">{sel.alert_id}</p>
              <div className="flex flex-wrap gap-1.5"><StatusBadge status={sel.status} /><TypeBadge type={sel.type} /></div>
              <p className="text-sm">{sel.ward ?? '—'}</p>
              <p className="text-xs text-muted-foreground">{sel.vehicle_id} · {fmtDateTime(sel.created_at)}</p>
              <Button className="w-full" onClick={() => openAlert(sel.alert_id)}>Open details</Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Click a pin to inspect an alert. Scroll to zoom, drag to pan.</p>
          )}
        </Card>
        <Card className="p-0">
          <p className="border-b px-4 py-3 font-semibold">Open alerts ({open.length})</p>
          {open.length === 0 ? <EmptyState title="No open alerts" /> : (
            <ul className="max-h-[40dvh] divide-y overflow-y-auto xl:max-h-[calc(100dvh-26rem)] xl:min-h-40">
              {open.map((a) => (
                <li key={a.alert_id}>
                  <button
                    className={cn('flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted', a.alert_id === selected && 'bg-brand-soft')}
                    onClick={() => { setSelected(a.alert_id); setTarget([a.latitude, a.longitude]) }}
                  >
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: colorOf(a) }} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{a.alert_id} · {a.ward ?? a.ward_code}</span>
                      <span className="block text-xs text-muted-foreground">{fmtDateTime(a.created_at)}</span>
                    </span>
                    <StatusBadge status={a.status} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <p className="px-1 text-xs text-muted-foreground">Vehicle positions are not exposed by the backend yet, so only alerts and hotspots are drawn.</p>
      </aside>
    </div>
  )
}
