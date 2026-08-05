# Project Context

## Purpose

Stork Market is a mobile-first, play-money family prediction website for Baby K’s gender reveal and arrival. Guests see one focused market at a time, switch between independent questions, use one shared credit wallet, watch each forecast change over time, review timestamped predictions and estimated winnings, follow parent-approved event annotations, and see a playful weekly baby-size milestone.

Credits have no cash value. The product does not include payments, deposits, withdrawals, participant-funded prizes, cryptocurrency, or real-money wagering.

## Sources of truth

- This file is the current-state handoff: what exists, what does not, and which decisions are active.
- [`app/market-config.ts`](./app/market-config.ts) is the source of truth for the local proof-of-concept event copy, market outcomes, lock labels, rules, and seeded trends.
- [`docs/prds/PRODUCTION_LAUNCH_PRD.md`](./docs/prds/PRODUCTION_LAUNCH_PRD.md) contains only the remaining product and launch backlog.
- [`docs/prds/SUPABASE_IMPLEMENTATION_PRD.md`](./docs/prds/SUPABASE_IMPLEMENTATION_PRD.md) contains the detailed upcoming Supabase contract.
- [`docs/prds/README.md`](./docs/prds/README.md) indexes active PRDs and records which completed/superseded PRDs were removed.

There are currently two active PRDs. Completed proof-of-concept PRDs have been removed from the active set.

## Confirmed product decisions

- Play money only; credits cannot be purchased, transferred, withdrawn, or redeemed.
- The default starting wallet is 1,000 credits.
- The minimum prediction is 25 credits.
- Gender is the featured home-page market.
- Additional questions remain independent markets, not fields in one ticket.
- The UI shows one expanded market and one prediction composer at a time.
- Guests move between markets with a compact responsive switcher.
- There is no visible All Markets directory in the current experience.
- Birth date is one five-outcome categorical market, not overlapping Yes/No markets.
- Birth weight and birth time are the other two arrival-related markets.
- Markets support two or more mutually exclusive outcomes.
- Every current market resolves to exactly one winning outcome.
- One event wallet funds all markets while each market keeps separate odds, trends, positions, rules, lock, and settlement state.
- Guests see current probabilities, entry estimates, estimated payout, and estimated profit.
- Every accepted prediction must retain a server timestamp and receipt in production.
- Family or appointment annotations are parent-approved context, never medical evidence or automatic resolution input.
- The weekly fruit/vegetable comparison is playful context, not a medical measurement.
- The production experience must remain mobile-first and work across dynamic viewport sizes.

## Implemented local proof of concept

- Warm family-event visual design
- Mobile-first responsive layout with no intentional horizontal page scrolling
- Content-aware layouts for narrow phones, landscape, tablets, split-screen, browser zoom, and wide desktops
- Visible margins and padding on an 8-point grid
- Focused Girl/Boy home page
- Compact two-column-on-phone market switcher
- Dedicated routes for birth date, birth weight, and birth time
- Binary and arbitrary multi-outcome selection UI
- One shared device-local 1,000-credit wallet
- Prediction presets and direct credit input
- Entry probability, estimated payout, and estimated profit previews
- Timestamped local receipts
- Market-specific positions and prediction histories
- Cross-market portfolio with positions kept separate by market
- Independent market pools and multi-series trends
- A new trend point only in the market receiving a prediction
- Prediction trend chart inside the primary forecast panel
- Accessible trend-table equivalent
- Event annotation timeline and device-local organizer composer
- Date-driven gestational progress and weekly fruit/vegetable comparison
- Local reset control
- Keyboard focus, text-based states, reduced-motion support, and accessible labels
- Redirect from the retired `/markets` directory to `/`

## Not implemented

- Standard Next.js/Vercel migration
- Production hosting, domain, or public URL
- Supabase project or local Supabase configuration
- Shared database or versioned Supabase migrations
- Multi-device synchronization
- Guest or organizer authentication
- Invitation codes or production membership
- Server-authoritative wallets, pricing, predictions, positions, or trends
- Atomic concurrent prediction placement
- Row Level Security policies
- Supabase Realtime subscriptions
- Organizer authorization and production management UI
- Server-enforced opening and locking
- Canonical event facts
- Production resolution, cancellation, refunds, settlement, or leaderboard
- Audit log, reconciliation, monitoring, or backup rehearsal
- Organizer-editable due date
- Final production event copy, organizers, branding, and domain

