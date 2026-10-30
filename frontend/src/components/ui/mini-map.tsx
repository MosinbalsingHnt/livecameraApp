import { CircleMarker, MapContainer, TileLayer } from 'react-leaflet'

export const OSM_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
export const OSM_ATTR = '&copy; OpenStreetMap contributors'

/** Non-interactive map with one pin, used in the alert drawer. */
export function MiniMap({ lat, lon, color = '#A63A14' }: { lat: number; lon: number; color?: string }) {
  return (
    <MapContainer
      key={`${lat},${lon}`}
      center={[lat, lon]}
      zoom={17}
      className="h-48 w-full rounded-xl"
      zoomControl={false}
      dragging={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      touchZoom={false}
      attributionControl={false}
    >
      <TileLayer url={OSM_URL} attribution={OSM_ATTR} />
      <CircleMarker center={[lat, lon]} radius={10} pathOptions={{ color: '#fff', weight: 2.5, fillColor: color, fillOpacity: 1 }} />
    </MapContainer>
  )
}
