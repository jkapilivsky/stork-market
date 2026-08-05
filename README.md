# Stork Market

The Family Prediction Exchange — a Next.js App Router app deployed on Vercel.

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
- `npm test` — build, then run the rendered-HTML suite against `next start`
- `npm run lint` — ESLint

## Shape

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

There is no database yet — market state lives in `app/market-config.ts` and
per-visitor `localStorage`. Supabase is the intended backing store when
persistence is added.
