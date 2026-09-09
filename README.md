# Stork Market

Baby K’s guest voting, live TV dashboard, countdown reveal, and celebration — a Next.js App Router app on the existing Vercel architecture.

The event-day pivot lives on `feature/event-voting-reveal`. See [event setup and rehearsal instructions](docs/EVENT_DAY.md) for the guest flow, host passcode, shared storage, and Supabase migration.

## Prerequisites

- Node.js `>=22.13.0`

## Quick Start

```bash
npm install
npm run dev
```

## Commands

- `npm run dev` — start the local dev server
- `npm run build` — production build (`next build`)
- `npm start` — serve the production build
- `npm test` — build, then run model, rendered-HTML, and HTTP API tests
- `npm run test:browser` — guest, TV, and reveal browser checks (after building)
- `npm run lint` — ESLint

## Shape

- `/` and `/dashboard` — TV dashboard; `/vote` — guest book and voting; `/host` — host setup
- `/rehearsal` — replayable countdown and celebration with sample results; `/celebration` — final results and guest wishes after the real reveal
- `app/event/` — event-day UI and authoritative server state
- `app/api/` — guest, host, and QR endpoints
- `app/` — App Router pages, layouts, and client components
- `app/market-config.ts` — market definitions (slugs, outcomes, trend points)
- `app/market-store.tsx` — client-side prediction state, persisted to `localStorage`
- `app/globals.css` — global styles (Tailwind v4 via PostCSS)
- `tests/rendered-html.test.mjs` — boots `next start` and asserts on server-rendered HTML
- `docs/prds/` — product requirement docs

## Deployment

Deployed to Vercel from `main`. `vercel.json` pins the framework preset and
build command so the Next.js build output (`.next`) is what Vercel picks up.

## Data

The event-day experience uses shared SQLite in local development and a new,
private Supabase event store when hosted. Its additive migration is prepared
locally and has not yet been applied or deployed. See [EVENT_DAY.md](docs/EVENT_DAY.md).

### Legacy market backend

The Supabase backend is live and authoritative by design — schema, RLS, and all
transactional RPCs are applied. See [`supabase/README.md`](./supabase/README.md).

The **legacy market UI** has not been pointed at that backend yet: market state still comes from
`app/market-config.ts` and per-visitor `localStorage`. Connecting the two is the
next piece of work.
