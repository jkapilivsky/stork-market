# Stork Market Production Launch PRD

**Status:** Planned; implementation not started  
**Version:** 1.0  
**Last updated:** August 5, 2026  
**Detailed backend specification:** [Supabase Implementation PRD](./SUPABASE_IMPLEMENTATION_PRD.md)  
**Current implementation summary:** [Project context](../../context.md)

## 1. Executive summary

Stork Market already has a working local, mobile-first proof of concept. The remaining product work is to turn it into a live shared family event that multiple people can access from their phones.

Production will preserve the current focused experience: one expanded prediction market at a time, a compact switcher between independent markets, one shared play-credit wallet, market-specific trends and receipts, family annotations, and the weekly baby-size milestone.

The production launch adds:

- Online hosting on the planned Vercel/Next.js stack
- Supabase persistence, authentication, permissions, and live updates
- Stable guest identities and event membership
- Shared, server-authoritative markets and credit wallets
- Safe concurrent prediction placement
- Organizer controls for annotations, locking, facts, resolution, cancellation, and adjustments
- One-time settlement and a final leaderboard
- Monitoring, backups, security checks, and a multi-device rehearsal

This PRD contains only upcoming work. Completed proof-of-concept requirements are summarized in `context.md` and are not repeated as backlog items.

## 2. Launch objective

A family member should be able to open the event on a phone, join in under one minute, receive play credits once, place a prediction in any open market, review a timestamped receipt and estimated winnings, and later see the confirmed result and final payout.

The organizer should be able to publish approved context, lock markets, record parent-approved facts, preview the outcome, resolve each market, and settle every wallet without manually calculating credits.

## 3. Existing baseline, not launch scope

The following is already implemented locally and should be preserved rather than rebuilt as a new product concept:

- Warm, mobile-responsive event styling
- No intentional horizontal page scrolling
- Responsive layouts for narrow phones through wide desktops
- An 8-point visible spacing grid
- Focused Girl/Boy home page
- Compact market switcher with one expanded market at a time
- Dedicated birth-date, birth-weight, and birth-time routes
- Binary and arbitrary multi-outcome presentation
- One device-local wallet shared across all markets
- Local prediction placement, receipts, positions, and trend updates
- Estimated payout and profit previews
- Portfolio grouped by independent market
- Event annotations and a local organizer composer
- Date-driven baby-size milestone
- Accessible trend-table alternative, focus states, and reduced-motion support

Production implementation may refactor these components to connect authoritative data, but it must not regress their current UX behavior.

## 4. Scope

### 4.1 Included

- One production family event for Baby K
- Four independent markets: Gender, Birth date, Birth weight, and Birth time
- One shared play-credit wallet per event member
- Public or invite-controlled event viewing, based on the final access decision
- Authenticated prediction placement
- Persistent receipts, positions, trends, annotations, and results
- Real-time synchronization between connected devices
- Organizer authentication and role enforcement
- Organizer-editable event dates and approved content
- Server-enforced market opening and locking
- Canonical facts and machine-readable market resolution
- Idempotent settlement, cancellation refunds, adjustments, and leaderboard
- Vercel production deployment and domain configuration
- Staging, monitoring, backup verification, and rehearsal

### 4.2 Excluded

- Real-money wagers, deposits, withdrawals, cash prizes, or payment processing
- Cryptocurrency or blockchain
- Buying, selling, or transferring positions
- An order book or automated trading interface
- A public directory of unrelated family events
- A parlay or combined multi-market ticket
- Medical predictions or conclusions based on annotations
- Uploading or storing medical records
- Native mobile applications
- Notifications, comments, reactions, or shareable cards unless separately approved
- A generic no-code organizer market builder for launch

## 5. Planned production architecture

- **Application:** Standard Next.js App Router
- **Hosting:** Vercel
- **Database:** Supabase Postgres
- **Authentication:** Supabase Auth
- **Authorization:** Postgres Row Level Security
- **Live synchronization:** Supabase Realtime
- **Business transactions:** Versioned Postgres RPC functions reached through trusted server operations
- **Environments:** Local, preview/staging, and production

