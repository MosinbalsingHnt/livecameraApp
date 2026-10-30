import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))

const IST = 'Asia/Kolkata'

/** Backend times are ISO-8601 UTC; the control room works in IST. */
export function fmtDateTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    timeZone: IST,
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function fmtTime(iso?: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: IST,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function fmtDay(isoDate: string) {
  return new Date(isoDate + 'T00:00:00').toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })
}

/** "2h 15m" style duration between now and a due date (negative = overdue). */
export function timeLeft(due?: string | null, now = Date.now()) {
  if (!due) return null
  const mins = Math.round((new Date(due).getTime() - now) / 60000)
  const abs = Math.abs(mins)
  const text = abs >= 60 ? `${Math.floor(abs / 60)}h ${abs % 60}m` : `${abs}m`
  return { mins, text }
}

export function timeAgo(iso?: string | null) {
  if (!iso) return 'never'
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
  return `${Math.floor(mins / 1440)}d ago`
}

export const pct = (v: number | null | undefined) => (v == null ? '—' : `${Math.round(v * 100)}%`)

/** Alerts can arrive without a GPS match, so coordinates are nullable. */
export const hasCoords = <T extends { latitude: number | null; longitude: number | null }>(
  x: T,
): x is T & { latitude: number; longitude: number } => x.latitude != null && x.longitude != null

export const fmtCoords = (lat: number | null, lon: number | null, digits = 5) =>
  lat == null || lon == null ? 'No GPS fix' : `${lat.toFixed(digits)}, ${lon.toFixed(digits)}`
