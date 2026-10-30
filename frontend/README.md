# Road Garbage Control Room (web)

Dashboard for the PCMC garbage-alert backend. API contract: [FRONTEND_API_GUIDE.md](./FRONTEND_API_GUIDE.md). Original design reference: `HnT_AI_Road_Garbage_Detection_Prototype.html`.

**Stack:** Vite + React + TypeScript, Tailwind CSS v4, TanStack Query (server state + live polling), Zustand (auth session, theme, drawer/pause state), Radix UI primitives (shadcn-style components in `src/components/ui`), React Router, Leaflet (OpenStreetMap), Recharts.

## Run

```sh
cp .env.example .env     # set VITE_BACKEND_URL (dashboard backend, port 8000)
npm install
npm run dev              # http://localhost:5173
npm run build            # typecheck + production build
```

The backend must allow CORS from the dev origin.

## Layout

`src/features/<feature>/{api,hooks,components,screens}` mirrors the guide sections: `auth`, `dashboard` (alerts, drawer, live map), `hotspots`, `reports`, `admin`, `officer`. Shared axios instance + interceptors in `src/services/api`, stores in `src/store`.

## Roles

| Role | Sees |
|---|---|
| admin | everything, incl. Users and editing officers/vehicles/rules, status override |
| operator | alerts, map, hotspots, reports, admin (read + audit); assign/close/dismiss/reopen |
| viewer | alerts, map, hotspots, reports (read-only) |
| officer | only "My tasks" (`/officer`): start, mark cleared, could not clear |

## Known gaps (backend)

- Evidence photos aren't served yet: the drawer shows "Photo pending".
- No vehicle positions endpoint, so the map shows alerts and hotspots only.
- `road_segment` / `chainage_m` are null until PCMC road data exists.
- After-photo upload for officers has no endpoint yet.