The current repository is still a Vinext/Vite application with Cloudflare Worker and OpenAI Sites configuration. Migrating it to standard Next.js/Vercel is upcoming work. Supabase remains the planned backend even if the frontend-hosting choice is deliberately revisited.

The complete schema and transaction contract is defined in the [Supabase Implementation PRD](./SUPABASE_IMPLEMENTATION_PRD.md).

## 6. Product rules that carry into production

### 6.1 Credits

- Credits are play money with no cash value.
- Each event member receives one configured starting grant.
- The launch default is 1,000 credits.
- The launch default minimum prediction is 25 credits.
- One wallet is shared across every market in the event.
- A prediction debits the wallet when accepted.
- Credits cannot be bought, withdrawn, transferred, or redeemed.
- Every grant, debit, payout, refund, and adjustment has an immutable ledger entry.

### 6.2 Market structure

- Each market is one independent question.
- A market has two or more mutually exclusive outcomes.
- Every current market resolves to exactly one winning outcome.
- Each market owns its own odds, trend, rules, lock, resolution, positions, and receipts.
- The home page shows only the full Gender market.
- Guests use the current compact switcher to navigate between focused markets.
- The product does not present a combined ticket or stacked market directory at launch.

### 6.3 Predictions

- A prediction selects one outcome and commits an integer number of credits.
- A successful prediction produces an immutable timestamped receipt.
- The receipt stores market, outcome, credits, entry probability, entry-time payout estimate, entry-time profit estimate, pricing model, and server timestamp.
- The portfolio keeps positions and receipts grouped by market.
- Estimated winnings are explicitly labeled as play-credit estimates.
- The browser is never authoritative for acceptance, balance, odds, payout, or result.
- A retried or double-tapped request creates at most one prediction and one debit.

### 6.4 Event annotations

- Only organizers can publish production annotations.
- Appointment or family updates require parent approval before publication.
- Annotations are context and conversation, not medical evidence.
- Annotations never resolve a market automatically.
- All annotation changes are audited.

### 6.5 Baby-size milestone

- The event stores an organizer-configurable due date.
- The UI derives the estimated gestational week from the due date and current calendar date.
- The fruit or vegetable comparison advances automatically.
- The comparison is playful context, not a medical measurement.

## 7. Launch market contracts

Production records must preserve these current market identities, outcomes, and resolution rules. Labels may receive copy edits, but machine-readable boundaries cannot change after the first accepted prediction.

### 7.1 Gender

**Question:** What will the parents reveal?

**Outcomes:**

- Girl
- Boy

**Current lock:** October 10, 2026 at 1:00 PM Central Time  
**Resolution:** The parent-approved result announced by the organizer at the gender reveal.

### 7.2 Birth date

**Question:** When will Baby K arrive?

**Placeholder due date:** February 3, 2027

**Outcomes:**

1. January 26 or earlier
2. January 27 through February 2
3. February 3
4. February 4 through February 10
5. February 11 or later

Rules:

- Date endpoints are inclusive.
- The first and last outcomes are open-ended so every possible date is covered.
- Interpret the confirmed calendar date in `America/Chicago`.
- Labor onset, admission, induction scheduling, announcement time, and discharge do not control the result.
- Use the parent-approved local birth date.

**Current lock:** January 16, 2027 at 11:59 PM Central Time.

### 7.3 Birth weight

**Question:** What will Baby K weigh at birth?

**Outcomes:**

1. Under 7 lb
2. 7 lb through 7 lb 15 oz
3. 8 lb through 8 lb 15 oz
4. 9 lb or more

Rules:

- Use the birth weight recorded at delivery and approved for sharing by the parents.
- A printed boundary belongs to the range that prints it; 8 lb exactly belongs to the third outcome.
- If the family does not share the weight, the market remains pending until the cancellation policy is applied.

**Current lock:** January 16, 2027 at 11:59 PM Central Time.

### 7.4 Birth time

**Question:** What time of day will Baby K arrive?

**Outcomes:**

1. Overnight — 12:00 AM through 5:59 AM
2. Morning — 6:00 AM through 11:59 AM
3. Afternoon — 12:00 PM through 5:59 PM
4. Evening — 6:00 PM through 11:59 PM

Rules:

