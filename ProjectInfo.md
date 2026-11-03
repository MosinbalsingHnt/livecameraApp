# PCMC Sarthi — Project Information

> Everything about the project in one place: what it is, how the pieces fit, every page, every API endpoint and where it is used, every package and why it is there, how to run and build it, and what is still open.
>
> Last updated: 2026-11-03. Built by Hare & Turtle AI Solutions (H&T) for Pimpri Chinchwad Municipal Corporation (PCMC).
> This file describes the **code in this repository** (`frontend/` and `mobile/`). The backend and the AI engine are **not** in this repository; what is known about them comes from the API guide and the live OpenAPI schema, and is marked as such.

---

## Table of contents

1. [What PCMC Sarthi is](#1-what-pcmc-sarthi-is)
2. [How the pieces fit together](#2-how-the-pieces-fit-together)
3. [Repository layout](#3-repository-layout)
4. [Roles, lifecycle and business rules](#4-roles-lifecycle-and-business-rules)
5. [Web dashboard (`frontend/`)](#5-web-dashboard-frontend)
6. [Mobile app (`mobile/`)](#6-mobile-app-mobile)
7. [Complete API reference](#7-complete-api-reference)
8. [Data models](#8-data-models)
9. [Running, building and configuring](#9-running-building-and-configuring)
10. [Known gaps, open questions and history](#10-known-gaps-open-questions-and-history)
11. [Glossary](#11-glossary)

---

## 1. What PCMC Sarthi is

PCMC Sarthi finds garbage on roads automatically and tracks it until it is cleaned.

1. A phone mounted in a municipal vehicle (the **mobile app**) records the road in short video chunks and logs GPS once a second, and uploads both.
2. An **AI engine** (server side, not in this repo) watches the video, detects garbage, and turns detections into **alerts** tied to a location and a **ward**.
3. Control-room staff use the **web dashboard** to see alerts on a list and a map, assign them to sanitary officers, follow SLAs, and read reports.
4. Field **officers** use the same web app on their phones to start work, report a spot cleaned, or say why they could not clear it.
5. A later camera **pass** over the same spot confirms the cleanup and closes the alert automatically.

| Part | Where | Who uses it |
|---|---|---|
| Mobile capture app (Android) | `mobile/` | Driver of the vehicle |
| Web dashboard | `frontend/` | Admin, operator, viewer, officer |
| AI engine + ingest gateway (port 8100) | not in this repo | Receives what the mobile app uploads |
| Dashboard backend (FastAPI + PostgreSQL/PostGIS, port 8000) | not in this repo (`sprint3_backend_pg/`) | Serves the web dashboard |

---

## 2. How the pieces fit together

```
   Phone in vehicle                       Server                                  Browser
 ┌────────────────────┐        ┌─────────────────────────────┐        ┌───────────────────────────┐
 │  PCMC Sarthi       │  HTTP  │  Ingest gateway / AI engine │        │  PCMC Sarthi web          │
 │  mobile app        │ ─────▶ │  :8100                      │        │  dashboard (React)        │
 │                    │        │   POST /sessions            │        │                           │
 │  • camera chunks   │        │   POST /sessions/{id}/      │        │  talks ONLY to :8000      │
 │  • GPS 1/s         │        │        chunks/{n}, gps,     │        └─────────────▲─────────────┘
 │  • background      │        │        complete             │                      │ JWT, JSON
 │    upload          │        │   GET  /sessions/{id}       │        ┌─────────────┴─────────────┐
 └────────────────────┘        │   GET  /health              │  POST  │  Dashboard backend :8000  │
                               │                             │ /events│  FastAPI + PostGIS        │
                               │  detections ───────────────────────▶ │  alerts, wards, officers, │
                               │  evidence photo/clip ──────────────▶ │  vehicles, reports, auth  │
                               └─────────────────────────────┘ /media └───────────────────────────┘
```

- The **mobile app** only talks to the ingest gateway. Its address is typed into the app's Settings screen.
- The **web dashboard** only talks to the dashboard backend, whose address is `VITE_BACKEND_URL`. It never talks to the ingest gateway.
- The ingest gateway pushes detections (`POST /events`), vehicle GPS tracks (`POST /passes`) and evidence files (`POST /alerts/{id}/media`) into the dashboard backend. These three are machine-only endpoints; neither the web nor the mobile app calls them.

---

## 3. Repository layout

```
livecameraApp/
├── ProjectInfo.md              ← this file
├── README.md                   ← default React Native readme (template text)
├── folderstructer.md           ← a Node script that scaffolds a folder tree (template; not used by the app)
├── frontend/                   ← web dashboard (Vite + React + TypeScript)
│   ├── FRONTEND_API_GUIDE.md   ← backend API contract from the backend team
│   ├── HnT_AI_Road_Garbage_Detection_Prototype.html   ← original UI prototype (reference only)
│   ├── README.md · index.html · package.json · vite.config.ts · tsconfig.json
│   ├── .env / .env.example     ← VITE_BACKEND_URL
│   ├── public/                 ← hnt-logo.svg · hnt-mark.svg · login-bg.svg
│   └── src/                    ← see section 5.4
└── mobile/                     ← Android capture app (React Native)
    ├── app.json · package.json · index.js · babel / metro / jest configs
    ├── android/                ← native project (Gradle, Kotlin, manifest)
    └── src/                    ← see section 6.4
```

There is no `ios/` folder, so the mobile app is **Android only** today. Git history is on branch `main` (about 11 commits).

---

## 4. Roles, lifecycle and business rules

### 4.1 Roles

| Role | Can do | Lands on |
|---|---|---|
| `admin` | Everything: triage alerts, override any status, manage officers, vehicles, wards, users and rules | `/alerts` |
| `operator` | Control-room work: assign, dismiss, close, reopen, notify; read everything; open Admin read-mostly | `/alerts` |
| `viewer` | Read-only: alerts, map, hotspots, reports | `/alerts` |
| `officer` | Own-ward field tasks only: start, report cleaned, cannot clear | `/officer` |

The web app enforces this twice: routes are guarded by role (a wrong page redirects to the user's own home), and action buttons are hidden or disabled for roles that cannot use them. The backend enforces it again and answers `403` for anything not allowed.

### 4.2 Alert lifecycle

```
              assign                start               report-cleared           next camera pass
   New ───────────────▶ Assigned ─────────▶ In Progress ───────────────▶ Awaiting Confirmation ───────────────▶ Cleared
                          ▲  ▲                                                     │
                          │  └──────────── cant-clear (reason, back to Assigned) ──┤
                          └─────────── re-detected while awaiting: reopens ────────┘

   Any open alert ── dismiss (reason saved) ──▶ Dismissed ── reopen ──▶ Assigned
   Cleared ── reopen ──▶ Assigned            Admin can override to any status
   Duplicate = a merged sighting of an existing alert (hidden from lists by default)
```

- Open statuses (shown on the map by default): `New`, `Assigned`, `In Progress`, `Awaiting Confirmation`.
- A clean camera pass closes `Assigned`, `In Progress` and `Awaiting Confirmation` alerts on its own (`closure_source: "next_pass"`). Manual close sets `closure_source: "manual"`.
- **SLA:** Heap alerts must be cleared in 4 hours, scattered litter in 24 hours (admin-editable under Admin → Rules and SLAs; changes apply to alerts created afterwards). Each alert has `due_at` and a computed `sla_state`: `on_track`, `at_risk` or `overdue`.
- **Alert type** is `Heap` or `Scattered litter`, from the AI engine's size class.
- Detections within `duplicate_radius_m` (25 m) of an existing alert are merged into it and increase `seen_count`.

### 4.3 Conventions

- IDs: alerts `ALR-0001`, passes `PAS-0001`, officers and users are integers, wards are codes like `PMC-07`, vehicles are strings like `PCMC-14`.
- Times arrive as ISO-8601 UTC and are shown in **IST** (Asia/Kolkata).
- Errors from the backend are `{ "detail": "message" }`; validation errors (`422`) may instead carry a list of `{loc, msg, type}` items. Status codes: `401` not signed in, `403` role not allowed, `404` not found, `409` action not allowed in the current status, `422` bad payload.
- Authentication is a JWT Bearer token valid for 12 hours (`expires_in_sec: 43200`). There are no default credentials: the first admin comes from the server's `ADMIN_EMAIL` / `ADMIN_PASSWORD` environment variables or the ops script `tools/create_user.py`.

---

## 5. Web dashboard (`frontend/`)

### 5.1 Technology and packages

Build tooling: **Vite 8**, **TypeScript 7** (strict, `noUnusedLocals`, `noUnusedParameters`), **React 19**. Node 22 or newer.

**Runtime packages**

| Package | Version | What it does here |
|---|---|---|
| `react`, `react-dom` | ^19.3.1 | UI library |
| `react-router-dom` | ^7.18.5 | Routing, guarded routes, lazy-loaded pages |
| `@tanstack/react-query` | ^5.105.0 | All server data: fetching, caching, live polling, mutations that refresh related data |
| `zustand` | ^5.0.16 | Client state: signed-in user (`auth-store`) and UI state (`ui-store`), persisted in `localStorage` |
| `axios` | ^1.21.0 | HTTP client with token and error interceptors |
| `tailwindcss` + `@tailwindcss/vite` | ^4.3.3 | Styling (Tailwind v4, theme tokens as CSS variables) |
| `@radix-ui/react-dialog` | ^1.3.1 | Modal and the right-hand alert drawer |
| `@radix-ui/react-select` | ^2.4.1 | Dropdowns |
| `@radix-ui/react-switch` | ^1.4.1 | Toggles |
| `@radix-ui/react-tabs` | ^1.2.1 | Admin tabs |
| `@radix-ui/react-tooltip` | ^1.4.1 | Hover hints on icon-only buttons and icons |
| `@radix-ui/react-slot` | ^1.5.0 | `asChild` support in `Button` |
| `class-variance-authority` | ^0.7.1 | Button and badge variants |
| `clsx`, `tailwind-merge` | ^2.1.1, ^3.7.0 | The `cn()` class-name helper |
| `lucide-react` | ^1.65.0 | Icons |
| `sonner` | ^2.0.8 | Toast messages |
| `leaflet`, `react-leaflet` | ^1.9.4, ^5.0.0 | Maps on OpenStreetMap tiles (Live map, alert mini-map, ward boundary preview) |
| `recharts` | ^3.10.1 | The alerts-per-day bar chart on Reports |

**Dev packages:** `vite`, `@vitejs/plugin-react`, `typescript`, `@types/react`, `@types/react-dom`, `@types/leaflet`, `@types/node`.

**Scripts:** `npm run dev` (Vite, port 5173) · `npm run build` (typecheck, then production build to `dist/`) · `npm run preview` · `npm run typecheck`.

**Fonts:** IBM Plex Sans (text) and IBM Plex Mono (IDs, coordinates), loaded from Google Fonts in `index.html`.

### 5.2 Configuration

| File | Purpose |
|---|---|
| `.env` / `.env.example` | `VITE_BACKEND_URL` — the dashboard backend address (default `http://localhost:8000`). The current value is an ngrok tunnel; it changes whenever the tunnel restarts. |
| `vite.config.ts` | React and Tailwind plugins, `@` alias to `src`, dev port 5173 |
| `tsconfig.json` | Strict TypeScript, `@/*` path alias |
| `index.html` | Title "PCMC Sarthi", favicon (`hnt-mark.svg`), fonts, and a tiny script that applies the saved dark/light theme before the page paints (no flash) |

### 5.3 Pages — which API each one uses

Routes are lazy-loaded (`navigation/AppRouter.tsx`). "Live" means the page re-fetches on a timer; the **Pause** button in the header stops all live polling.

| Route | Page file | Roles | API endpoints used | Live refresh |
|---|---|---|---|---|
| `/login` | `features/auth/screens/LoginPage.tsx` | public | `POST /auth/login` | no |
| (on every protected route) | `navigation/guards.tsx` | any signed-in | `GET /auth/me` (restore session after reload) | no (cached 60 s) |
| `/alerts` | `features/dashboard/screens/AlertsPage.tsx` | admin, operator, viewer | `GET /dashboard/stats`, `GET /alerts`, `GET /wards`, `GET /vehicles` | stats and alerts every 10 s |
| `/map` | `features/dashboard/screens/MapPage.tsx` | admin, operator, viewer | `GET /alerts?limit=500`, `GET /hotspots?days=30&min_count=3` | alerts every 10 s |
| `/hotspots` | `features/hotspots/screens/HotspotsPage.tsx` | admin, operator, viewer | `GET /hotspots` | no |
| `/reports` | `features/reports/screens/ReportsPage.tsx` | admin, operator, viewer | `GET /reports/daily`, `GET /reports/wards` | no |
| `/admin` | `features/admin/screens/AdminPage.tsx` | admin, operator | see tab table below | some tabs |
| `/officer` | `features/officer/screens/OfficerPage.tsx` | officer | `GET /officer/tasks`, `POST /alerts/{id}/start`, `/report-cleared`, `/cant-clear` | every 15 s |
| (global drawer) | `features/dashboard/components/AlertDrawer.tsx` | opened from Alerts and Map | see drawer table below | alert every 10 s |

Any unknown URL redirects to the user's home (`/alerts`, or `/officer` for officers). The signed-in shell (`components/layout/AppShell.tsx`) wraps every protected page.

#### Alerts page (`/alerts`)

- **KPI cards** (`KpiCards.tsx`): New, Assigned/in progress, Awaiting confirmation, SLA at risk, Overdue, Detected today, Cleared today, Vehicles online — from `GET /dashboard/stats`.
- **Status tabs** with counts (`by_status`): All, New, Assigned, In Progress, Awaiting Confirmation, Cleared, Dismissed.
- **Filters:** search box (`q`: alert id, ward or road), type (Heap / Scattered litter), ward (from `GET /wards`), vehicle (from `GET /vehicles`).
- **Table:** alert id (with `×seen_count`), type badge, ward and road, vehicle, raised time (IST), status badge, SLA cell, assigned to. 25 rows per page with previous/next. Clicking a row opens the drawer.

#### Alert drawer (global, right side)

Opened from a row on Alerts or a pin/list item on the Map. Contents and the API behind each part:

| Part | Endpoint | Notes |
|---|---|---|
| Alert details, SLA, confidence, track, location, source | `GET /alerts/{id}` | re-fetched every 10 s |
| Evidence photo | `GET /alerts/{id}/snapshot` | needs the token, so it is loaded as a blob and shown through an object URL (released on close). Shows "Photo pending" until the file is uploaded; the drawer's polling picks it up automatically |
| Evidence video clip (about 10 s) | `GET /alerts/{id}/clip` | same blob approach, with a video player |
| Location mini-map | none (uses the alert's coordinates) | shows "No GPS location" if the alert has no coordinates |
| Activity timeline | `GET /alerts/{id}/timeline` | created, assigned, started, cleared, dismissed, … |
| Assign to officer | `POST /alerts/{id}/assign` | admin, operator; the officer dropdown comes from `GET /officers?ward_code=` |
| Dismiss with reason | `POST /alerts/{id}/dismiss` | admin, operator |
| Close | `POST /alerts/{id}/close` | admin, operator |
| Reopen | `POST /alerts/{id}/reopen` | admin, operator |
| Send notification email again | `POST /alerts/{id}/notify` | admin, operator |
| Who will be notified | `GET /alerts/{id}/recipients` | loaded when the section is opened |
| Status override | `POST /alerts/{id}/status` | admin only |

After any action the app refreshes: alerts list, stats, this alert, its timeline, the audit log, officer tasks, hotspots and reports. Viewers see "Read-only access". If the drawer's content ever crashes, an error card appears inside the drawer and the close button keeps working.

#### Live map (`/map`)

Leaflet map of Pune on OpenStreetMap tiles. Pins are coloured by type and status (Heap, Litter, Cleared, Dismissed); toggles for **Alerts**, **Hotspots** and **Open only**; fits the view to all pins on first load; can fly to a spot via `/map?lat=..&lon=..` (used by the Hotspots page). The side panel shows the selected alert, the list of open alerts, and a note counting alerts that have no GPS location and so cannot be drawn. Vehicle positions are not drawn because the backend does not provide them.

#### Hotspots (`/hotspots`)

Places where garbage keeps coming back, grouped in about 100 m cells. Filters: time window (7, 30, 90 days) and minimum sightings (2, 3, 5, 10). Each card shows rank, ward, road, last seen, a sightings bar, counts, and a **View on map** button (hidden when the hotspot has no coordinates).

#### Reports (`/reports`)

Four summary cards (total alerts, cleared, average SLA met, average hours to clear), an **Alerts per day** bar chart (detected, merged duplicates, cleared; range 7, 14 or 30 days), and a **Ward league table** (counts per status, SLA met %, average hours to clear).

#### Admin (`/admin`)

Tabs; write actions are for **admin** only, operators can view.

| Tab | Component | Endpoints | Notes |
|---|---|---|---|
| Officers | `OfficersTab.tsx` | `GET/POST/PUT/DELETE /officers`, `GET /wards` | Add, edit, deactivate officers per ward |
| Vehicles | `VehiclesTab.tsx` | `GET/POST/PUT/DELETE /vehicles`, `GET /wards` | Fleet registry with online/offline; refreshes every 30 s |
| Wards | `WardsTab.tsx`, `WardImportDialog.tsx` | `GET /wards`, `POST /wards/import` | Search the ward list; **Add ward** dialog (below) |
| Users (admin only) | `UsersTab.tsx` | `GET/POST/PUT/DELETE /users`, `GET /officers`, `GET /wards` | Accounts and roles; an officer login needs its officer and ward |
| Rules and SLAs | `SettingsTab.tsx` | `GET /settings`, `PUT /settings` | Heap and litter SLA hours, minimum confidence, merge radius, next-pass radius, online window; only changed keys are sent |
| Audit log | `LogTabs.tsx` | `GET /audit?limit=100` | Newest first |
| ICCC feed | `LogTabs.tsx` | `GET /integrations/iccc/events?limit=30` | Lifecycle events in the city ICCC format; refreshes every 15 s; the outbound push is not live yet |
| Vehicle passes | `LogTabs.tsx` | `GET /passes` | Camera runs the backend has evaluated |

**Add ward dialog** (`WardImportDialog.tsx`, parsing in `lib/wardGeo.ts`, preview in `BoundaryPreview.tsx`):

1. Drop a file or paste text. It accepts GeoJSON (FeatureCollection, Feature, Polygon, MultiPolygon) **or the wards `INSERT ... ST_GeomFromGeoJSON('{...}')` SQL text** (`.geojson`, `.json`, `.sql`, `.txt`).
2. It validates the data (geometry type, coordinate ranges) and says how many wards and boundary points it read.
3. A single ward shows code, name, city and source fields (pre-filled from the data). Several wards show the name property, code property, code prefix and clickable property chips.
4. A live map shows the outline so it can be checked against the city.
5. "Replace all existing wards" is **off** by default and asks for confirmation when on.
6. It sends `POST /wards/import` with `{ geojson, name_field, code_field, code_prefix, city, source, replace }`.

#### Officer page (`/officer`)

Phone-sized list of open alerts in the officer's own ward. Each card shows type, status, SLA, ward, coordinates, and a **Navigate** button that opens Google Maps directions (disabled if no GPS location). Actions: **Start work** (Assigned → In Progress), **Report cleaned** (→ Awaiting Confirmation; closes only when a later camera pass verifies), **Could not clear** (reason presets: Needs truck, Blocked or private, Nothing found, Wrong location, or free text).

#### Login page (`/login`)

Split layout over an animated road background (`public/login-bg.svg`: a truck drives while garbage piles approach and are detected, with a mouse parallax; motion stops when the visitor prefers reduced motion). The left panel carries the H&T logo and product pitch; the right is the sign-in card (email, password with show/hide, error box). Success routes by role.

### 5.4 Source layout

```
src/
├── main.tsx, App.tsx                 providers: QueryClient, Tooltip, Router, Toaster
├── index.css                         theme tokens (light/dark), root font scaling, Leaflet dark-mode filter
├── navigation/  AppRouter.tsx, guards.tsx (ProtectedRoute, RoleRoute)
├── components/
│   ├── layout/AppShell.tsx           sidebar/rail/top bar, header, theme toggle, live pause, sign out
│   ├── ErrorBoundary.tsx             keeps one broken screen from blanking the app
│   └── ui/                           button, card (+Label, Skeleton, EmptyState), input, select, switch,
│                                     tabs, table, badge (Status/Type), dialog, tooltip, mini-map
├── features/
│   ├── auth/        api, hooks (login, restore session, change password), screens/LoginPage
│   ├── dashboard/   api (alerts, media, stats), hooks (useAlerts…), components (AlertDrawer, KpiCards, SlaCell),
│   │                screens (AlertsPage, MapPage)
│   ├── hotspots/    api, hooks, screens/HotspotsPage
│   ├── reports/     api, hooks, screens/ReportsPage
│   ├── admin/       api (officers, vehicles, users, wards, settings, audit, iccc, passes), hooks,
│   │                components (tabs, ward import dialog, boundary preview), lib/wardGeo.ts, screens/AdminPage
│   └── officer/     api, hooks, screens/OfficerPage
├── services/api/    axios.ts (client + interceptors + getErrorMessage), queryClient.ts
├── store/           authStore.ts, uiStore.ts
├── lib/utils.ts     cn, IST date formatters, timeLeft, timeAgo, pct, hasCoords, fmtCoords
└── types/api.ts     every API type (Alert, User, Officer, Vehicle, Settings, Ward, …)
```

Each feature follows the same pattern: `api/` (plain axios calls) → `hooks/` (TanStack Query wrappers) → `screens/` and `components/`.

### 5.5 State and data handling

**Zustand stores**

| Store (storage key) | Holds | Persisted |
|---|---|---|
| `auth-store` | `token`, `user`, `setSession`, `logout` | token and user, in `localStorage` |
| `ui-store` | `theme` (light/dark), `drawerAlertId` (alert open in the drawer), `livePaused` | theme only |

**TanStack Query** defaults (`services/api/queryClient.ts`): data stays fresh for 5 s, refetches when the window regains focus, and retries at most twice — never for `4xx` errors.

| Query key | Endpoint | Refresh |
|---|---|---|
| `['me', token]` | `/auth/me` | cached 60 s, no retry |
| `['alerts', filters]` | `/alerts` | 10 s, keeps previous page while loading |
| `['alert', id]` | `/alerts/{id}` | 10 s |
| `['timeline', id]`, `['recipients', id]` | timeline, recipients | on open |
| `['stats']` | `/dashboard/stats` | 10 s |
| `['hotspots', days, min]` | `/hotspots` | on open |
| `['reports', 'daily', days]`, `['reports', 'wards']` | reports | on open |
| `['wards']` | `/wards` | cached 10 min, refreshed after a ward import |
| `['officers', filters]`, `['users']`, `['settings']`, `['audit']`, `['passes']` | admin lists | on open |
| `['vehicles', filters]` | `/vehicles` | 30 s on the Vehicles tab |
| `['iccc']` | ICCC events | 15 s |
| `['officer-tasks']` | `/officer/tasks` | 15 s |

All alert actions (assign, dismiss, close, reopen, override) share one wrapper that shows a success toast and then refreshes the alerts list, stats, the alert, its timeline, the audit log, officer tasks, hotspots and reports.

**Error handling:** the axios response interceptor signs the user out on `401` (except on the login call) and shows "Not permitted for your role." on `403`. `getErrorMessage()` turns any failure into readable text: a string `detail`, a joined list of validation issues, "Cannot reach the server…" when there is no response, or the error's own message. A React error boundary wraps each page (reset when the route changes) and the drawer content.

**Coordinates can be missing.** Alerts and hotspots may have `latitude`/`longitude` as `null` when no GPS fix matched. The helpers `hasCoords()` and `fmtCoords()` guard every place that uses them (drawer, map, officer page, hotspots).

### 5.6 Look and feel

- **Theme:** brand green `#2F7A37`, accent cyan `#00AEEF`, dark sidebar `#0F1F18`; light and dark themes as CSS variables, switched by a `dark` class and remembered; status and SLA colours have soft backgrounds for both themes.
- **Responsive layout:** under 1024 px a top bar; 1024–1279 px an icon-only sidebar rail with tooltips; 1280 px and up the full sidebar (224 px, 256 px on big panels). Content is centred with a maximum width of 1600 px (1880 px from 1536 px wide). KPI cards are 4 per row, and 8 per row from 1536 px.
- **Density by screen:** the root font size is 15 px for 1024–1439 px wide screens (11″–13″ laptops), 16 px for 1440–1919 px, 17 px from 1920 px and 19 px from 2560 px; 14 px on short screens under 700 px tall.
- **Layering:** header 20, map controls 500 (inside an isolated map so Leaflet's own z-indexes cannot escape), dialogs and drawer 1100/1101, dropdowns 1200, tooltips 1300, toasts above all.
- **Tooltips:** every icon-only button (the shared `Button` with `size="icon"` uses its `aria-label`), the drawer's close button, the login show/hide eye, and the sidebar icons in rail mode.
- **Accessibility:** labels on icon buttons, focus outlines, keyboard-activatable table rows, reduced-motion respected on the login animation.
- **Branding:** the Hare & Turtle logo (`public/hnt-logo.svg`, `public/hnt-mark.svg`) on a white tile in the sidebar and login page, the mark as favicon; the product name "PCMC Sarthi" in the browser tab, sidebar and login page.

---

## 6. Mobile app (`mobile/`)

### 6.1 What it does

The app turns a phone into a street-capture device. While recording it:

1. records 1280×720 video in **5-second chunks**,
2. logs GPS **once per second**,
3. uploads chunks and GPS in the background (even with the screen off, through an Android foreground service),
4. retries automatically until everything has reached the server, then asks the server to finish the session.

Screens (bottom tabs): **Record**, **Sessions**, **Settings**.

### 6.2 Technology and packages

React Native **0.88.1** with React **19.3.0** and TypeScript, Node 22.11 or newer, Android only.

**Runtime packages**

| Package | Version | What it does here |
|---|---|---|
| `react-native` | 0.88.1 | The framework |
| `react-native-vision-camera` | ^4.7.3 | Camera preview and chunked video recording (H.264, bitrate, fps, format) |
| `react-native-geolocation-service` | ^5.3.1 | High-accuracy GPS watch, 1 point per second |
| `react-native-background-actions` | ^4.1.0 | Android foreground service that keeps recording, GPS and uploads alive when the screen is off |
| `react-native-blob-util` | ^0.25.1 | Files: move finished chunks, read size, delete after upload, free-space check |
| `@tanstack/react-query` | ^5.105.0 | Upload and API calls as retrying mutations (also usable from the background task), connection check, session-status polling |
| `axios` | ^1.21.0 | HTTP client (base URL resolved per request from Settings) |
| `zustand` | ^5.0.16 | State stores |
| `@react-native-async-storage/async-storage` | ^3.1.1 | Persists the stores so sessions survive an app restart |
| `@react-navigation/native`, `bottom-tabs` | ^7.5.1, ^7.21.0 | The three-tab navigation |
| `@react-navigation/native-stack` | ^7.21.0 | Installed but not used yet |
| `react-native-screens`, `react-native-safe-area-context` | ^4.30.1, ^5.5.2 | Navigation dependencies and safe-area insets |
| `lucide-react-native`, `react-native-svg` | ^1.64.0, ^15.16.0 | Icons (the icon set draws with SVG) |
| `@react-native/new-app-screen` | 0.88.1 | Template leftover, unused |

**Dev packages:** `@react-native-community/cli` (+ android, ios platforms) 20.2.0, `@react-native/babel-preset`, `eslint-config`, `jest-preset`, `metro-config`, `typescript-config` (all 0.88.1), `@babel/core`, `@babel/preset-env`, `@babel/runtime`, `jest`, `react-test-renderer`, `eslint`, `prettier`, `typescript` ^6, and the matching `@types/*`.

**Scripts:** `npm start` (Metro) · `npm run android` · `npm run lint` · `npm test`.

### 6.3 Android configuration

| Item | Value |
|---|---|
| Package / application id | `com.livecameraapp` (kept from the template; the visible app name is "PCMC Sarthi") |
| Launcher label | `PCMC Sarthi` (`res/values/strings.xml`) |
| SDK levels | min 24, target 36, compile 37; NDK 27.1.12297006; version 1.0 (code 1) |
| Permissions | `INTERNET`, `CAMERA`, `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`, `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CAMERA`, `FOREGROUND_SERVICE_LOCATION`, `POST_NOTIFICATIONS`, `WAKE_LOCK`; camera hardware required |
| Foreground service | `RNBackgroundActionsTask` with `foregroundServiceType="camera|location"` (required on Android 14+); notification "Street capture running" |
| Orientation | portrait by default; a small Kotlin module `AppOrientation.lock(mode)` (files `OrientationModule.kt`, `OrientationPackage.kt`) switches between portrait and landscape from the app |
| Network | `usesCleartextTraffic="true"` so plain `http://` servers and ngrok TCP tunnels work |
| Signing | the release build is signed with the **debug keystore** (fine for testing; replace before publishing) |

Runtime permissions the app asks for: camera and precise location (both mandatory), plus notifications on Android 13+. If "Don't ask again" was chosen it offers to open system Settings.

### 6.4 Source layout

```
src/
├── App.tsx                          providers; locks orientation; mounts AutoConnect
├── constants/index.ts               all tunable numbers (below)
├── navigation/                      RootNavigator, BottomTabNavigator (Record · Sessions · Settings), types
├── features/
│   ├── record/
│   │   ├── screens/RecordScreen.tsx            camera preview + overlays + recording controls
│   │   ├── components/                         RecordButton, RecBadge, StatusRow (stat tiles), LiveCoords
│   │   ├── hooks/                              useCaptureSession (start/stop/rotate chunks), useCapturePermissions
│   │   ├── services/                           uploader.ts, gpsLogger.ts, foregroundService.ts
│   │   └── api/                                sessionApi.ts (HTTP calls), mutations.ts (retry rules)
│   ├── sessions/
│   │   ├── screens/SessionsScreen.tsx          summary, filters, list, pull to refresh
│   │   ├── components/SessionCard.tsx          one session with progress, stats, actions
│   │   └── api/useSessionStatus.ts             polls the server for processing status
│   ├── connection/                             useConnection, AutoConnect, ConnectionBadge
│   └── settings/                               SettingsScreen, api/useHealthCheck
├── components/                      Badge, Button, Card, Input, Loader, SegmentedControl, UploadProgress
├── services/                        api (axios, interceptors, queryClient + runMutation), orientation, permissions, storage
├── store/                           sessionsStore, settingsStore, uiStore
├── hooks/                           useOrientation, orientationOptions
├── theme/index.ts                   colours, spacing, radius, type scale
├── types/index.ts                   GpsPoint, ChunkRecord, SessionState, LocalSession, ServerSessionStatus
└── utils/time.ts                    session id, elapsed time, formatWhen, sleep, APP_STARTED_AT
```

### 6.5 Tunable settings (`src/constants/index.ts`)

| Constant | Value | Meaning |
|---|---|---|
| `CHUNK_MS` | 5 000 | Length of each video chunk. Marked as a testing value; the original contract was 60 000 |
| `VIDEO_WIDTH` × `VIDEO_HEIGHT` | 1280 × 720 | Recording resolution |
| `VIDEO_FPS` | 15 | Frames per second (clamped to what the camera format supports) |
| `VIDEO_BITRATE_MBPS` | 1 | Video bitrate, about 0.6 MB per 5-second chunk |
| `VIDEO_CODEC` | `'h264'` | `'h265'` would be about 40% smaller but needs backend support |
| `MAX_CHUNK_BYTES` | 3 MB | A chunk larger than this is logged as a warning |
| `GPS_INTERVAL_MS` | 1 000 | One GPS point per second |
| `GPS_FLUSH_MS` | 10 000 | Background loop interval: send GPS and pending chunks |
| `LOW_STORAGE_BYTES` | 2 GB | Below this free space the app warns before recording |
| `DEFAULT_BASE_URL` | an ngrok TCP address | Server address used until changed in Settings |
| `DEMO_VEHICLE_ID` | `PCMC-DEMO-01` | Default vehicle name |
| `APP_VERSION` | `0.1.0` | Sent to the server when a session is created |

Audio is not recorded.

### 6.6 Screens

**Record**
- Camera preview fills the screen.
- Top left: a connection pill (Connecting / Connected / Offline · retrying; tap to retry now; a dot only while recording) and, while recording, the **REC** badge with the elapsed time. Top right: orientation switch (Vertical / Horizontal), disabled while recording.
- Bottom panel: while recording, **Live location** (latitude, longitude to 6 decimals, speed, accuracy; turns amber with "no recent fix" after 5 s); stat tiles **GPS** (Good ≤ 10 m, Fair ≤ 30 m, Poor, or No fix), **Points** logged, **Chunks** uploaded/total; a compact **upload progress** row once the first chunk finishes; any upload error ("Upload retrying: …"); the record button.
- Before recording it checks that the base URL and vehicle ID are set, permissions are granted, and storage is not low.

**Sessions**
- Summary strip (sessions, chunks uploaded, events found), filter chips (All, Active, Processing, Done, Failed, each with a count), pull-down to retry waiting uploads and refresh server status, a clear-old-sessions button.
- Each card shows the vehicle, when it was recorded, a status badge (Live, Uploading, Processing, Done, Failed), the animated **upload progress** (smooth bar with shimmer, pulsing cloud icon, per-chunk segments, big percentage), Length / Chunks / GPS left / Events, alert ids, the last upload timing, errors, and **Retry upload** and **Delete** actions.

**Settings**
- Base URL and Vehicle ID (**Save**, **Test connection**), camera orientation, and the Device ID (`android-` plus six random characters, generated once and kept).

### 6.7 Recording and upload pipeline

```
 Start ─▶ permissions, settings, storage checks
        ─▶ session id  <vehicle>_<YYYYMMDD>_<HHmmss>
        ─▶ start foreground service
        ─▶ record chunk 1 ──(every 5 s, scheduled from one start time so lengths do not drift)──▶ chunk 2 …
        ─▶ GPS watch → 1 point/s into a pending buffer

 Each finished chunk: move file to  <Documents>/chunks/<session>_<n>.mp4 → mark finished → try uploading

 Upload pass for a session (safe to repeat; "retry" = run it again):
   1. create the session on the server (once)
   2. send buffered GPS first — the engine needs it to place chunks on the map
   3. upload chunks strictly in order, one at a time, never blocking recording
   4. send GPS again
   5. if recording stopped and everything is uploaded: tell the server the session is complete

 Stop ─▶ stop recording and GPS → session state "uploading" → final upload pass → "processing"
 Server then reports done or failed (polled every 5 s)
```

- **Concurrency:** at most one upload pass per session at a time; a request that arrives during a pass runs again right after instead of being dropped. GPS has its own lock so a slow video upload never holds GPS back.
- **Retries:** each API call retries up to 3 times with exponential back-off (1 s, 2 s, 4 s … up to 30 s); the "complete" call is not retried automatically because the server answers `409` while chunks or GPS are still missing. The background loop re-runs every 10 s anyway.
- **Resilience:** sessions, chunks and pending GPS are saved to storage, so an app kill or reboot loses nothing already recorded. On the next launch the connection check succeeds and the app resumes: a session left "live" by a kill is closed out (its half-written last chunk is dropped) and uploaded automatically.
- **Auto-connect:** when the app opens, and whenever it returns to the foreground, it checks the server (`GET /health`); it rechecks every 5 s while offline and every 30 s while online, and pushes any waiting uploads each time it connects.
- **Foreground service:** keeps running after Stop until every session has been uploaded.
- **Session states:** `live` → `uploading` → `processing` → `done` or `failed`. The **Failed** badge always comes from the **server** reporting `status: "failed"` (for example, processing the video failed). A chunk or network error never sets Failed; it shows as red "retrying" text instead.
- **Size logging:** every finished chunk logs its size and length (`[record] chunk 2: 0.61 MB, 5.0 s`); upload timing is logged too (`[upload] …`).

### 6.8 Mobile state and storage

| Store (AsyncStorage key) | Holds |
|---|---|
| `settings` | `baseUrl`, `vehicleId` (defaults to the demo name when empty), `deviceId` |
| `sessions` | every local session: chunks (path, finished, uploaded), pending GPS, counters, state, last error, upload timing, live upload progress |
| `ui` | camera orientation |

### 6.9 Endpoints the mobile app calls

All go to the **ingest gateway / AI engine** at the base URL from Settings (not the dashboard backend).

| Method and path | When | Body / response |
|---|---|---|
| `GET /health` | Auto-connect and "Test connection" | → `{ ok, service }` |
| `POST /sessions` | Once per session, first upload pass | `{ session_id, vehicle_id, device_id, app_version, video_started_at_utc }` |
| `POST /sessions/{id}/gps` | Every pass (about every 10 s) | `{ points: [{ t_epoch_ms, lat, lon, speed_kmh?, heading_deg?, accuracy_m? }] }` |
| `POST /sessions/{id}/chunks/{index}` | Per chunk, in order | multipart form, field `file` = `chunk_<n>.mp4` (`video/mp4`); 10-minute timeout; upload progress shown; → includes `video_bytes` |
| `POST /sessions/{id}/complete` | After Stop, when all chunks and GPS are delivered | `409` if something is still missing |
| `GET /sessions/{id}` | Every 5 s for live or processing sessions | → `{ session_id, status, chunks_received, events_found, alerts }` |

Because the video clock matters, the first chunk's start time (`video_started_at_utc`) and the GPS points' own timestamps (`t_epoch_ms`) share one clock, and the server places each chunk by that clock.

---

## 7. Complete API reference

The dashboard backend exposes **50 operations** (from its live OpenAPI schema, titled "PCMC Garbage Alerts – Sprint 3 (PostGIS)", version 0.1.0). Interactive docs are at `GET /docs` on the running server. "Web" shows where this repository's dashboard uses it.

### 7.1 Authentication and users

| Method | Path | Roles | Purpose | Web |
|---|---|---|---|---|
| POST | `/auth/login` | public | Email and password → token and user | Login page |
| GET | `/auth/me` | any | Current user | Session restore |
| POST | `/auth/change-password` | any | Change own password (new ≥ 8 chars) | API function exists; **no screen yet** |
| GET | `/users` | admin | List accounts | Admin → Users |
| POST | `/users` | admin | Create account | Admin → Users |
| GET | `/users/{user_id}` | admin | One account | not used |
| PUT | `/users/{user_id}` | admin | Edit account | Admin → Users |
| DELETE | `/users/{user_id}` | admin | Deactivate (soft; not yourself) | Admin → Users |

### 7.2 Alerts

| Method | Path | Roles | Purpose | Web |
|---|---|---|---|---|
| GET | `/alerts` | any | List with filters `status, ward_code, ward, vehicle_id, type, q, include_duplicates, limit, offset` → `{ total, alerts }` | Alerts, Map |
| GET | `/alerts/{id}` | any | One alert | Drawer |
| GET | `/alerts/{id}/timeline` | any | Activity log | Drawer |
| GET | `/alerts/{id}/snapshot` | any | Evidence photo (`image/jpeg`, `404` until uploaded) | Drawer |
| GET | `/alerts/{id}/clip` | any | Evidence clip (`video/mp4`, about 10 s) | Drawer |
| GET | `/alerts/{id}/recipients` | any | Who would be notified | Drawer |
| POST | `/alerts/{id}/assign` | admin, operator | `{ officer_id }` or `{ assigned_to }`; New → Assigned; emails the assignee; `409` if not New | Drawer |
| POST | `/alerts/{id}/start` | officer (own ward), admin, operator | Assigned → In Progress | Officer page |
| POST | `/alerts/{id}/report-cleared` | officer (own ward) | → Awaiting Confirmation | Officer page |
| POST | `/alerts/{id}/cant-clear` | officer (own ward) | `{ reason }` → back to Assigned | Officer page |
| POST | `/alerts/{id}/close` | admin, operator | Manual close → Cleared | Drawer |
| POST | `/alerts/{id}/dismiss` | admin, operator | `{ reason }` → Dismissed | Drawer |
| POST | `/alerts/{id}/reopen` | admin, operator | Cleared or Dismissed → Assigned | Drawer |
| POST | `/alerts/{id}/status` | admin | `{ status, assigned_to? }` override, audited | Drawer |
| POST | `/alerts/{id}/notify` | admin, operator | Re-send the alert email | Drawer |

### 7.3 Dashboard, reports and logs

| Method | Path | Roles | Purpose | Web |
|---|---|---|---|---|
| GET | `/dashboard/stats` | any | KPI cards and counts per status | Alerts page |
| GET | `/hotspots?days=&min_count=` | any | Repeat spots (about 100 m cells) | Hotspots, Map |
| GET | `/reports/daily?days=` | any | Detected / duplicates / cleared per day | Reports |
| GET | `/reports/wards` | any | Ward league table | Reports |
| GET | `/audit?limit=` | admin, operator | Audit entries, newest first | Admin → Audit log |
| GET | `/settings` | any | Rules and SLAs | Admin → Rules |
| PUT | `/settings` | admin | Update rules (send changed keys only) | Admin → Rules |
| GET | `/integrations/iccc/events?limit=` | any | ICCC lifecycle feed | Admin → ICCC feed |
| GET | `/passes` | any | Evaluated vehicle runs | Admin → Vehicle passes |
| GET | `/officer/tasks` | officer | Open alerts of the officer's own ward | Officer page |

### 7.4 Wards, officers and vehicles

| Method | Path | Roles | Purpose | Web |
|---|---|---|---|---|
| GET | `/wards` | any | `{ count, wards: [{ ward_code, name, city, source }] }` | Dropdowns, Admin → Wards |
| POST | `/wards/import` | admin | Import ward boundaries: `{ geojson, name_field, code_field?, code_prefix, city?, source?, replace }` | Admin → Wards → Add ward |
| GET | `/wards/resolve?lat=&lon=` | any | Ward for a point (debugging) | not used |
| GET | `/officers` | any | List (`ward_code`, `active_only`) | Admin, drawer, Users |
| GET | `/officers/{id}` | any | One officer | not used |
| POST | `/officers` | admin | Create; `422` if the ward is unknown | Admin → Officers |
| PUT | `/officers/{id}` | admin | Edit, move ward, reactivate | Admin → Officers |
| DELETE | `/officers/{id}` | admin | Soft-deactivate | Admin → Officers |
| GET | `/vehicles` | any | List with `online` and `last_seen_at` | Alerts filter, Admin |
| GET | `/vehicles/{id}` | any | One vehicle with `open_alerts` | not used |
| POST | `/vehicles` | admin | Register; `409` if it exists | Admin → Vehicles |
| PUT | `/vehicles/{id}` | admin | Edit, reactivate | Admin → Vehicles |
| DELETE | `/vehicles/{id}` | admin | Soft-deactivate | Admin → Vehicles |

### 7.5 Machine-only endpoints (never called by either app)

| Method | Path | Caller | Purpose |
|---|---|---|---|
| POST | `/events` | ingest gateway | Detector events `{ run_id, events: [...] }` |
| POST | `/passes` | ingest gateway | A run's GPS track; triggers next-pass closure |
| POST | `/alerts/{id}/media` | ingest gateway | Upload evidence (`kind=snapshot|clip`, `file`) |
| GET | `/health` | anyone | `{ ok, duplicate_radius_m, pass_radius_m, database }` |

### 7.6 Notes

- The dashboard sends `Authorization: Bearer <token>` on every call except login.
- Evidence endpoints need that header, so the web loads them as blobs and shows them through object URLs; a plain `<img src>` would fail.
- `snapshot_url` and `clip_url` on an alert are `null` until the gateway has uploaded the file (usually seconds after the alert appears).
- `road_segment` and `chainage_m` are `null` until PCMC supplies road master data; the UI shows "—".

---

## 8. Data models

**Alert** (list, drawer, map, officer tasks)

| Field | Meaning |
|---|---|
| `alert_id`, `status`, `type`, `size_class`, `priority`, `class` | Identity, lifecycle status, `Heap` or `Scattered litter`, and AI labels |
| `track_id`, `vehicle_id` | Detector track and the vehicle that saw it |
| `latitude`, `longitude` | Position — **may be `null`** |
| `ward`, `ward_code`, `road_segment`, `chainage_m` | Ward name and code; road fields are `null` for now |
| `best_confidence`, `avg_confidence` | Detector confidence (0–1), may be `null` |
| `snapshot_path`, `clip_path`, `snapshot_url`, `clip_url` | Evidence file names and the paths to fetch them |
| `created_at`, `due_at`, `sla_state` | When raised, deadline, and `on_track` / `at_risk` / `overdue` |
| `assigned_to`, `assignee_officer_id`, `assigned_at` | Assignment |
| `closed_at`, `closure_source`, `dismiss_reason`, `cant_reason` | How and why it ended |
| `seen_count`, `duplicate_of`, `last_detected_at`, `last_detected_run` | Duplicate merging and last sighting |

**Other models:** `User` (user_id, name, email, role, officer_id, ward_code, active, created_at) · `Officer` (officer_id, name, phone, email, ward_code, role, active, created_at) · `Vehicle` (vehicle_id, label, vehicle_type, registration_no, ward_code, device_id, active, last_seen_at, online) · `Ward` (ward_code, name, city, source) · `Hotspot` (ward_code, ward, latitude, longitude, road_segment, spots, alerts, open, last_seen_at) · `Settings` (heap_sla_hours 4, litter_sla_hours 24, duplicate_radius_m 25, pass_radius_m 25, confidence_threshold 0.6, photo_required false, vehicle_online_minutes 15) · `TimelineEntry` (t, actor, action, message) · `DashboardStats` (cards and by_status) · `WardPerformance` (counts per status, sla_met_pct, avg_clear_hours). All web types are in `frontend/src/types/api.ts`; mobile types are in `mobile/src/types/index.ts`.

---

## 9. Running, building and configuring

### 9.1 Web dashboard

```bash
cd frontend
npm install
# .env  →  VITE_BACKEND_URL=http://<dashboard-backend>:8000
npm run dev          # http://localhost:5173
npm run build        # typecheck + production build in dist/
```

Sign in with an account that exists on the backend (there are no defaults; see section 4.3). Update `VITE_BACKEND_URL` whenever the tunnel or server address changes, then restart `npm run dev`.

### 9.2 Mobile app

```bash
cd mobile
npm install
npm start            # Metro bundler
npm run android      # build and install on a connected Android device or emulator
```

On the phone: **Settings** → enter the ingest gateway's Base URL (the ngrok address changes on every tunnel restart) and a Vehicle ID → **Save** → **Test connection**. Then **Record** → allow camera and location → tap the record button. After changing the camera resolution or fps, restart Metro. The new launcher name "PCMC Sarthi" needs a native rebuild to appear.

### 9.3 Things that must match between the parts

- The vehicle ID typed in the mobile app should be registered under Admin → Vehicles (unregistered vehicles still ingest, but have no fleet record).
- Ward boundaries must be imported (Admin → Wards) before alerts can get a ward, and before officers and vehicles can be assigned to one.
- The backend must know the chunk length (5 s while testing) if it works out chunk times from the chunk index.

---

## 10. Known gaps, open questions and history

**Gaps (by design or pending)**

| Item | Detail |
|---|---|
| Vehicle positions on the map | The backend has no live vehicle position endpoint, so the map shows alerts and hotspots only |
| Road segment and chainage | `null` until PCMC provides road data |
| Officer "after" photo | There is no endpoint for an officer to upload a cleanup photo |
| Change password | The API call and hook exist, but there is no screen for it |
| ICCC push | The feed is a read-model; the outbound push waits for the city's API spec |
| iOS | No `ios/` project; Android only |

**Open questions / to verify**

- `POST /wards/import`: whether importing an existing ward code updates it or returns an error is unknown; the response body shape is undocumented (the success toast shows a count only if one is returned). Leave "Replace" off when unsure.
- H.265 recording would shrink chunks about 40% more but needs the backend to decode it; not tested.
- The mobile chunk length is 5 s for testing; confirm what the backend expects in production.

**Security and release notes**

- The web app keeps the JWT in `localStorage`; it expires after 12 hours and the user is signed out on the next `401`.
- The release build of the mobile app is signed with the debug keystore, and cleartext HTTP is allowed. Both are for testing; change them before a store release.
- The Android package id (`com.livecameraapp`) and the internal React Native component name (`LiveCameraApp`) are still the template names. The visible name is "PCMC Sarthi". Renaming the package id is a separate change and would make an installed copy count as a different app.
- The API addresses in `frontend/.env` and `mobile/src/constants/index.ts` are temporary ngrok tunnels.

**Notable decisions and fixes in the project's history**

- The mobile "Failed" badge is purely the server's processing status, not an upload error.
- Mobile video was reduced from 1080p / 30 fps / 3.5 Mbit/s (about 2.2 MB per 5 s chunk) to 720p / 15 fps / 1 Mbit/s (about 0.6 MB per 5 s chunk), after first trimming chunks from 10 s to 5 s.
- The alert drawer crashed on alerts without coordinates; coordinates are now optional everywhere and an error boundary prevents a white screen.
- The alert drawer once opened behind the Leaflet map; the map is now an isolated stacking context and dialogs sit above it.

---

## 11. Glossary

| Term | Meaning |
|---|---|
| **Alert** | A detected garbage spot that must be cleaned, with a status, location, ward, deadline and evidence |
| **Chunk** | One short video file (5 s) recorded and uploaded by the mobile app |
| **Session** | One recording run from Start to Stop; made of many chunks plus GPS points |
| **Pass** | A vehicle's run over a stretch of road; a clean pass over an alert's spot confirms it is cleared |
| **Ward** | A city administrative area with a boundary polygon (for example `PMC-07`) |
| **Hotspot** | A location (about 100 m cell) where garbage keeps reappearing |
| **SLA** | The time allowed to clear an alert: 4 h for a heap, 24 h for scattered litter |
| **Evidence** | The photo (with the garbage box drawn) and the 10-second clip attached to an alert |
| **ICCC** | The city's Integrated Command and Control Centre; receives lifecycle events |
| **Ingest gateway** | The server that receives video and GPS from the phones and feeds detections to the dashboard backend |
| **PostGIS** | The database extension that stores ward boundaries and does the location matching |
