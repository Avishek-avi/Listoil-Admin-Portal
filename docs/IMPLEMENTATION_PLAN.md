# Listoil Admin Portal — Phased Implementation Plan

Derived from the screen-by-screen audit on 2026-05-02. Each phase is independently shippable.

## Context Notes from Exploration

- **Two scope helpers exist**: `src/lib/permissions.ts` (the TODO stub flagged in the audit) AND `src/lib/scope-utils.ts` (which `auth.ts` and `ticket-actions.ts` actually consume). The audit item should be redirected to consolidate on `scope-utils.ts` and delete/deprecate `permissions.ts`.
- **Schema is well-suited**: `auditLogs` (line 12) has full shape (`tableName`, `recordId`, `operation`, `action`, `oldState`, `newState`, `correlationId`, `ipAddress`, `userAgent`). `userScopeMapping` (line 1159) supports `scopeType`, `scopeLevelId`, `scopeEntityId`, `accessType`. No new tables required for Phase 1.
- **`ticket-actions.ts` already does scope filtering** — use it as the canonical pattern for member/master/finance.
- **`window.prompt` only flagged in `MembersClient.tsx`** in the current sweep; audit also called out RolesClient/ConfigurationClient, so include them as preventive.

---

## Phase 1 — Security Hardening & Trust Foundation (2 weeks)

### Goals
Lock down the auth/scope/audit gaps that make the portal unsafe to ship to non-admin users. Everything in this phase is invisible-by-design but blocks production rollout.

### Tasks

1. **Consolidate scope resolution onto `scope-utils.ts`**
   - Files: `src/lib/permissions.ts` (deprecate / re-export only), `src/lib/scope-utils.ts` (already real), `src/actions/member-actions.ts`, `src/actions/masters-actions.ts`, `src/actions/finance-actions.ts`, `src/actions/dashboard-actions.ts`.
   - Approach: Audit each action file for raw queries that bypass scope. Inject `await getUserScope(session.user.id)` and apply state/city filters using the same `scope.entityNames` lowercase-`inArray` pattern used in `ticket-actions.ts:64-74`. Add a shared helper `applyLocationScope(scope, { stateCol, cityCol })` in `scope-utils.ts`.
   - Schema: none — `userScopeMapping` already stores what we need.
   - Risk: Performance regression if scope joins fan out — add covering indexes on `(state, city)` for `retailers`, `mechanics`, `counter_sales` via a Drizzle migration in `drizzle/`.

2. **Server-side ticket status transition validation**
   - File: `src/actions/ticket-actions.ts` (~line 250+ updateTicketStatus).
   - Approach: Define a transition map (`open → in_progress → resolved → closed`, plus `reopen`). Reject illegal jumps with a typed error returned to the client.

3. **Scheme date/slab validation**
   - Files: `src/app/(admin)/schemes-campaigns/SchemesClient.tsx`, `src/actions/schemes-actions.ts`.
   - Approach: Add a zod schema: `endDate > startDate`, slabs sorted ascending, no overlapping `[min,max]` ranges, no gaps if `contiguous` flag set. Validate server-side in the action before insert/update; mirror client-side for UX.

4. **Audit logging wrapper**
   - Files: new `src/lib/audit.ts`; integrate into `member-actions.ts` (approve/reject), `masters-actions.ts` (CRUD), `schemes-actions.ts`, `process-actions.ts` (manual scan adjustments), `role-actions.ts`.
   - Approach: Single helper `withAudit({ tableName, recordId, action, oldState, newState })` that writes to existing `auditLogs` table. Capture `ipAddress`/`userAgent` from `headers()` in server actions, `changedBy` from session, and a per-request `correlationId` (uuid).
   - Schema: none — table exists at `schema.ts:12-32`.

5. **Replace `usersData` mock + mock access logs in role-actions**
   - File: `src/actions/role-actions.ts`.
   - Approach: Replace `usersData` array with `db.select().from(users).leftJoin(userTypeEntity)`. Build access logs view from `auditLogs` filtered by `action IN ('login','logout','permission_denied')`. Add login/logout events into `auth.ts` `events.signIn` / new `events.signOut` to write `auditLogs` rows.

6. **API + middleware rate limiting and `/api/*` auth**
   - File: `src/middleware.ts` (currently excludes `api` from matcher), new `src/lib/rate-limit.ts`.
   - Approach: Update matcher to `["/((?!_next/static|_next/image|favicon.ico).*)"]` so `/api/*` is covered. Add token-bucket limiter keyed on `userId || ip`; use `@upstash/ratelimit` if Redis available, else in-memory LRU as bridge. Different buckets: `auth` (10/min), `mutations` (60/min), `reads` (300/min).
   - Risk: In-memory limiter doesn't survive serverless cold starts — document as MVP and gate Phase 4 work on Redis provisioning.