- Interpret the parent-approved recorded time in `America/Chicago`.
- The four windows are mutually exclusive and cover all 24 hours.
- If the family shares only the date, the market remains pending until the cancellation policy is applied.

**Current lock:** January 16, 2027 at 11:59 PM Central Time.

## 8. Users and permissions

### 8.1 Viewer

A viewer may read event details, viewable markets, public forecasts, trends, rules, published annotations, and public results according to the event visibility policy.

A viewer cannot place predictions or access private portfolio information.

### 8.2 Guest predictor

An authenticated active event member may:

- Receive the starting credit grant once
- Place predictions in open markets
- Read their own wallet, ledger, positions, receipts, current estimates, and payouts
- Read event content allowed by visibility rules

A guest cannot:

- Edit or delete an accepted prediction
- Change balances or market aggregates directly
- Read another guest’s private activity
- Publish annotations
- Lock, resolve, cancel, settle, or adjust a market

### 8.3 Organizer

A verified organizer may:

- Configure event details and due date
- Create and publish approved annotations
- Review participants and suspend prediction access
- Publish and lock markets
- Record canonical facts
- Preview the winning outcome
- Confirm resolution and settlement
- Cancel and refund a market under the published policy
- Make a documented credit adjustment
- Review audit and reconciliation results

Organizer privileges are scoped to explicitly assigned events.

## 9. Upcoming user journeys

### 9.1 Join from a phone

1. A viewer opens the production event URL.
2. They sign in using the selected guest identity method.
3. They enter an invitation code if required and choose a display name.
4. The server creates or restores one event membership.
5. A new member receives exactly one 1,000-credit grant.
6. The focused Gender market loads with the authoritative wallet and forecast.

### 9.2 Place a prediction

1. The guest selects an outcome and credit amount.
2. The ticket requests an authoritative quote/estimate.
3. The guest confirms once.
4. One atomic database operation validates the guest, market, lock, outcome, amount, balance, and idempotency key.
5. The wallet, ledger, prediction, position, market state, and trend snapshot commit together.
6. The UI displays the returned timestamped receipt.
7. Connected devices refetch the updated market.

### 9.3 Return on another device

1. The guest signs in using the same recoverable identity.
2. Supabase restores the same event membership.
3. The UI loads their current wallet, market positions, receipts, and estimates from the database.

### 9.4 Publish an event annotation

1. An organizer signs in.
2. They create or edit parent-approved context.
3. They preview and publish it.
4. The system records an audit entry.
5. Connected guests see the annotation after an authoritative refetch.

### 9.5 Resolve and settle a market

1. The market is locked manually or by its server-enforced deadline.
2. The organizer records the parent-approved result or canonical fact.
3. The system previews exactly one matching outcome.
4. The organizer explicitly confirms resolution.
5. One idempotent operation records the result, allocates payouts or refunds, updates balances, and completes settlement.
6. Guests see their final result and the event leaderboard.

## 10. Functional requirements

### 10.1 Production foundation

- **FND-01:** The application must be reachable from a stable production URL on current mobile and desktop browsers.
- **FND-02:** Preview/staging and production must use separate configuration and data.
- **FND-03:** The production application must not use browser storage as accepted transaction state.
- **FND-04:** Refreshing or switching devices must restore database state.
- **FND-05:** Secrets must exist only in managed server configuration.

### 10.2 Identity and membership

- **ID-01:** Every predictor has a stable Supabase Auth user ID.
- **ID-02:** Every predictor has one membership per event.
- **ID-03:** Joining grants starting credits exactly once.
- **ID-04:** A guest identity should be recoverable across devices if the selected auth method supports it.
- **ID-05:** Organizer identity uses a verified sign-in method.
- **ID-06:** Invitation and anonymous-creation paths are rate-limited and abuse-protected.

### 10.3 Shared wallet and predictions

- **PRD-01:** One event wallet funds every market.
- **PRD-02:** Server/database time controls opening and locking.
- **PRD-03:** The server rejects invalid outcomes, amounts below the minimum, and amounts above the available balance.
- **PRD-04:** Acceptance, wallet debit, ledger entry, prediction, position, aggregate update, and trend snapshot are atomic.
- **PRD-05:** Idempotent retries create no duplicate prediction or debit.
- **PRD-06:** Concurrent requests cannot create negative balances or inaccurate aggregates.
- **PRD-07:** Accepted predictions cannot be edited or deleted.
- **PRD-08:** The receipt and portfolio show server-generated timestamps and estimates.

