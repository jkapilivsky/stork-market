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

## Implemented Supabase backend

Applied August 5, 2026 to project `StorkMarket` (`gqarndebnclzfgnqyhud`,
`us-east-2`, Postgres 17). See [`supabase/README.md`](./supabase/README.md) for
the full contract.

- Versioned migrations for every table, enum, constraint, and index in the Supabase PRD
- `private` schema for invitation secrets, canonical facts, audit log, and the idempotency registry
- Row Level Security enabled on every exposed table, with zero insert/update/delete policies in `public`
- Append-only enforcement triggers on predictions, ledger entries, snapshots, resolutions, and allocations
- Authorization helpers `is_event_member`, `is_event_organizer`, `can_view_event`, `can_view_market`
- One-time starting grant and immutable credit ledger through `join_event`
- Atomic `place_prediction` with the market → membership → outcomes lock order and double idempotency check
- Pari-mutuel pricing with largest-remainder normalization asserted to total exactly 10000 bps
- Complete immutable market snapshots on open, every prediction, lock, resolve, and cancel
- Criterion validation proving outcomes are mutually exclusive and exhaustive before publication
- Organizer RPCs for publish, lock, annotations, canonical facts, resolution, settlement, cancellation, and adjustments
- Read models `get_event_bootstrap`, `get_market_detail`, `get_my_portfolio`, `get_leaderboard`, `quote_prediction`
- `reconcile_event` for wallet, outcome-aggregate, and settlement drift
- Realtime publication limited to markets, outcomes, snapshots, snapshot outcomes, annotations, and resolutions
- Seeded `baby-k` event with the four markets, opening seed weights, and first trend point
- Hashed organizer and family invitation codes

## Not implemented

- Frontend integration: the app still reads `app/market-config.ts` and `localStorage`
- `@supabase/ssr` browser/server clients, cookie session handling, and route protection
- Supabase Realtime subscriptions in the UI
- Organizer management UI (annotations, lock, facts, resolution all exist only as RPCs)
- Production hosting domain and Auth redirect URLs
- Custom SMTP provider, sign-in email template, and leaked-password protection
- Local Supabase stack and CI migration checks
- Monitoring, backup rehearsal, and multi-phone concurrency rehearsal
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

The database row is `events.slug = 'baby-k'` with `visibility = 'invite_only'` and `status = 'active'`.

## Guest access and identity

Two separate things control access, and they are easy to confuse:

1. **Identity** — Supabase Auth email magic link / OTP. Personal, one-time, and tied to the email address it was sent to. A magic link is a credential, not a share link. It must never be forwarded, screenshotted, or posted in a group chat: whoever opens it becomes that person.
2. **Access** — an invitation code passed to `join_event`. This is the shareable half. It is the same string for everyone who receives it, and it is what turns a signed-in stranger into an event member with a wallet.

What an organizer actually shares with family is the **site URL plus the guest invitation code**. Each guest then requests their own sign-in email.

Codes are stored only as `sha256(event_id || ':' || UPPER(code))` in `private.event_invitations`. There is no way to read a code back out — a lost code is replaced by minting a new row and revoking the old one. Two codes were minted on August 5, 2026: an organizer code capped at 3 uses and a family guest code capped at 60. The plaintext values live outside the repo.

`event_invitations.grants_role` is what makes an organizer. Organizer status never comes from user-editable auth metadata, so a guest cannot promote themselves. Presenting the organizer code while already a member upgrades the existing membership in place and does not re-grant credits.

Open items before invitations go out:

- Supabase's built-in email sender has a low project-wide hourly cap that can only be raised by configuring custom SMTP. A ~60-guest event will hit it. Configure a real SMTP provider first.
- Decide magic link versus 6-digit OTP code. They share one implementation and one email template; a template containing `{{ .Token }}` sends a code instead of a link. Codes survive the common family failure mode of reading email on a phone but browsing on a laptop, which silently breaks link-based flows.
- Add the production domain to Site URL and additional redirect URLs, or every link bounces.
- Set `shouldCreateUser` deliberately. Leaving it at the default means any email address that reaches the sign-in form gets an auth user, even without a valid invitation code.

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