7. **Global error boundary + monitoring**
   - Files: new `src/app/(admin)/error.tsx`, `src/app/(admin)/global-error.tsx`, `src/instrumentation.ts`.
   - Approach: Wire `@sentry/nextjs`. Wrap admin layout. Capture session info as Sentry user context.

### Dependencies / Risks
- Sentry DSN must be provisioned before merge.
- Scope rollout requires a one-time data backfill: every existing admin user needs at least one `userScopeMapping` row with `scopeType='GLOBAL'`. Ship a seed script under `scratch/` (read-only repo location) — but actual run must be coordinated with ops.

### Acceptance Criteria
- A user with `scopeType=STATE,scopeEntityId=Karnataka` cannot read members from Maharashtra via `/members`, `/masters`, `/finance`, or `/api/*`.
- All approve/reject/edit actions produce an `audit_logs` row with `oldState`/`newState`.
- Submitting an invalid scheme (end < start, overlapping slabs) returns a structured error.
- `/api/*` returns 401 without session and 429 above limit.
- Sentry receives a synthetic test error from the admin layout.

---

## Phase 2 — UX Trust & File-Upload Safety (2 weeks)

### Goals
Stop silently corrupting data via uploads, and replace browser-native dialogs that look like phishing prompts.

### Tasks

1. **Toast provider + replace `prompt`/`alert`/`confirm`**
   - Files: new `src/components/ui/toaster.tsx` and `src/components/ui/confirm-dialog.tsx` (use `sonner` or MUI Snackbar consistent with existing theme), `src/app/(admin)/layout.tsx` (mount), `src/app/(admin)/members/MembersClient.tsx` (rejection flow), `src/app/(admin)/role-management/RolesClient.tsx`, `src/app/(admin)/configuration/ConfigurationClient.tsx`.
   - Approach: Confirm dialog returns a Promise. Rejection reason becomes a controlled `<TextField>` inside the dialog rather than `window.prompt`.

2. **QR Excel upload hardening**
   - File: `src/app/(admin)/qr-management/page.tsx`, server action under `src/actions/process-actions.ts` (or split out `qr-actions.ts`).
   - Approach:
     - Client: `accept=".xlsx"`, max 10 MB, parse via `xlsx` lib, show preview, require explicit "Confirm import".
     - Server: re-validate MIME via magic bytes (`file-type`), enforce row cap (e.g., 50k), zod-validate each row with column-mapping schema, wrap insert in `db.transaction` with savepoint per 1k batch, dedupe by `qr_code` unique constraint, return per-row error report.
   - Schema: add `unique` index on the QR code column if missing — verify `qrCodes` table.

3. **Configuration creative upload**
   - File: `src/app/(admin)/configuration/ConfigurationClient.tsx`, `src/actions/configuration-actions.ts`, `src/actions/file-actions.ts`.
   - Approach: Same MIME-by-bytes check, max 5 MB, image dimension check, virus-scan hook (stub interface; real impl Phase 4).

4. **KYC document URL ownership check**
   - File: `src/actions/member-actions.ts` (download/view action), `src/app/api/kyc/[memberId]/route.ts` if exists.
   - Approach: Resolve doc → ownerUserId → enforce scope; deny if outside scope or wrong role.

5. **Search input length cap**
   - Files: list pages under `src/app/(admin)/*` clients.
   - Approach: Cap `searchTerm` to 100 chars in the action zod schema; trim and reject control chars.

6. **Per-route role guards**
   - Files: `src/app/(admin)/layout.tsx`, new `src/lib/route-guard.ts`, each `page.tsx` under `(admin)`.
   - Approach: Declare a route→required-permission map in `src/lib/route-permissions.ts`. Layout reads `session.user.permissions` (already populated by `auth.ts:121`) and either renders children or redirects to `/dashboard?denied=1`.

7. **Move `allowedLevels` and hardcoded `department: 'IT'` out of `auth.ts`**
   - Files: `src/lib/auth.ts:74,96`, new row in `userTypeLevelMaster` (already exists) plus a new boolean column `canLoginAdmin`.
   - Schema change:
     ```sql
     ALTER TABLE user_type_level_master ADD COLUMN can_login_admin boolean DEFAULT false;
     UPDATE user_type_level_master SET can_login_admin=true WHERE level_name IN ('Master Admin','Admin','System Admin','Call Centre','Field Management');
     ```
     Drop `department` from the JWT or compute it from `userTypeEntity` (add a `department` column there if needed).

