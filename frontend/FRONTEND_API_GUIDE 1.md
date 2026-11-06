# Dashboard Backend — API Guide for the Frontend Team

**Service:** PCMC Garbage Alerts backend (FastAPI + PostgreSQL/PostGIS)
**Base URL (dev):** `http://<server>:8000` (same server that runs the
ingest gateway on `:8100` — the dashboard talks only to `:8000`)
**Prototype covered:** "Road Garbage Control Room" (senior's
prototype): Alerts, Live map, Hotspots, Reports, Admin, Officer phone.
**Auth:** JWT Bearer token (login flow below). All dashboard
endpoints require it; only `/health`, `/auth/login`, and the two
machine ingest endpoints (`POST /events`, `POST /passes` — used by
the ingest gateway, never by the UI) are open.

This guide is organised by **your feature folders**
(`src/features/<feature>/api/...`) so each API file can be built
directly from its section.

---

## 0. Shared conventions (for `src/services/api/`)

- **axios instance:** `baseURL = BACKEND_URL`, JSON everywhere.
- **Interceptor (request):** attach `Authorization: Bearer <token>`
  from storage on every call except `/auth/login`.
- **Interceptor (response):** on `401`, clear the token and route to
  the Login screen. On `403`, show "not permitted for your role".
- **Error format (all endpoints):**
  `{ "detail": "human readable message" }` with HTTP status:
  `401` not logged in / bad token, `403` role not allowed,
  `404` not found, `409` action not allowed in current status,
  `422` validation error (bad payload / unknown ward_code).
- **IDs:** alerts `ALR-0001`, passes `PAS-0001`, officers/users are
  integers, wards are codes like `PMC-07`, vehicles are strings
  like `PCMC-14`.
- **Times:** ISO-8601 UTC (`2026-10-30T09:15:00+00:00`). Convert to
  IST in the UI.
- **Roles:** `admin` (everything), `operator` (control room:
  triage/assign/dismiss/close/reports), `officer` (own-ward field
  tasks), `viewer` (read-only).
- **Alert statuses (lifecycle):**
  `New → Assigned → In Progress → Awaiting Confirmation → Cleared`,
  plus `Dismissed` (false positive, reason saved) and the internal
  `Duplicate` (merged sightings — hidden from lists by default).
  A re-detection while `Awaiting Confirmation` reopens the alert to
  `Assigned` automatically. A clean camera pass closes `Assigned` /
  `In Progress` / `Awaiting Confirmation` alerts
  (`closure_source: "next_pass"`).
