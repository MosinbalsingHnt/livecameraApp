import type { GeoJsonObject } from 'geojson'
import type { LatLngBoundsExpression } from 'leaflet'
import { useEffect } from 'react'
import { GeoJSON, MapContainer, TileLayer, useMap } from 'react-leaflet'
import { OSM_ATTR, OSM_URL } from '@/components/ui/mini-map'
import type { WardFeature } from '../lib/wardGeo'

function Fit({ bounds }: { bounds: LatLngBoundsExpression }) {
  const map = useMap()
  useEffect(() => {
    map.fitBounds(bounds, { padding: [28, 28] })
  }, [bounds, map])
  return null
}

/** Read-only map showing the ward outline(s) that are about to be imported. */
export function BoundaryPreview({
  features, bounds, signature,
}: { features: WardFeature[]; bounds: LatLngBoundsExpression; signature: string }) {
  return (
    <MapContainer center={[18.52, 73.86]} zoom={11} className="size-full rounded-xl" attributionControl={false} scrollWheelZoom={false}>
      <TileLayer url={OSM_URL} attribution={OSM_ATTR} />
      {/* react-leaflet does not redraw GeoJSON on data change, so re-key it */}
      <GeoJSON
        key={signature}
        data={{ type: 'FeatureCollection', features } as unknown as GeoJsonObject}
        style={{ color: '#2F7A37', weight: 2.5, fillColor: '#2F7A37', fillOpacity: 0.22 }}
      />
      <Fit bounds={bounds} />
    </MapContainer>
  )
}