8. **N+1 fix in members list**
   - Files: `src/actions/member-actions.ts` (`getMembersAction` + `getMemberDetailsAction`).
   - Approach: Single query with all joins; expose `getMemberDetailsAction` only for the drawer/detail page, not per-row.

9. **Form validation with zod**
   - Files: every create/edit dialog under `(admin)/*`, server actions accepting form data.
   - Approach: Centralize per-entity schemas in `src/lib/schemas/`. Use `react-hook-form` + `@hookform/resolvers/zod` on client and re-validate server-side.

### Dependencies / Risks
- Toast lib choice (sonner vs MUI Snackbar) must be locked early — pick one, don't ship both.
- `can_login_admin` migration requires data backfill before deploy or admins lose access.

### Acceptance Criteria
- No `window.prompt|alert|confirm` calls remain in `src/app/(admin)/**`.
- Uploading a `.xlsx` renamed to `.exe` is rejected; uploading 100k-row file is partially imported with a downloadable error report.
- A non-admin role hitting `/role-management` is redirected.
- Members list issues 1 query, not N+1.

---

## Phase 3 — Refactor & Component Health (1.5 weeks)

### Goals
Reduce cognitive load on the three monster client components. No behavior change; pure structural cleanup that unblocks Phase 4 features.

### Tasks

1. **Split `qr-management/page.tsx`**
   - Target: `src/app/(admin)/qr-management/page.tsx` (currently ~400 LOC).
   - Approach: Extract `QrUploadForm.tsx`, `QrHistoryTable.tsx`, `QrDetailsDrawer.tsx`, `QrFilters.tsx`. Page becomes server component coordinating data fetching.

2. **`SchemesClient.tsx` state collapse**
   - Files: `src/app/(admin)/schemes-campaigns/SchemesClient.tsx` plus new `useSchemeForm.ts`.
   - Approach: Replace 50+ `useState` with `react-hook-form` for the dialog and a single `useReducer` (`{view, filters, selectedId}`) for list state. Slab editor becomes `useFieldArray`.

3. **`MembersClient.tsx` modal-state cleanup**
   - File: `src/app/(admin)/members/MembersClient.tsx`.
   - Approach: Centralize modal stack into a discriminated union: `type Modal = {kind:'reject',memberId} | {kind:'kyc',memberId} | ...`. One `setModal()` instead of N booleans.

4. **Test scaffolding for refactored components**
   - Files: new `src/app/(admin)/**/__tests__/*.test.tsx`, root `vitest.config.ts`.
   - Approach: Add Vitest + React Testing Library. Cover happy-path + reject flow as regression net.

### Dependencies / Risks
- Pure refactor — risk is regression. Mitigate by snapshotting current behavior in tests *before* refactor.

### Acceptance Criteria
- Largest client file under 250 LOC.
- All existing user flows pass new test suite.
- No new server-side changes (this phase is FE-only).

---

## Phase 4 — Operator Productivity (2 weeks)

### Goals
Add the cross-cutting frameworks (skeletons, exports, bulk ops, audit viewer) that the audit identified as repeatedly missing.

### Tasks

1. **Skeleton + loading framework**
   - Files: new `src/components/ui/skeleton-table.tsx`, `skeleton-card.tsx`. Each `(admin)/*/page.tsx` wraps client list in `<Suspense>`.

2. **CSV export framework**
   - Files: new `src/lib/export/csv.ts`, server actions `getXxxForExport` per entity, route handler `src/app/api/export/[entity]/route.ts`.
   - Approach: Stream rows server-side, respect current scope + filters, add `audit_logs` entry per export.

3. **Bulk operations framework**
   - Files: new `src/components/ui/bulk-action-bar.tsx`, action variants `bulkApproveMembersAction`, `bulkUpdateMastersAction`.
   - Schema: none, but enforce per-batch transaction + per-row audit row.

4. **Audit log viewer UI**
   - Files: new `src/app/(admin)/audit-logs/page.tsx`, `AuditLogsClient.tsx`, `src/actions/audit-actions.ts`.
   - Approach: Filter by `tableName`, `changedBy`, date range, `correlationId`. Diff view of `oldState` vs `newState` (use `jsondiffpatch`).

