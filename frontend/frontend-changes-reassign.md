# Frontend changes for the one-step reassign backend
For: Mosin (dashboard) · From: backend (sprint3_backend_pg, suite 36/36)
Checked against the 2026-11-03 frontend build (duplicates-toggle build).
If the code has moved since, the same two spots are where the change lands.

## Backend behaviour that changed
- `POST /alerts/{id}/assign` now accepts alerts in **New, Assigned and
  In Progress** (previously New only). On an already-assigned alert it is a
  reassign: assignee replaced, status returns to Assigned, the new assignee
  is emailed, and the timeline gains a `reassigned` entry
  ("Reassigned from X to Y"). Cleared / Dismissed / Awaiting Confirmation
  still return `409`.
- Admin `POST /alerts/{id}/status` to **New** now also clears
  `assigned_to`, `assignee_officer_id` and `assigned_at` in the response.
- Full contract: `FRONTEND_API_GUIDE.md` (assign row, status row, timeline
  actions list now includes `reassigned`).

## Required frontend change — AlertDrawer only
File: `src/features/dashboard/components/AlertDrawer.tsx`

1. **Show the assign card for Assigned / In Progress too.** In `Actions`,
   the card is currently gated to New only:
   `{alert.status === 'New' && <AssignCard alert={alert} />}`
   Render `AssignCard` when status is `New`, `Assigned` or `In Progress`.
   Keep it hidden for Awaiting Confirmation / Cleared / Dismissed /
   Duplicate (backend rejects assign there).
2. **Reassign presentation inside `AssignCard`** when the alert already
   has an assignee (`alert.assigned_to` set):
   - Title: "Reassign" (vs "Assign"); button: "Reassign and notify".
   - Show the current assignee ("Currently: {assigned_to}").
   - **Pre-select the current officer** in the dropdown (initialise the
     selection from `alert.assignee_officer_id`). This matters: submitting
     with the default "Ward sanitary officer" option is a label assignment
     and clears the officer link on the backend — an operator must not be
     able to do that by accident.
   No API, hook or type changes: `alertsApi.assign` / `useAssign` already
   send `{ officer_id }` to the same endpoint, and the response shape is
   unchanged.

## No change needed (verified in this build)
- **Timeline** renders each entry's `message` text, so the new
  `reassigned` entry displays as-is — no label map to update.
- **Admin override dropdown** already lists all six lifecycle statuses,
  exactly what the backend accepts.
- **Header "Assigned to …" line** renders whenever `assigned_to` is
  non-null — with the backend now clearing it on set-to-New, the stale-name
  display after an override fixes itself.
- Officer task lists and KPIs derive from backend fields; the existing
  mutation invalidation refreshes them after a reassign.

## Optional polish
- `useAssign`'s success toast says "Alert assigned" — could say
  "Alert reassigned" when the alert already had an assignee.
- The assign response includes a `notification` report (new assignee
  emailed); surfacing "email sent" in the toast is possible but new —
  the UI does not show it today for first assignments either.
