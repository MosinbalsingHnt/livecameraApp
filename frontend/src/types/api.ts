export type Role = 'admin' | 'operator' | 'officer' | 'viewer'

export type AlertStatus =
  | 'New'
  | 'Assigned'
  | 'In Progress'
  | 'Awaiting Confirmation'
  | 'Cleared'
  | 'Dismissed'
  | 'Duplicate'

export type AlertType = 'Heap' | 'Scattered litter'
export type SlaState = 'on_track' | 'at_risk' | 'overdue' | null

export const LIFECYCLE_STATUSES: AlertStatus[] = [
  'New',
  'Assigned',
  'In Progress',
  'Awaiting Confirmation',
  'Cleared',
  'Dismissed',
]
export const OPEN_STATUSES: AlertStatus[] = ['New', 'Assigned', 'In Progress', 'Awaiting Confirmation']

export interface User {
  user_id: number
  name: string
  email: string
  role: Role
  officer_id: number | null
  ward_code: string | null
  active: boolean
  created_at: string
}

export interface LoginResponse {
  access_token: string
  token_type: 'bearer'
  expires_in_sec: number
  user: User
}

export interface Alert {
  alert_id: string
  status: AlertStatus
  type: AlertType
  size_class: string
  priority: string
  class: string
  track_id: number | null
  vehicle_id: string | null
  latitude: number
  longitude: number
  ward: string | null
  ward_code: string | null
  road_segment: string | null
  chainage_m: number | null
  best_confidence: number | null
  avg_confidence: number | null
  snapshot_path: string | null
  clip_path: string | null
  created_at: string
  due_at: string | null
  sla_state: SlaState
  assigned_to: string | null
  assignee_officer_id: number | null
  assigned_at: string | null
  closed_at: string | null
  closure_source: string | null
  dismiss_reason: string | null
  cant_reason: string | null
  seen_count: number
  duplicate_of: string | null
  last_detected_at: string | null
  last_detected_run: string | null
  notification?: unknown
}

export interface AlertsResponse {
  total: number
  alerts: Alert[]
}

export interface AlertsQuery {
  status?: string
  ward_code?: string
  vehicle_id?: string
  type?: string
  q?: string
  include_duplicates?: boolean
  limit?: number
  offset?: number
}

export interface TimelineEntry {
  t: string
  actor: string
  action: string
  message: string
}

export interface DashboardStats {
  generated_at: string
  cards: {
    new: number
    assigned: number
    in_progress: number
    awaiting_confirmation: number
    open_total: number
    sla_at_risk: number
    overdue: number
    cleared_total: number
    cleared_today: number
    detected_today: number
    dismissed: number
    vehicles_online: number
    vehicles_seen: number
    vehicles_registered: number
  }
  by_status: Record<string, number>
}

export interface Hotspot {
  ward_code: string
  ward: string
  latitude: number
  longitude: number
  road_segment: string | null
  spots: number
  alerts: number
  open: number
  last_seen_at: string
}

export interface DailyPoint {
  date: string
  detected: number
  duplicates: number
  cleared: number
}

export interface WardPerformance {
  ward_code: string
  ward: string
  alerts: number
  new: number
  assigned: number
  in_progress: number
  awaiting_confirmation: number
  cleared: number
  dismissed: number
  sla_met_pct: number | null
  avg_clear_hours: number | null
}

export interface Ward {
  ward_code: string
  name: string
  city: string
  source: string
}

export interface Officer {
  officer_id: number
  name: string
  phone: string | null
  email: string | null
  ward_code: string
  role: string | null
  active: boolean
  created_at: string
}

export interface OfficerInput {
  name: string
  ward_code: string
  phone?: string | null
  email?: string | null
  role?: string | null
  active?: boolean
}

export interface Vehicle {
  vehicle_id: string
  label: string | null
  vehicle_type: string | null
  registration_no: string | null
  ward_code: string | null
  device_id: string | null
  active: boolean
  last_seen_at: string | null
  online: boolean
  open_alerts?: number
}

export interface VehicleInput {
  vehicle_id?: string
  label?: string | null
  vehicle_type?: string | null
  registration_no?: string | null
  ward_code?: string | null
  device_id?: string | null
  active?: boolean
}

export interface UserInput {
  name?: string
  email?: string
  password?: string
  role?: Role
  officer_id?: number | null
  ward_code?: string | null
  active?: boolean
}

export interface Settings {
  heap_sla_hours: number
  litter_sla_hours: number
  duplicate_radius_m: number
  pass_radius_m: number
  confidence_threshold: number
  photo_required: boolean
  vehicle_online_minutes: number
}

export interface AuditEntry {
  log_id: number
  alert_id: string | null
  t: string
  actor: string
  action: string
  message: string
}

export interface IcccEvent {
  event: string
  alert_id: string
  occurred_at: string
  actor: string
  message: string
}

export interface Pass {
  pass_id: string
  vehicle_id: string
  run_id: string
  points: number
  closed: string[]
  received_at: string
}

export interface Recipients {
  alert_id: string
  ward_code: string
  ward: string
  officers: Officer[]
}