5. **Permission matrix grid**
   - Files: `src/app/(admin)/role-management/PermissionsMatrix.tsx`, schema additions.
   - Schema change: new tables
     ```
     permissions(id, key, label, module)
     role_permissions(role_id fk userTypeEntity.id, permission_id fk permissions.id, granted bool)
     ```
     Migration under `drizzle/` and added to `src/db/schema.ts`. Replace hardcoded role lists in `auth.config.ts`/`route-permissions.ts` with DB-driven lookup, cached per-session.

6. **Saved filter presets + column visibility**
   - Schema:
     ```
     user_view_preferences(id, user_id fk users.id, view_key text, payload jsonb, is_default bool)
     ```
   - Files: new `src/lib/view-prefs.ts`, hook into existing list pages.

7. **KYC expiry tracking + alerts**
   - Schema additions in `src/db/schema.ts` on `counter_sales.kycDocuments`/`retailers`/`mechanics`: add `kyc_expiry_at timestamp`, index on it.
   - Files: new cron under `src/server/jobs/kyc-expiry.ts`, alert via existing `notification.service`.

8. **Session manager**
   - Schema: new `admin_sessions(id, user_id, jti, ip, user_agent, created_at, last_seen_at, revoked_at)`.
   - Files: extend `auth.ts` jwt callback to write session row; new `src/app/(admin)/role-management/sessions/*`.

### Dependencies / Risks
- Permission matrix is the highest-risk item — it changes how every guard works. Stage behind a feature flag and run shadow checks (compare DB-driven decision vs hardcoded) for a week before flipping.
- Schema migrations must be coordinated with backend team since the schema is shared.

### Acceptance Criteria
- All list views have skeletons, CSV export, and (where applicable) bulk select.
- Audit viewer shows diffs and is filterable.
- Roles can be granted/revoked in UI and changes flow to active sessions on next JWT refresh.
- Force-logout removes a row and invalidates the session within one request cycle.

---

## Phase 5 — Platform Features (rolling, post-MVP)

### Goals
Net-new capabilities. Each feature is its own ticket; group only by quarter.

### Tasks (grouped, lower fidelity)

- **Q1 follow-up**: Cmd+K global search (`src/components/global-search/*`, full-text indexes via Postgres `tsvector` columns on `users`, `tickets`, `qrCodes`); 2FA + password policy (extend `users` with `totp_secret`, `password_changed_at`, `failed_login_count`); mobile responsive sweep + dark mode toggle (theme work in `src/lib/theme.ts`); i18n scaffolding (`next-intl`).
- **Q2 follow-up**: Webhooks out (new `webhook_endpoints`, `webhook_deliveries` tables; reuse rabbitMq broker); dashboard custom date ranges + drill-down + PDF export (`@react-pdf/renderer`); org-chart view (`reactflow` over `userTypeEntity` parent links); Excel template download + column-mapping UI for QR.
- **Q3 follow-up**: SLA dashboard + ticket templates (extend `tickets` with `sla_due_at`, new `ticket_templates`); communication template versioning + test-send (versioned rows in existing comm tables); campaign calendar + canary rollout (new `campaign_rollouts` table); event-bus replay + DLQ + handler test-fire (`eventbus-actions.ts` UI on top of existing rabbit broker).

### Dependencies / Risks
- 2FA touches login flow — must coordinate with Phase 1 audit logging so failed-2FA attempts log correctly.
- Webhooks introduce egress trust boundary — needs separate security review.

### Acceptance Criteria
- Each feature ships behind a flag with its own AC; no blanket criterion for this phase.

---

## Cross-Cutting Risks Register

- **Schema drift**: backend team owns the DB. Every Drizzle migration in this plan needs sign-off; coordinate via `drizzle/` PRs reviewed by backend before merge.
- **Existing `permissions.ts` vs `scope-utils.ts` divergence**: anyone importing `getUserScope` from the wrong file will get the GLOBAL stub. Add an ESLint `no-restricted-imports` rule pointing to `scope-utils.ts` as soon as Phase 1 lands.
- **`auth.ts` CRLF line endings** (per prior observation): may break Turbopack — normalize to LF as part of Phase 1 touch.
- **JWT bloat**: stuffing permissions into JWT (`auth.ts:121`) won't scale past ~50 perms; revisit in Phase 4 when matrix lands — may need to fetch perms per-request from a Redis cache instead.

---

## Critical Files for Implementation
- `src/lib/scope-utils.ts`
- `src/lib/auth.ts`
- `src/middleware.ts`
- `src/db/schema.ts`
- `src/actions/role-actions.ts`