## Current event configuration

- **Event:** Baby K’s family forecast
- **Timezone:** `America/Chicago`
- **Reveal:** Saturday, October 10, 2026 at 1:00 PM Central Time
- **Placeholder due date:** February 3, 2027
- **Starting credits:** 1,000
- **Minimum prediction:** 25 credits

The exact due date has not been confirmed. The February 3, 2027 value is a labeled placeholder based on “the beginning of February.” On August 5, 2026, it produces a 14-week kiwi comparison. The browser recalculates gestational progress from its local calendar date and advances the milestone without a deployment.

## Current markets

### Gender

- Route: `/`
- Question: What will the parents reveal?
- Outcomes: Girl; Boy
- Locks: October 10, 2026 at 1:00 PM Central Time
- Resolves from the parent-approved result announced at the gender reveal

### Birth date

- Route: `/markets/birth-date`
- Question: When will Baby K arrive?
- Outcomes: January 26 or earlier; January 27–February 2; February 3; February 4–10; February 11 or later
- Windows are mutually exclusive, exhaustive, and inclusive of printed endpoints
- Calendar dates use `America/Chicago`
- Current lock: January 16, 2027 at 11:59 PM Central Time

### Birth weight

- Route: `/markets/birth-weight`
- Question: What will Baby K weigh at birth?
- Outcomes: Under 7 lb; 7 lb–7 lb 15 oz; 8 lb–8 lb 15 oz; 9 lb or more
- Uses parent-approved birth weight recorded at delivery
- Current lock: January 16, 2027 at 11:59 PM Central Time

### Birth time

- Route: `/markets/birth-time`
- Question: What time of day will Baby K arrive?
- Outcomes: Overnight 12:00–5:59 AM; Morning 6:00–11:59 AM; Afternoon 12:00–5:59 PM; Evening 6:00–11:59 PM
- Uses parent-approved local delivery time in `America/Chicago`
- Current lock: January 16, 2027 at 11:59 PM Central Time

Weight or time remains pending if the parents decline to share it; the final production cancellation deadline and refund policy are still open.

## Current technical architecture

- Next.js-compatible React App Router UI
- Vinext and Vite build pipeline
- Cloudflare Worker-compatible runtime
- OpenAI Sites hosting metadata in `.openai/hosting.json`
- No active D1 or R2 binding
- Empty `db/schema.ts`
- No authentication requirement
- Device-local state in `localStorage`
- Canvas-based trend charts with HTML table equivalents
- Node.js 22.13 or newer

The current application is not a conventional Vercel Next.js project. Do not treat the presence of Next-compatible components as evidence that the Vercel migration or Supabase integration has been completed.

## Local data and market math

Storage key:

- `stork-market-multi-v2`

The stored state contains the shared balance, outcome-keyed pools, positions, trends, receipts, and annotations for this device only. Resetting the demo restores seeded state.

The local prototype approximates fixed-share pricing by dividing a stake by the selected outcome’s current probability. Its seeded pools initially produce approximately:

- 54% Girl
- 37% February 4–10
- 39% 8 lb–8 lb 15 oz
- 30% Morning

This math is illustrative. Do not migrate local balances, predictions, trends, receipts, or payout promises into production. The Production Launch PRD recommends pari-mutuel play-credit settlement, subject to approval.

## Planned production architecture

The active target is:

- Standard Next.js App Router
- Vercel hosting and preview deployments
- Supabase Postgres
- Supabase Auth
- Postgres Row Level Security
- Supabase Realtime
- Versioned Postgres RPC functions for financial and organizer mutations
- One atomic database transaction per accepted prediction

Supabase is the selected backend planning direction. The frontend migration and all production infrastructure remain unimplemented. If the team deliberately retains the current Cloudflare-compatible frontend, the Supabase database contract remains applicable, but that would require an explicit architecture update to the Production Launch PRD.

## Production invariants

- The database, never the browser, is authoritative for accepted predictions, balances, odds, positions, payouts, and results.
- Each event member receives the starting grant exactly once.
- Every credit change has an immutable ledger entry.
- Accepted predictions and ledger entries are append-only.
- Corrections create new adjustment records rather than rewriting history.
- Prediction placement validates identity, membership, event state, market state, database lock time, outcome, minimum amount, balance, and idempotency.
- Wallet debit, ledger entry, prediction, position, aggregate update, and complete trend snapshot commit atomically.
- Locked, resolved, canceled, or not-yet-open markets reject predictions server-side.
- Every current categorical market resolves to exactly one configured outcome.
- Settlement and cancellation are idempotent and complete no more than once.
- Only authorized event organizers can publish annotations, lock, record facts, resolve, cancel, settle, or adjust.
- Exposed Supabase data uses Row Level Security.
- Privileged keys and private source details never enter browser code, public Realtime, analytics, or logs.
- Appointment details are published only with explicit parent approval.