- Next.js 16 App Router (`next` 16.2.6, `react` 19.2.6) with Tailwind v4 via PostCSS
- Vercel deployment pinned by `vercel.json`
- Supabase Postgres 17 backend, applied but not yet consumed by the UI
- No authentication requirement in the UI yet
- Device-local state in `localStorage`
- Canvas-based trend charts with HTML table equivalents
- Node.js 22.13 or newer

The database is live and authoritative by design, but the frontend has not been pointed at it. Do not treat the presence of the Supabase schema as evidence that the UI reads or writes production data.

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

The Supabase half of this target is implemented and verified. The frontend has not been connected to it yet.

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

## Resolved product decisions

Decided August 5, 2026 and encoded in the database:

1. **Payout model:** pari-mutuel. Winning pool splits pro-rata by committed credits; largest-remainder rounding conserves the pool; if nobody backs the winner, every prediction is refunded.
2. **Viewing:** invite-only. `anon` sees nothing without a membership.
3. **Identity:** email magic link / OTP, with an invitation code to join. Organizer role comes from a separate organizer invitation, never from user-editable metadata.
4. **Multiple predictions per market:** allowed. A guest may top up as often as they like.
5. **Multiple outcomes per market:** not allowed. `market_positions` is unique on `(membership, market)` and `place_prediction` rejects a switch with `OUTCOME_LOCKED_FOR_MEMBER`.
6. **Moving estimates:** yes. Under pari-mutuel the entry estimate is a snapshot, not a promise; the portfolio shows a separately calculated current estimate.

## Remaining product decisions

1. Confirm the exact due date (`events.due_date` currently holds the February 3, 2027 placeholder).
2. Confirm arrival-market lock and emergency-lock policies.
3. Approve cancellation/refund rules when birth weight or time is not shared. `cancel_and_refund_market` exists and refunds exact committed credits; the policy for *when* to call it is open.
4. Confirm organizers, final event name, branding, privacy wording, and domain.
5. Choose magic link versus 6-digit OTP code for the sign-in email. See “Guest access and identity.”

## Next implementation sequence

Steps 1–7 of the original sequence are done. What remains:

1. Pull the remote migration history into `supabase/migrations/` and generate `app/database.types.ts` (`npm run db:pull`, `npm run db:types`).
2. Add `@supabase/supabase-js` and `@supabase/ssr`, with separate browser and server clients and cookie-based sessions.
3. Add magic-link sign-in and the join-with-invitation-code flow.
4. Replace `app/market-store.tsx` reads with `get_event_bootstrap`, `get_market_detail`, and `get_my_portfolio`.
5. Replace local placement with `quote_prediction` + `place_prediction`, using a client-generated UUID idempotency key per confirmation.
6. Add Realtime subscriptions on the published tables with authoritative refetch on event and reconnect.
7. Build the organizer UI over the existing lock, annotation, canonical-fact, resolution, and cancellation RPCs.
8. Add final results and leaderboard surfaces.
9. Complete security, concurrency, responsive, accessibility, monitoring, backup, and restoration checks.
10. Run a multi-phone rehearsal before the real reveal.
11. Configure the production domain, Auth redirect URLs, and launch.

## Important files

- `supabase/README.md` — Live backend contract: schema map, RPC surface, invariants, criterion formats
- `supabase/config.toml` — Supabase CLI configuration linked to project `gqarndebnclzfgnqyhud`
- `.env.local.example` — Supabase URL, publishable key, and event slug
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
- `vercel.json` — Vercel framework preset and build command

## Development commands

- `npm run dev` — Start the local site
- `npm run build` — Validate the production build
- `npm test` — Build and run rendered route/documentation tests
- `npm run lint` — Run lint checks
- `npm run db:pull` — Fetch the remote Supabase migration history into `supabase/migrations/`
- `npm run db:push` — Apply new local migrations to the linked Supabase project
- `npm run db:types` — Regenerate `app/database.types.ts` from the live schema

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