- **Alert `type`:** `Heap` or `Scattered litter` (from the AI
  engine's size class). SLA: Heap 4 h, Scattered litter 24 h
  (admin-editable, see Settings). Every alert carries `due_at` and a
  computed `sla_state`: `on_track | at_risk | overdue | null`.

---

## 1. `src/features/auth/api` — Login flow (was missing in prototype)

### POST /auth/login
Public. Body: `{ "email": "admin@hnt.local", "password": "••••••" }`
Response `200`:
```json
{ "access_token": "eyJhbGciOi…", "token_type": "bearer",
  "expires_in_sec": 43200,
  "user": { "user_id": 1, "name": "Admin", "email": "admin@hnt.local",
            "role": "admin", "officer_id": null,
            "ward_code": null, "active": true,
            "created_at": "2026-10-30T…" } }
```
Errors: `401 {detail:"invalid email or password"}`.
Store the token + user; route by role (officer → Officer phone
screens, others → control room).

### GET /auth/me
Header: Bearer. Response: the `user` object above. Use on app start
to restore the session.

### POST /auth/change-password
Header: Bearer. Body: `{ "current_password": "…", "new_password": "…" }`
(new ≥ 8 chars). Response `{ "ok": true }`; `403` if current is wrong.

### User management — Admin screens only (`admin` role)
| Method & path | Description |
|---|---|
| POST /users | Create account. Body: `{name, email, password, role, officer_id?, ward_code?}` → `201` user object. `422` duplicate email / bad role. For an officer's login, set `role:"officer"`, their `officer_id` and `ward_code`. |
| GET /users | List accounts → `{ "users": [ … ] }` |
| GET /users/{user_id} | One account |
| PUT /users/{user_id} | Edit any of `{name, email, password, role, officer_id, ward_code, active}` |
| DELETE /users/{user_id} | Deactivate (soft). Cannot deactivate yourself (`422`). |

*Bootstrap:* the first admin comes from server env
`ADMIN_EMAIL`/`ADMIN_PASSWORD`, or the ops CLI
`python tools/create_user.py …`. There are no default credentials.

---

## 2. `src/features/dashboard/api` — Alerts, Live map, drawer

### GET /alerts
Query params (all optional): `status`, `ward_code`, `ward`,
`vehicle_id`, `type` (`Heap` | `Scattered litter`), `q` (searches
alert id / ward / road), `include_duplicates` (default false),
`limit` (default 200), `offset`.
Response: `{ "total": 137, "alerts": [ <alert>, … ] }` — newest
screens should page with limit/offset; `total` is the full count.

**Alert object** (used by list, drawer, map pins, officer tasks):
```json
{ "alert_id": "ALR-0042", "status": "Assigned",
  "type": "Heap", "size_class": "heap", "priority": "high",
  "class": "garbage", "track_id": 12,
  "vehicle_id": "PCMC-14",
  "latitude": 18.5499, "longitude": 73.9408,
  "ward": "Admin Ward 07 Nagar Road", "ward_code": "PMC-07",
  "road_segment": null, "chainage_m": null,
  "best_confidence": 0.87, "avg_confidence": 0.71,
  "snapshot_path": "EVT-0001_snapshot.jpg", "clip_path": null,
  "snapshot_url": "/alerts/ALR-0042/snapshot",
  "clip_url": "/alerts/ALR-0042/clip",
  "created_at": "…", "due_at": "…", "sla_state": "at_risk",
  "assigned_to": "R. Patil", "assignee_officer_id": 3,
  "assigned_at": "…", "closed_at": null, "closure_source": null,
  "picker_id": 2, "picker_assigned_at": "…",
  "picker_assign_source": "engine",
  "dismiss_reason": null, "cant_reason": null,
  "seen_count": 2, "duplicate_of": null,
  "last_detected_at": "…", "last_detected_run": "PCMC-14_…" }
```
Notes: `road_segment` / `chainage_m` stay `null` until PCMC supplies
road master data — render "—". `snapshot_path` / `clip_path` are the
evidence filenames; the files themselves are served at
`snapshot_url` / `clip_url` (next section). Either URL is `null`
until the gateway has uploaded that file — usually seconds after
the alert appears, so re-fetch the alert if you open the drawer
very fast. Render a "photo pending" placeholder while `null`.

### GET /alerts/{alert_id}
One alert (same object). `404` if unknown.

### Alert evidence — photo & clip (drawer)

| Method & path | Auth | Returns |
|---|---|---|
| GET /alerts/{id}/snapshot | Bearer (any role) | `image/jpeg` — the detection frame with the garbage box drawn. `404` while not uploaded. |
| GET /alerts/{id}/clip | Bearer (any role) | `video/mp4` — ~10 s clip centred on the detection. `404` while not uploaded. |

The detector writes clips in OpenCV's `mp4v` encoding, which
Chrome/Edge cannot play in a `<video>` element — so the backend
converts each clip to H.264 (+faststart) on upload. Conversion
needs `ffmpeg` on the backend host's PATH; without it the clip is
stored unconverted and may show a black player in the browser
(the file itself is still downloadable evidence). The upload
response reports `browser_playable` for clips.

These endpoints need the `Authorization` header, so a plain
`<img src="…">` will NOT work. Fetch through the api client as a
blob and hand the object URL to the element:

```ts
// src/features/dashboard/api/media.ts
export async function fetchMediaObjectUrl(path: string) {
  const res = await api.get(path, { responseType: "blob" });
  return URL.createObjectURL(res.data);
}
// <img src={await fetchMediaObjectUrl(alert.snapshot_url)} />
// <video controls src={await fetchMediaObjectUrl(alert.clip_url)} />
```

Revoke the object URL (`URL.revokeObjectURL`) when the drawer
closes to avoid leaking blobs during long control-room sessions.

### GET /alerts/{alert_id}/timeline
The drawer's activity log:
`{ "alert_id": "ALR-0042", "timeline": [ { "t": "…", "actor":
"ai-engine", "action": "created", "message": "Detected by PCMC-14
camera in Admin Ward 07 Nagar Road" }, … ] }`
Actions: `created, duplicate, assigned, reassigned, started,
reported_cleared, cleared, reopened, dismissed, cant_clear,
status_override, picker_assigned, picker_reassigned`.

### Alert actions (drawer buttons)
| Method & path | Roles | Body | Effect |
|---|---|---|---|
| POST /alerts/{id}/assign | admin, operator | `{ "officer_id": 3 }` or `{ "assigned_to": "Ward PMC-07 sanitary officer" }` | New → Assigned. **Also works on Assigned / In Progress alerts — that is a one-step reassign:** the assignee is replaced, status returns to Assigned, a `reassigned` timeline entry records from → to, and the new assignee is emailed. If no one is named, defaults to the ward's sanitary officer label. The response alert includes a `notification` report. `409` on Cleared / Dismissed / Awaiting Confirmation. |
| POST /alerts/{id}/assign-picker | admin, operator, officer | `{ "picker_id": 2 }` | Task a picker with this alert, or correct a wrong engine assignment. Works on New / Assigned / In Progress (In Progress returns to Assigned — work restarts with the new picker); timeline gains `picker_assigned` / `picker_reassigned`. Officers: own-ward alerts and own-ward pickers only. `404` unknown alert/picker, `409` inactive picker or Cleared / Dismissed / Awaiting Confirmation. |
| POST /alerts/{id}/close | admin, operator | — | Manual close → Cleared (`closure_source:"manual"`). |
| POST /alerts/{id}/dismiss | admin, operator | `{ "reason": "Not garbage - shadow" }` | → Dismissed; reason stored for model tuning. |
| POST /alerts/{id}/reopen | admin, operator | — | Cleared/Dismissed → Assigned again. |
| POST /alerts/{id}/status | admin | `{ "status": "Cleared", "assigned_to": "…" }` | Admin override to any lifecycle status (audited). Setting `"New"` also clears the previous assignment (`assigned_to`, `assignee_officer_id`, `assigned_at`), returning the alert to the unassigned pool. |
| POST /alerts/{id}/notify | admin, operator | — | Re-send the alert email to the ward's officers → `{alert_id, channel:"emailjs", sent, recipients, reason}`. |
| GET /alerts/{id}/recipients | any | — | `{alert_id, ward_code, ward, officers:[…]}` — who will be notified for this alert. |

### GET /dashboard/stats  (KPI cards)
```json
{ "generated_at": "…",
  "cards": { "new": 5, "assigned": 8, "in_progress": 3,
    "awaiting_confirmation": 2, "open_total": 18,
    "sla_at_risk": 2, "overdue": 1,
    "cleared_total": 41, "cleared_today": 6, "detected_today": 9,
    "dismissed": 3, "vehicles_online": 4, "vehicles_seen": 6,
    "vehicles_registered": 12 },
  "by_status": { "New": 5, "Assigned": 8, … } }
```
(`vehicles_seen` counts vehicles heard from even if not yet
registered in the fleet registry.)

---

## 3. `src/features/hotspots/api` — Repeat hotspots tab

### GET /hotspots?days=30&min_count=3
Locations grouped in ~100 m cells; `alerts` = total sightings
(original + merged duplicates):
`{ "hotspots": [ { "ward_code": "PMC-07", "ward": "Admin Ward 07
Nagar Road", "latitude": 18.55, "longitude": 73.941,
"road_segment": null, "spots": 1, "alerts": 5, "open": 2,
"last_seen_at": "…" } ] }`

---

## 4. `src/features/reports/api` — Reports & ward performance

### GET /reports/daily?days=14
`{ "days": 14, "series": [ { "date": "2026-10-29", "detected": 12,
"duplicates": 3, "cleared": 9 }, … ] }` (Alerts-per-day chart.)

### GET /reports/wards  (Ward league table)
`{ "wards": [ { "ward_code": "PMC-07", "ward": "Admin Ward 07 Nagar
Road", "alerts": 23, "new": 2, "assigned": 4, "in_progress": 1,
"awaiting_confirmation": 1, "cleared": 14, "dismissed": 1,
"sla_met_pct": 85.7, "avg_clear_hours": 3.42 }, … ] }`
(one row per imported ward; `sla_met_pct` is null until something
with a due time has been cleared.)

---

## 5. `src/features/admin/api` — Admin tab

### Officers — ward-wise CRUD (flow was missing in prototype)
| Method & path | Role | Description |
|---|---|---|
| GET /officers?ward_code=PMC-07&active_only=true | any | List (defaults to active only). |
| GET /officers/{id} | any | One officer. |
| POST /officers | admin | Body `{name, ward_code, phone?, email?, role?}` → `201` officer. `422` if `ward_code` unknown — import boundaries first. |
| PUT /officers/{id} | admin | Edit any field incl. moving ward / reactivating (`{active:true}`). |
| DELETE /officers/{id} | admin | Soft-deactivate (stops notifications). |

Officer object: `{ officer_id, name, phone, email, ward_code,
role, active, created_at }`. The ward dropdown for these screens
comes from **GET /wards** → `{ count, wards: [{ward_code, name,
city, source}] }`. Ward boundaries themselves are managed by ops
(`POST /wards/import`, admin) — not a UI flow.
`GET /wards/resolve?lat=..&lon=..` → `{ward_code, ward}` for any
point (handy for debugging).

### Pickers — registry, live locations, auto-assign engine

Pickers are the field workers who clean alerts. **Ward officers
register the pickers of their own ward** (admins: any ward). On
registration the response carries the picker's app `api_token`
**once** — show it to the officer so the picker can log in to the
picker app (only a hash is stored; use the token endpoint to
re-issue). The picker app itself is documented separately in
`PICKER_API_GUIDE.md`.

| Method & path | Roles | Description |
|---|---|---|
| GET /pickers?ward_code=&active_only= | any | List. Officers see only their own ward. Picker object: `{ picker_id, name, phone, email, ward_code, registered_by_officer_id, active, created_at, last_location: { latitude, longitude, updated_at, age_sec } \| null }` — resolve picker names for alert rows from this list, like officers. |
| GET /pickers/{id} | any | One picker (officers: own ward only). |
| POST /pickers | admin, officer | Body `{name, ward_code, phone?, email?}` → `201` picker **+ `api_token` (shown once)**. Officers: own ward only (`403` otherwise). `422` unknown `ward_code`. |
| PUT /pickers/{id} | admin, officer | Edit fields / reactivate (`{active:true}`). Officers cannot move a picker to another ward. |
| DELETE /pickers/{id} | admin, officer | Soft-deactivate (the app login stops working; engine skips them). |
| POST /pickers/{id}/token | admin, officer | Re-issue the app token → `{ picker_id, api_token }` (once). Old token stops working. |
| GET /pickers/{id}/tasks | any | `{ picker_id, tasks: [alert…] }` — the picker's open alerts (dashboard view). |

**The engine (automatic assignment).** When a genuinely new alert
is created, the backend tasks it to the **nearest picker whose
app location ping is fresh** (pings every ~2 min; fresh =
≤ `picker_location_fresh_min`, default 5 min) **within
`picker_max_distance_m`** (default 1000 m). Distance is the only
criterion — ward is not a filter; the alert's ward officers are
notified as usual and can correct the pick with
`POST /alerts/{id}/assign-picker` (§2). A successful engine
assignment sets the alert's `picker_id` / `picker_assign_source:
"engine"` and moves New → Assigned. If nobody qualifies, the
alert simply stays New for manual assignment. The engine can be
switched off with the `picker_auto_assign` setting. Manual
assignment sets `picker_assign_source` to `"officer"` or
`"admin"`. Setting an alert back to New (admin override) clears
the picker fields too.

### Vehicles — fleet registry CRUD (flow was missing in prototype)
| Method & path | Role | Description |
|---|---|---|
| GET /vehicles?ward_code=&active_only= | any | List with live fleet health (below). |
| GET /vehicles/{vehicle_id} | any | One vehicle + `open_alerts` count. |
| POST /vehicles | admin | Body `{vehicle_id, label?, vehicle_type?, registration_no?, ward_code?, device_id?}` → `201`. `409` if the id exists, `422` unknown ward. |
| PUT /vehicles/{vehicle_id} | admin | Edit fields / reactivate. |
| DELETE /vehicles/{vehicle_id} | admin | Soft-deactivate. |

Vehicle object adds computed fleet health:
`{ …, "last_seen_at": "…", "online": true }` — `online` = heard
from (pass or detection) within `vehicle_online_minutes`
(default 15, admin setting). New vehicles start `online:false`.
The `vehicle_id` here is the same ID the AI engine/gateway send —
registering a vehicle never breaks ingest.

### Rules & SLAs (Admin > Rules and SLAs)
- GET /settings → `{ heap_sla_hours: 4, litter_sla_hours: 24,
  duplicate_radius_m: 25, pass_radius_m: 25,
  confidence_threshold: 0.6, photo_required: false,
  vehicle_online_minutes: 15, picker_max_distance_m: 1000,
  picker_location_fresh_min: 5, picker_auto_assign: true }`
- PUT /settings (admin) — send only changed keys, same shape.
  SLA hours apply to alerts created after the change. The
  `picker_*` keys steer the auto-assign engine (next section).

### Audit log (Admin > Audit log)
GET /audit?limit=100 (admin, operator) →
`{ "entries": [ { log_id, alert_id, t, actor, action, message } ] }`
newest first.

### ICCC push panel
GET /integrations/iccc/events?limit=20 →
`{ "events": [ { event: "alert.created" | "alert.assigned" |
"alert.cleared" | …, alert_id, occurred_at, actor, message } ] }`.
This is a read-model of the lifecycle feed in the ICCC envelope;
the outbound push to the city ICCC goes live when their API spec
is available.

### GET /passes
Vehicle runs the backend has evaluated:
`{ "passes": [ { pass_id, vehicle_id, run_id, points,
closed: [alert_ids], received_at } ] }`. Useful for a "coverage"
debug view; not part of the prototype's main screens.

---

## 6. `src/features/officer/api` — Officer phone tab

### GET /officer/tasks
Header: Bearer (officer account). Returns open alerts of the
officer's own ward: `{ "ward_code": "PMC-07", "tasks": [ <alert>, … ] }`.

### Field actions (same endpoints as §2, officer role allowed,
own ward only — `403` for another ward's alert)
| Action | Endpoint | Transition |
|---|---|---|
| Start work | POST /alerts/{id}/start | Assigned → In Progress |
| Report cleaned | POST /alerts/{id}/report-cleared | Assigned/In Progress → Awaiting Confirmation (closes only when a later camera pass verifies) |
| Could not clear | POST /alerts/{id}/cant-clear `{ "reason": "…" }` | → Assigned, reason shown to the operator (`cant_reason`) |

---

## 7. Machine endpoints (NOT for the UI — listed so nobody wires them by mistake)

- `POST /events` — ingest gateway posts detector events
  `{ run_id, events: [ … ] }`.
- `POST /passes` — ingest gateway posts a run's GPS track
  `{ vehicle_id, run_id, points: [{latitude, longitude}] }`;
  triggers next-pass closure.
- `POST /alerts/{id}/media` — ingest gateway uploads an alert's
  evidence files right after ingest (multipart form:
  `kind=snapshot|clip`, `file`). The UI never calls this.
- `GET /health` — `{ ok, duplicate_radius_m, pass_radius_m,
  database }`.
- `POST /picker/location`, `GET /picker/tasks`,
  `POST /picker/tasks/{id}/start|report-cleared` — the **picker
  app's** endpoints (token auth, no dashboard login). Contract:
  `PICKER_API_GUIDE.md`. The dashboard never calls these.

---

*Backend source: `sprint3_backend_pg/` (this folder). Every endpoint
above is covered by the automated suite in `tests/test_api.py`
(41 scenarios, incl. auth/roles, vehicles, lifecycle, reports,
evidence media, picker registry/locations/engine/app flow).
OpenAPI docs are also live at `GET /docs` on the running server.*