### 10.4 Forecasts and trends

- **TRD-01:** Every market displays all configured outcomes and probabilities totaling 100% after deterministic rounding.
- **TRD-02:** Every accepted prediction creates one complete immutable market snapshot.
- **TRD-03:** The chart loads persisted history rather than demo seed history after launch.
- **TRD-04:** Live updates do not overwrite or reorder historical points.
- **TRD-05:** The accessible table equivalent remains available.
- **TRD-06:** Reconnecting clients refetch authoritative history.

### 10.5 Portfolio

- **POR-01:** The portfolio shows one shared wallet and total committed credits.
- **POR-02:** Positions and receipts remain separated by market and outcome.
- **POR-03:** Each receipt shows placement time, credits, entry conditions, estimated payout, estimated profit, status, and final payout when resolved.
- **POR-04:** Guests can access only their own private portfolio data.
- **POR-05:** A settled leaderboard exposes only fields allowed by the event privacy policy.

### 10.6 Organizer operations

- **ORG-01:** Only organizers can mutate event configuration or annotations.
- **ORG-02:** Only organizers can publish, lock, resolve, cancel, settle, or adjust.
- **ORG-03:** Consequential operations require explicit confirmation, idempotency, and audit history.
- **ORG-04:** Machine-readable date, weight, and time facts must map to exactly one outcome before resolution.
- **ORG-05:** Settlement and cancellation must be safe to retry and complete no more than once.
- **ORG-06:** Corrections append adjustment records rather than rewriting financial history.
- **ORG-07:** The organizer can run or inspect event reconciliation before and after settlement.

### 10.7 Realtime

- **RT-01:** Accepted market changes should appear on connected devices within two seconds under normal conditions.
- **RT-02:** Published annotations, locks, and results update without a manual page refresh.
- **RT-03:** Realtime does not expose private wallets, ledgers, invitations, source notes, or audit records.
- **RT-04:** A dropped connection recovers by refetching authoritative state.

## 11. Payout decision gate

The recommended launch model is pari-mutuel:

- Participants predict with play credits.
- The final participant pool is distributed proportionally among predictions on the winning outcome.
- Seed weights influence the displayed opening forecast but are not paid out.
- Estimates move until the market locks.
- If nobody predicted the winner, all market predictions are refunded.
- A canceled market refunds every committed credit from that market.

This recommendation requires explicit approval before the production placement and settlement functions are finalized. Fixed-share or automated-market-maker pricing is not launch scope unless it receives a replacement specification and test plan.

## 12. Security, privacy, and fairness

- Enable Row Level Security on every exposed Supabase table or view.
- Use trusted database functions for all financial or organizer mutations.
- Never expose a Supabase service-role key to a browser.
- Hash invitation codes and rate-limit verification.
- Collect the minimum identity data needed for participation and recovery.
- Keep private source details out of public reads, Realtime, analytics, and logs.
- Do not store medical documents.
- Publish appointment details only with parent approval.
- Predetermine arrival-market locks to reduce selective-information advantages.
- Permit emergency organizer locking when private information could determine an outcome.
- Guests who know an undisclosed result must not place later predictions.
- Preserve audit history for every consequential organizer action.

## 13. Nonfunctional requirements

### 13.1 Mobile and responsive behavior

- Preserve the current no-horizontal-scroll behavior.
- Keep one prediction flow visible at a time.
- Maintain viewport-contained charts, labels, switcher, forms, and receipts.
- Keep touch targets at least 44 CSS pixels where practical.
- Preserve the 8-point margin and padding grid.
- Support portrait, landscape, split-screen, zoom, and dynamic text without clipping.

### 13.2 Accessibility

- Target WCAG 2.2 AA.
- Preserve keyboard access, visible focus, text-based states, reduced motion, and the trend table.
- Announce prediction pending, accepted, rejected, locked, and resolved states to assistive technology.
- Do not use color as the only outcome or status indicator.

### 13.3 Reliability

