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
  "created_at": "…", "due_at": "…", "sla_state": "at_risk",
  "assigned_to": "R. Patil", "assignee_officer_id": 3,
  "assigned_at": "…", "closed_at": null, "closure_source": null,
  "dismiss_reason": null, "cant_reason": null,
  "seen_count": 2, "duplicate_of": null,
  "last_detected_at": "…", "last_detected_run": "PCMC-14_…" }
```
Notes: `road_segment` / `chainage_m` stay `null` until PCMC supplies
road master data — render "—". `snapshot_path` is currently just the
evidence filename on the gateway; **photo serving is not built yet**
(treat as "photo pending" in the UI).

### GET /alerts/{alert_id}
One alert (same object). `404` if unknown.

### GET /alerts/{alert_id}/timeline
The drawer's activity log:
`{ "alert_id": "ALR-0042", "timeline": [ { "t": "…", "actor":
"ai-engine", "action": "created", "message": "Detected by PCMC-14
camera in Admin Ward 07 Nagar Road" }, … ] }`
Actions: `created, duplicate, assigned, started, reported_cleared,
cleared, reopened, dismissed, cant_clear, status_override`.

### Alert actions (drawer buttons)
| Method & path | Roles | Body | Effect |
|---|---|---|---|
| POST /alerts/{id}/assign | admin, operator | `{ "officer_id": 3 }` or `{ "assigned_to": "Ward PMC-07 sanitary officer" }` | New → Assigned. If no one is named, defaults to the ward's sanitary officer label. The assignee is emailed (test channel) and the response alert includes a `notification` report. `409` if not New. |
| POST /alerts/{id}/close | admin, operator | — | Manual close → Cleared (`closure_source:"manual"`). |
| POST /alerts/{id}/dismiss | admin, operator | `{ "reason": "Not garbage - shadow" }` | → Dismissed; reason stored for model tuning. |
| POST /alerts/{id}/reopen | admin, operator | — | Cleared/Dismissed → Assigned again. |
| POST /alerts/{id}/status | admin | `{ "status": "Cleared", "assigned_to": "…" }` | Admin override to any lifecycle status (audited). |
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
  vehicle_online_minutes: 15 }`
- PUT /settings (admin) — send only changed keys, same shape.
  SLA hours apply to alerts created after the change.

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
- `GET /health` — `{ ok, duplicate_radius_m, pass_radius_m,
  database }`.

---

*Backend source: `sprint3_backend_pg/` (this folder). Every endpoint
above is covered by the automated suite in `tests/test_api.py`
(30 scenarios, incl. auth/roles, vehicles, lifecycle, reports).
OpenAPI docs are also live at `GET /docs` on the running server.*