## Remaining product decisions

Resolve these before production transaction work is finalized:

1. Approve the recommended pari-mutuel payout model or specify a replacement.
2. Choose public viewing versus invite-only viewing.
3. Choose email magic link/OTP versus anonymous guest sessions.
4. Decide whether guests may submit multiple predictions in one market.
5. Decide whether guests may predict more than one outcome in the same market.
6. Confirm whether estimates move until lock under the selected payout model.
7. Confirm the exact due date.
8. Confirm arrival-market lock and emergency-lock policies.
9. Approve cancellation/refund rules when birth weight or time is not shared.
10. Confirm organizers, final event name, branding, privacy wording, and domain.

## Next implementation sequence

1. Approve the remaining product decisions.
2. Migrate from Vinext/Cloudflare-specific deployment to standard Next.js/Vercel.
3. Create local, staging, and production Supabase environments.
4. Add versioned schema migrations, authentication, memberships, invitations, and Row Level Security.
5. Implement the one-time wallet grant and immutable credit ledger.
6. Replace local reads with authoritative events, markets, outcomes, trends, annotations, wallets, positions, and receipts.
7. Implement atomic quote and prediction RPCs.
8. Add limited Realtime subscriptions with authoritative refetch on events/reconnect.
9. Add organizer annotations, market locking, canonical facts, resolution, cancellation, adjustments, audit, and reconciliation.
10. Add idempotent settlement, final results, and leaderboard.
11. Complete security, concurrency, responsive, accessibility, monitoring, backup, and restoration checks.
12. Run a multi-phone rehearsal before the real reveal.
13. Configure the production domain and launch.

## Important files

- `app/page.tsx` — Focused Gender market plus event annotations
- `app/markets/page.tsx` — Redirect from the retired directory URL
- `app/markets/[slug]/MarketDetail.tsx` — Reusable focused market experience
- `app/portfolio/page.tsx` — Cross-market activity grouped by market
- `app/market-config.ts` — Current event, outcomes, rules, locks, and seeded trends
- `app/market-store.tsx` — Device-local wallet and multi-market runtime state
- `app/components/MarketSwitcher.tsx` — Responsive focused-market navigation
- `app/components/TrendChart.tsx` — Multi-series trend and accessible table
- `app/components/BabySizeCard.tsx` — Due-date-driven weekly milestone
- `app/components/SiteChrome.tsx` — Shared navigation and layout chrome
- `app/globals.css` — Responsive visual system
- `app/layout.tsx` — Metadata and root provider
- `tests/rendered-html.test.mjs` — Rendered route and documentation contract tests
- `docs/prds/README.md` — Active PRD index
- `docs/prds/PRODUCTION_LAUNCH_PRD.md` — Remaining launch backlog
- `docs/prds/SUPABASE_IMPLEMENTATION_PRD.md` — Detailed backend implementation contract
- `.openai/hosting.json` — Current Sites hosting metadata
- `vite.config.ts` and `worker/index.ts` — Current Cloudflare-compatible runtime
- `db/schema.ts` — Intentionally empty until a persistence path is implemented

## Development commands

- `npm run dev` — Start the local site
- `npm run build` — Validate the production build
- `npm test` — Build and run rendered route/documentation tests
- `npm run lint` — Run lint checks
- `npm run db:generate` — Generate Drizzle migrations only if a D1/Drizzle path is deliberately revived

## Working guidelines

- Preserve the existing warm family-event visual direction.
- Keep the primary flow understandable to guests unfamiliar with prediction markets.
- Keep one expanded market and one ticket visible at a time.
- Use plain-language labels alongside market terminology.
- Preserve the 8-point spacing grid and dynamic, viewport-contained layout.
- Keep play-money and context-only disclaimers visible.
- Do not add real-money features without a separate legal, product, and security review.
- Keep completed implementation history in this context file, not in active PRDs.
- Keep only genuinely upcoming work in `docs/prds/`.

