# Copilot instructions for this repository

Purpose: give an AI coding agent the minimal, actionable context to be productive in this Next.js + Node codebase.

Big picture
- This is a Next.js (App Router) admin webapp (see [src/app/layout.tsx](src/app/layout.tsx)).
- Frontend: React 19 + MUI + Zustand for local UI state. Query layer is wrapped by `QueryProvider` ([src/providers/QueryProvider.tsx](src/providers/QueryProvider.tsx)).
- Auth: NextAuth credentials provider with JWT strategy; auth helpers exported from `src/lib/auth.ts` and enforced in middleware at [src/middleware.ts](src/middleware.ts).
- Data layer: Drizzle ORM + Postgres. DB connection created in [src/db/index.ts](src/db/index.ts). Drizzle migration files live in the `drizzle/` folder.
- Backend services: server-side code is under `src/server/` — repositories, services and RabbitMQ broker integration live here (see `src/server/repositories` and `src/server/rabbitMq/broker.ts`).

Key files to inspect for behavior and conventions
- App entry / layout: [src/app/layout.tsx](src/app/layout.tsx)
- Auth: [src/lib/auth.ts](src/lib/auth.ts), middleware: [src/middleware.ts](src/middleware.ts)
- DB bootstrap: [src/db/index.ts](src/db/index.ts), schemas: [drizzle/schema.ts](drizzle/schema.ts) and `src/db/schema.ts` if present
- Env & secrets: [src/server/configs/config.ts](src/server/configs/config.ts) (all runtime env read here)
- Background / messaging: [src/server/rabbitMq/broker.ts](src/server/rabbitMq/broker.ts)
- UI store: [src/store/index.ts](src/store/index.ts)

Environment & runtime notes
- Uses environment variables extensively; required keys include `DATABASE_URL`, `JWT_SECRET`, `AWS_*` and other tokens referenced in [src/server/configs/config.ts](src/server/configs/config.ts).
- Local env file: `.env.local` is used during development (open to confirm values).

Developer workflows (commands)
- Run dev server: `npm run dev` (Next dev server). See `package.json` scripts.
- Build: `npm run build` and `npm run start` for production start.
- Lint: `npm run lint`.
- Database:
  - Generate types/migrations: `npm run db-generate` (drizzle-kit)
  - Run migrations: `npm run db:migrate`
  - Push schema: `npm run db:push`
  - Drizzle studio: `npm run db:studio`
  - Sync helper: `npm run db-sync` (runs `src/db/sync-database.ts` via `tsx`)

Project-specific patterns & conventions
- App Router: pages and groups are under `src/app/(admin)`, `src/app/(auth)`, `src/app/(superadmin)` — follow grouping for routes and layout overrides.
- Authentication flow: `NextAuth` is used with a credentials provider; middleware protects non-api/_next routes by delegating to `auth` exported from `src/lib/auth.ts`.
- Service/repository separation: business logic lives in `src/server/services/*` and DB access in `src/server/repositories/*`. Prefer adding new DB queries in a repository and call from services.
- Messaging: RabbitMQ interactions go through `src/server/rabbitMq/broker.ts` and `amqplib` is the library used.
- Files and uploads: S3 is used (see AWS_* constants in `src/server/configs/config.ts`); signed URLs and size limits are enforced in server config.

Quick examples (what to change and where)
- Add a DB-backed API: add a repository in `src/server/repositories`, expose a service in `src/server/services`, and call it from a Next.js server route under `src/app/api` or from a server action.
- Add an authenticated page: add route under `src/app/(admin)` and rely on middleware (`src/middleware.ts`) to protect it; access user via NextAuth session in server components.
- Add migrations: put SQL migration files in `drizzle/` and run `npm run db:migrate`.

Important conventions for changes and new endpoints
- Prefer server "actions" under `src/actions/*` for server-side data access — do NOT create new Next.js API routes for CRUD logic. Frontend components use TanStack Query to call these actions (see [src/app/(admin)/masters-config/page.tsx](src/app/(admin)/masters-config/page.tsx) which prefetches with a `QueryClient` and `dehydrate`).
- For UI data flows follow this pattern: create an async action in `src/actions/*` that talks to `src/db`/Drizzle, then call it from client components using `useQuery`/`useMutation` from `@tanstack/react-query` and prefetch in server components when needed.
- Example: `getMastersDataAction` is implemented in `src/actions/masters-actions.ts` and consumed by `src/app/(admin)/masters-config/page.tsx` and `MastersClient` using `useQuery`.

Notes for the AI agent
- Prefer small, focused changes: edit repository code in `src/server/*` for server work and `src/app/*` for UI.
- Honor env-based configuration — do not hardcode secrets; use `process.env` constants specified in `src/server/configs/config.ts`.
- Keep imports consistent with existing aliases (project uses `@/` root alias).
- Avoid changing package.json versions; new dependencies must be minimal and justified.

If you need more detail about any area (auth flows, RabbitMQ, DB schema), say which file or behaviour you want clarified and I'll open the relevant files.