- Accepted writes are durable and atomic.
- Network retries are idempotent.
- Database reconciliation detects mismatched balances, aggregates, positions, snapshots, or settlement allocations.
- The production backup and restore path is verified before the real event.
- The app clearly distinguishes pending local UI from accepted server state.

### 13.4 Performance

- The focused market should become usable quickly on a typical mobile connection.
- Prediction submission shows immediate pending feedback.
- The expected family-sized trend and portfolio load without pagination complexity.
- Larger synthetic event data must still meet the launch response targets documented during implementation.

## 14. Migration and cutover

- Preserve current product routes and interaction structure where possible.
- Migrate from the Vinext/Cloudflare-specific runtime to standard Next.js/Vercel.
- Add Supabase browser/server clients and cookie-based authentication.
- Create all database objects through committed migrations.
- Seed reviewed production event configuration and opening market states.
- Do not import local browser predictions, credits, trends, or annotations by default.
- Replace local-storage reads/writes with Supabase read models and RPC responses.
- Remove or development-gate the local reset and annotation composer behavior.
- Run the current responsive/accessibility checks again after data integration.
- Rehearse with multiple real phones before switching to the production URL.

## 15. Delivery sequence

1. Approve the remaining product decisions.
2. Migrate the application to standard Next.js/Vercel.
3. Create local, staging, and production Supabase environments.
4. Implement migrations, Auth, memberships, invitations, and RLS.
5. Implement the one-time wallet grant and ledger.
6. Replace local market reads with Supabase data.
7. Implement atomic quote and prediction placement.
8. Connect receipts, positions, wallet, and trend history.
9. Add limited Realtime subscriptions and reconnect refetches.
10. Add organizer annotations, locking, facts, resolution, cancellation, adjustments, and audit UI.
11. Add settlement, final results, leaderboard, and reconciliation.
12. Complete security, concurrency, mobile, accessibility, backup, and multi-device rehearsal checks.
13. Configure the production domain and launch.

## 16. Production acceptance criteria

The production launch is ready when:

- A new participant can join from a phone in under one minute.
- The participant receives exactly one starting grant across refreshes and retries.
- The same recoverable identity can load the same wallet and history on another device.
- All four focused markets load from Supabase and preserve the existing UX.
- A prediction accepted on one phone updates the authoritative wallet, receipt, position, forecast, and trend.
- A second connected phone receives the market change without manual refresh.
- Double taps and network retries create one prediction and debit.
- Concurrent predictions cannot create negative balances or inconsistent market totals.
- A guest cannot access another guest’s private portfolio or perform an organizer action.
- Lock deadlines reject late predictions on the server.
- The organizer can publish an annotation and connected guests receive it.
- Each configured canonical fact maps to exactly one market outcome.
- The organizer can preview, confirm, and settle a result exactly once.
- Cancellations and no-winner cases refund according to the approved policy.
- Every wallet balance reconciles to its immutable ledger.
- The final leaderboard agrees with settled balances.
- The site remains usable without clipping or horizontal page scroll on tested phones and desktops.
- Production secrets are absent from browser code and logs.
- Backups, restore procedure, monitoring, and organizer runbook are verified.
- A rehearsal event completes successfully before the actual party.

## 17. Remaining decisions

The following decisions are still genuinely open:

1. Approve pari-mutuel payouts or specify a replacement.
2. Choose public viewing versus invite-only viewing.
3. Choose email magic link/OTP versus anonymous guest sessions.
4. Decide whether a guest may place multiple predictions in one market.
5. Decide whether a guest may predict more than one outcome in the same market.
6. Confirm whether entry estimates move until lock under the selected payout model.
7. Confirm the exact due date instead of the February 3 placeholder.
8. Confirm the arrival-market lock date and emergency-lock policy.
9. Approve cancellation rules when weight or time is not shared.
10. Confirm the organizer accounts, final event title, branding, domain, and privacy wording.

## 18. Dependencies

- Product approval of Section 17
- Standard Next.js/Vercel migration
- Supabase development, staging, and production configuration
- The [Supabase Implementation PRD](./SUPABASE_IMPLEMENTATION_PRD.md)
- Parent-approved event details, annotations, facts, and resolution copy
- A rehearsal window before October 10, 2026

