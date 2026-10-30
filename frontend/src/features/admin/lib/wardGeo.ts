type Json = Record<string, unknown>
const isObj = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v)

export interface WardFeature {
  type: 'Feature'
  properties: Json
  geometry: { type: 'Polygon' | 'MultiPolygon'; coordinates: unknown }
}

export interface ParsedBoundary {
  features: WardFeature[]
  points: number
  /** [[south, west], [north, east]] — Leaflet order */
  bounds: [[number, number], [number, number]]
  /** how the text was read */
  kind: 'GeoJSON' | 'SQL'
}

export type ParseResult = { ok: true; data: ParsedBoundary } | { ok: false; error: string }

interface Acc { points: number; minLon: number; maxLon: number; minLat: number; maxLat: number }

function walk(c: unknown, acc: Acc): string | null {
  if (!Array.isArray(c)) return 'coordinates must be nested arrays'
  if (typeof c[0] === 'number') {
    const [lon, lat] = c as number[]
    if (typeof lat !== 'number') return 'a coordinate is missing its latitude'
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) {
      return `coordinate [${lon}, ${lat}] is out of range. GeoJSON order is [longitude, latitude]`
    }
    acc.points++
    acc.minLon = Math.min(acc.minLon, lon); acc.maxLon = Math.max(acc.maxLon, lon)
    acc.minLat = Math.min(acc.minLat, lat); acc.maxLat = Math.max(acc.maxLat, lat)
    return null
  }
  for (const x of c) {
    const e = walk(x, acc)
    if (e) return e
  }
  return null
}

/** INSERT INTO wards (ward_code, name, city, source, boundary) VALUES ('PMC-01', ..., ST_GeomFromGeoJSON('{...}'), 4326)) */
function fromSql(text: string): Json[] | string {
  const re = /INSERT\s+INTO\s+[\w.]+\s*\(([^)]*)\)\s*VALUES\s*\(([\s\S]*?),\s*ST_SetSRID\s*\(\s*ST_GeomFromGeoJSON\s*\(\s*'(\{[\s\S]*?\})'\s*\)/gi
  const out: Json[] = []
  for (const m of text.matchAll(re)) {
    const cols = m[1].split(',').map((c) => c.trim().replace(/"/g, ''))
    const vals = [...m[2].matchAll(/'((?:[^']|'')*)'/g)].map((v) => v[1].replace(/''/g, "'"))
    let geometry: unknown
    try {
      geometry = JSON.parse(m[3])
    } catch {
      return 'The boundary inside the SQL is not valid GeoJSON.'
    }
    const properties: Json = {}
    cols.forEach((c, i) => { if (i < vals.length) properties[c] = vals[i] })
    if (properties.ward_code != null) properties.code = properties.ward_code
    out.push({ type: 'Feature', properties, geometry })
  }
  return out.length
    ? out
    : "Could not read this SQL. Expected INSERT INTO wards (…) VALUES (…, ST_GeomFromGeoJSON('{…}'), …)."
}

function fromJson(text: string): Json[] | string {
  let j: unknown
  try {
    j = JSON.parse(text)
  } catch (e) {
    return `Not valid JSON: ${(e as Error).message}`
  }
  if (isObj(j) && j.type === 'FeatureCollection' && Array.isArray(j.features)) return j.features as Json[]
  if (isObj(j) && j.type === 'Feature') return [j]
  if (isObj(j) && (j.type === 'Polygon' || j.type === 'MultiPolygon')) {
    return [{ type: 'Feature', properties: {}, geometry: j }]
  }
  return 'Expected a GeoJSON FeatureCollection, Feature, Polygon or MultiPolygon.'
}

/** Reads pasted/uploaded text (GeoJSON or a wards INSERT statement). `null` when empty. */
export function parseBoundary(raw: string): ParseResult | null {
  const text = raw.trim()
  if (!text) return null
  const isSql = /INSERT\s+INTO/i.test(text.slice(0, 2000))
  const got = isSql ? fromSql(text) : fromJson(text)
  if (typeof got === 'string') return { ok: false, error: got }

  const acc: Acc = { points: 0, minLon: 181, maxLon: -181, minLat: 91, maxLat: -91 }
  const features: WardFeature[] = []
  for (let i = 0; i < got.length; i++) {
    const f = got[i]
    const g = isObj(f) && isObj(f.geometry) ? f.geometry : null
    const label = got.length > 1 ? `Ward ${i + 1}: ` : ''
    if (!g || (g.type !== 'Polygon' && g.type !== 'MultiPolygon')) {
      return { ok: false, error: `${label}needs a Polygon or MultiPolygon boundary${g ? `, found ${String(g.type)}` : ''}.` }
    }
    const err = walk(g.coordinates, acc)
    if (err) return { ok: false, error: `${label}${err}.` }
    features.push({
      type: 'Feature',
      properties: isObj(f.properties) ? f.properties : {},
      geometry: g as WardFeature['geometry'],
    })
  }
  if (!features.length || !acc.points) return { ok: false, error: 'No ward boundaries found.' }
  return {
    ok: true,
    data: {
      features,
      points: acc.points,
      bounds: [[acc.minLat, acc.minLon], [acc.maxLat, acc.maxLon]],
      kind: isSql ? 'SQL' : 'GeoJSON',
    },
  }
}

const NAME_KEYS = ['name', 'ward_name', 'WARD_NAME', 'NAME', 'Name', 'ward', 'WARD']
const CODE_KEYS = ['code', 'ward_code', 'WARD_CODE', 'CODE', 'Code', 'ward_no', 'WARD_NO']

const str = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v) : '')

/** Best guess at which property holds the ward name / code, plus values shared by every ward. */
export function guessFields(features: WardFeature[]) {
  const keys = new Set<string>()
  features.slice(0, 20).forEach((f) =>
    Object.entries(f.properties).forEach(([k, v]) => { if (typeof v !== 'object') keys.add(k) }),
  )
  const all = [...keys]
  const first = features[0].properties
  const same = (k: string) => {
    const v = str(first[k])
    return v && features.every((f) => str(f.properties[k]) === v) ? v : ''
  }
  return {
    keys: all,
    nameField: NAME_KEYS.find((k) => keys.has(k)) ?? all.find((k) => typeof first[k] === 'string') ?? 'name',
    codeField: CODE_KEYS.find((k) => keys.has(k)) ?? '',
    name: str(first.name ?? first.ward_name ?? first.NAME),
    code: str(first.code ?? first.ward_code),
    city: same('city'),
    source: same('source'),
  }
}
