# Stork Market Supabase Implementation PRD

**Status:** Ready for technical review; implementation not started  
**Version:** 0.1  
**Last updated:** August 5, 2026  
**Parent documents:** [Production Launch PRD](./PRODUCTION_LAUNCH_PRD.md) and [Project context](../../context.md)  
**Scope:** Supabase data, authentication, authorization, transactions, real-time updates, resolution, settlement, and operational setup

## 1. Executive summary

Supabase will become the authoritative backend for the production version of Stork Market. It will store events, users, event memberships, markets, arbitrary market outcomes, prediction placements, shared play-credit balances, immutable credit history, market trends, event annotations, canonical results, and settlement records.

The backend must support the current four focused markets without creating a separate schema for each one:

1. Gender — Girl or Boy
2. Birth date — five mutually exclusive date windows
3. Birth weight — four mutually exclusive weight ranges
4. Birth time — four mutually exclusive time windows

The same model must support future markets with two or more mutually exclusive outcomes. The UI may call a placement a “prediction” or “vote”; both terms refer to the same accepted prediction record.

Every consequential operation must be enforced in Postgres, not trusted to browser state. In particular, placing a prediction must validate identity, membership, market status, lock time, outcome, minimum amount, available credits, and duplicate-request protection before atomically:

- Debiting the guest’s shared event wallet
- Appending a credit-ledger entry
- Recording the prediction and its entry estimate
- Updating that guest’s market position
- Updating the selected market’s aggregate state
- Recording a complete trend snapshot
- Returning an authoritative receipt and balance

If any step fails, none of those changes may commit.

This PRD assumes Supabase Postgres, Auth, Row Level Security, and Realtime. It does not authorize a deployment or make the current local prototype production-ready by itself.

## 2. Relationship to the current application

The current proof of concept uses Vinext/Vite, a Cloudflare-compatible runtime, and browser-local storage. It has no production database or authentication.

The active Production Launch PRD selects a standard Next.js App Router application on Vercel with Supabase. Migrating the existing frontend away from its Vinext/Cloudflare-specific deployment setup is therefore part of the upcoming launch work.

The database contract remains host-independent enough to survive a deliberate hosting change, but retaining the current Cloudflare-compatible frontend would require both active PRDs and `context.md` to be updated before implementation. File-layout recommendations in this document assume the selected Next.js/Vercel target.

## 3. Goals

- Replace device-local state with durable shared data.
- Give every participant one stable identity and one wallet per event.
- Grant starting credits exactly once.
- Support independent binary and multi-outcome markets from one schema.
- Keep balances, market calculations, placement receipts, and settlement authoritative on the server.
- Preserve an append-only history for predictions and credit changes.
- Prevent duplicate predictions caused by retries, double taps, or unstable mobile connections.
- Enforce lock times and organizer permissions in the database.
- Keep connected devices updated without making Realtime the source of truth.
- Resolve objective markets from parent-approved canonical facts.
- Settle or cancel a market exactly once and reconcile every credit.
- Support a future reusable product with multiple events without redesigning the backend.

## 4. Non-goals

- Real-money wagering, deposits, withdrawals, cash prizes, or payment processing
- Cryptocurrency or blockchain settlement
- An order book, contract resale, or user-to-user transfers
- Importing the current browser-local demo state into production
- Storing ultrasound images, medical records, or private clinical notes
- Supabase Storage in the first release
- A fully generic organizer market builder in the first release
- Supporting every possible pricing model at launch
- Treating Realtime messages as proof that a write succeeded
- Allowing browsers to mutate balances, aggregates, resolutions, or settlements directly

## 5. Confirmed backend decisions

- Credits are integers, have no cash value, and cannot leave an event.
- A user has one membership and one shared credit wallet per event.
- Every market has two or more configured outcomes.
- Every current market is categorical and resolves to exactly one winning outcome.
- Markets keep independent pricing, trend, position, lock, resolution, and settlement state.
- A prediction references exactly one market outcome.
- Accepted predictions are immutable.
- Credit-ledger entries are immutable.
- Corrections use new adjustment entries instead of editing history.
- All timestamps are stored as `timestamptz` in UTC unless a field is explicitly a local calendar value.
- The event stores an IANA timezone such as `America/Chicago` for date and time interpretation.
- Every mutation has a stable idempotency key.
- Server/database time controls locking; device time is never authoritative.
- Privileged Supabase keys never enter browser code.

## 6. Decisions required before financial-logic implementation

The schema and access controls can be built before these decisions, but the production placement and settlement functions must not be finalized until they are approved:

1. Final payout model
2. Whether a participant may place multiple predictions in one market
3. Whether a participant may predict more than one outcome in the same market
4. Whether viewing is public or invite-only
5. Whether guest identity uses email magic link/OTP or anonymous sessions
6. Final cancellation and refund rules
7. Maximum supported event size for the first release

### Recommended first-release payout rule

Use a pari-mutuel pool for the first production event. It is easier to audit than a market maker and works for any number of mutually exclusive outcomes.

- The displayed probability for outcome `o` is based on configured seed weight plus accepted credits on that outcome.
- Seed weights influence the starting forecast but are not participant credits and are not paid out.
- If outcome `o` wins, the complete participant-credit pool is divided among predictions on `o` in proportion to each winning prediction’s committed credits.
- Estimated winnings move as later predictions arrive and become final only when the market locks.
- If nobody predicted the winning outcome, all accepted predictions in that market are refunded.
- A canceled market refunds the exact committed credits for that market.
- Integer rounding must conserve the full participant pool. The settlement function first assigns floored pro-rata payouts, then distributes remaining credits by largest fractional remainder, with a stable tie-breaker.

For a new prediction of `s` credits on outcome `o`, the entry-time estimated payout if the market locked immediately is:

`s ÷ participant credits on o after placement × total participant credits in the market after placement`

The prediction receipt preserves that entry-time estimate. The portfolio shows a separately calculated current estimate for the participant’s aggregate position.

The current local fixed-share calculations are demo-only. They must not be migrated as authoritative balances or promises of production payout.

The database still records a `pricing_model` on every market so a later fixed-share or automated-market-maker implementation can be added behind separately reviewed quote, placement, and settlement functions. A published market may use only a pricing model enabled by the application release.

## 7. Target system architecture

### 7.1 Components

- **Application UI:** Standard Next.js App Router
- **Server boundary:** Next.js Server Actions/Route Handlers or equivalent trusted server endpoints
- **Authentication:** Supabase Auth
- **Database:** Supabase Postgres
- **Authorization:** Postgres Row Level Security plus database role checks
- **Transactional business logic:** Versioned Postgres functions exposed as narrowly scoped RPCs
- **Live updates:** Supabase Realtime Postgres Changes on a limited set of public/read-safe tables
- **Hosting:** Vercel, implemented through the Production Launch PRD

### 7.2 Read flow

1. The browser receives a Supabase-authenticated cookie session.
2. Server-rendered reads use the user’s Supabase session, not a service-role identity.
3. Public or member-scoped data is returned through RLS-protected tables, security-invoker views, or read RPCs.
4. The client subscribes only to approved live tables.
5. A live event causes the client to refetch the relevant authoritative read model.

### 7.3 Prediction-write flow

1. The UI creates one UUID idempotency key when the participant confirms.
2. The UI sends market ID, outcome ID, credits, and the idempotency key to a trusted server operation.
3. The server validates the input shape and authenticates the user.
4. The server invokes `place_prediction` with the user-scoped Supabase client so `auth.uid()` remains the caller’s real identity.
5. Postgres performs the complete transaction and returns a receipt.
6. The server returns that database response without recalculating financial values in JavaScript.
7. The UI replaces optimistic/pending state with the returned balance, position, receipt, and market version.

The service-role key must not be used for ordinary guest placement. Using it would bypass Row Level Security and weaken the database’s ability to prove which user was authorized.

## 8. Database conventions

- Use UUID primary keys generated by Postgres.
- Use `bigint` for all credit amounts and cached balances.
- Use `numeric`, never floating-point types, for payout units or fractional calculations.
- Store display probabilities as integer basis points from `0` through `10000` when practical.
- Store all server event times as `timestamptz`.
- Store facts such as the baby’s local birth date as their natural Postgres type plus the event timezone.
- Use `created_at` and `updated_at` consistently; financial history does not receive an `updated_at` because it is immutable.
- Use lowercase snake_case names.
- Use database enums or equivalent check constraints for closed status sets.
- Use `public` only for API-facing tables, views, and RPCs.
- Use a non-exposed `private` schema for invitation secrets, authorization helpers, reconciliation functions, and sensitive source notes.
- Add foreign keys for every relationship; do not rely on application code for referential integrity.
- Add explicit check constraints for non-negative balances, positive stakes, valid probability ranges, and legal lifecycle combinations.

## 9. Core data model

The following fields are requirements, not final migration syntax. Migration review may add operational fields without weakening the stated constraints.

### 9.1 `profiles`

One public application profile per Supabase Auth user.

Required fields:

- `id uuid primary key` referencing `auth.users(id)`
- `default_display_name text`
- `created_at timestamptz`
- `updated_at timestamptz`

Rules:

- Email stays in Supabase Auth and is not duplicated into the public profile unless a later feature requires it.
- A user may update their own non-privileged profile fields.
- Authorization roles are never read from user-editable profile metadata.

### 9.2 `events`

One family event and its shared-wallet configuration.

Required fields:

- `id uuid primary key`
- `slug text unique`
- `title text`
- `subtitle text nullable`
- `timezone text`
- `due_date date nullable`
- `reveal_at timestamptz nullable`
- `starting_credits bigint`
- `minimum_prediction bigint`
- `visibility event_visibility`
- `status event_status`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Initial enum values:

- `event_visibility`: `public`, `invite_only`
- `event_status`: `draft`, `active`, `completed`, `archived`

Constraints:

- `starting_credits > 0`
- `minimum_prediction > 0`
- `minimum_prediction <= starting_credits` for the first release
- `timezone` must be validated as a supported IANA timezone before publication

### 9.3 `event_invitations`

Invite credentials and limits. This table belongs in the `private` schema or otherwise receives no client-select policy.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `code_hash text`
- `label text nullable`
- `max_uses integer nullable`
- `use_count integer`
- `expires_at timestamptz nullable`
- `status invitation_status`
- `created_by uuid`
- `created_at timestamptz`

Rules:

- Never store a usable invitation code in plaintext.
- Increment use count in the same transaction that activates a new membership.
- Reusing an invitation to restore an existing membership does not grant credits again.
- Apply application-level rate limiting before code verification.

### 9.4 `event_memberships`

One user identity, role, and wallet per event.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `user_id uuid`
- `display_name text`
- `role membership_role`
- `status membership_status`
- `credit_balance bigint`
- `starting_grant_ledger_entry_id uuid nullable`
- `joined_at timestamptz`
- `updated_at timestamptz`

Initial enum values:

- `membership_role`: `guest`, `organizer`
- `membership_status`: `active`, `suspended`, `removed`

Constraints:

- Unique `(event_id, user_id)`
- `credit_balance >= 0`
- Exactly one starting grant may be linked to a membership
- Only trusted database functions may change `credit_balance`, `role`, or `status`

`credit_balance` is an authoritative transactionally maintained cache for fast reads. The append-only ledger is the audit source used to reconcile it.

### 9.5 `markets`

One standalone prediction question inside an event.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `slug text`
- `short_title text`
- `question text`
- `description text nullable`
- `market_kind market_kind`
- `pricing_model pricing_model`
- `resolution_kind resolution_kind`
- `resolution_fact_key text`
- `resolution_rules_public text`
- `resolution_config jsonb`
- `status market_status`
- `opens_at timestamptz`
- `locks_at timestamptz`
- `resolves_after timestamptz nullable`
- `display_order integer`
- `version bigint`
- `created_by uuid`
- `created_at timestamptz`
- `updated_at timestamptz`

Initial enum values:

- `market_kind`: `categorical`
- `pricing_model`: `pari_mutuel`, `fixed_share`, `amm`
- `resolution_kind`: `manual_outcome`, `text_fact`, `date_fact`, `integer_fact`, `time_fact`
- `market_status`: `draft`, `open`, `locked`, `resolving`, `resolved`, `canceled`

Constraints:

- Unique `(event_id, slug)`
- `locks_at > opens_at`
- `version >= 0`
- A market cannot open until it has at least two valid outcomes.
- Once the first prediction is accepted, question, pricing model, resolution kind, resolution configuration, outcome identities, outcome ordering, and outcome boundary rules are immutable.
- A resolved market has exactly one resolution and one winning outcome.
- A canceled market cannot also be resolved.

### 9.6 `market_outcomes`

One selectable result within a market.

Required fields:

- `id uuid primary key`
- `market_id uuid`
- `outcome_key text`
- `label text`
- `short_label text`
- `display_color text`
- `display_order integer`
- `criterion jsonb`
- `seed_weight bigint`
- `staked_credits bigint`
- `current_probability_bps integer`
- `created_at timestamptz`

Constraints:

- Unique `(market_id, outcome_key)`
- Unique `(market_id, display_order)`
- `seed_weight >= 0`
- `staked_credits >= 0`
- `current_probability_bps between 0 and 10000`
- An outcome cannot move to a different market.

The `criterion` is machine-readable and validated according to the market’s `resolution_kind`; UI labels are never parsed to determine a winner. Examples include an exact text value, inclusive date bounds, integer-ounce bounds, or minute-of-day bounds.

Before publication, a type-specific validation function must prove that the current categorical outcomes are mutually exclusive and exhaustive for the market’s declared domain. For example, the five date windows may not overlap or leave an unhandled date.

`staked_credits` is a transactionally maintained aggregate and must reconcile to accepted predictions for that outcome. It is not directly writable by a client.

### 9.7 `predictions`

The immutable record of every accepted vote/prediction placement.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `market_id uuid`
- `outcome_id uuid`
- `membership_id uuid`
- `credits_committed bigint`
- `entry_probability_bps integer`
- `payout_units numeric nullable`
- `estimated_payout_at_entry bigint`
- `estimated_profit_at_entry bigint`
- `pricing_model pricing_model`
- `market_version bigint`
- `idempotency_key uuid`
- `placed_at timestamptz`

Constraints:

- `credits_committed > 0`
- `entry_probability_bps between 0 and 10000`
- Unique `(membership_id, idempotency_key)`
- The membership and market belong to `event_id`.
- The outcome belongs to `market_id`.
- Accepted rows cannot be updated or deleted through the application.

The entry estimate is historical context, not a guarantee when the selected model has moving payouts. Final payout is read from settlement allocations/ledger entries.

### 9.8 `market_positions`

A transactionally maintained read model for fast personal portfolio display.

Required fields:

- `membership_id uuid`
- `market_id uuid`
- `outcome_id uuid`
- `credits_committed bigint`
- `payout_units numeric nullable`
- `prediction_count integer`
- `last_prediction_at timestamptz`
- `updated_at timestamptz`

Constraints:

- Primary key `(membership_id, market_id, outcome_id)`
- Aggregate values reconcile to immutable predictions.
- No direct client inserts, updates, or deletes.

The current estimated payout should be calculated by a read function using the current pool. It must not overwrite the entry estimate on historical predictions.

### 9.9 `credit_ledger_entries`

The append-only record of every wallet change.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `membership_id uuid`
- `entry_type ledger_entry_type`
- `amount_delta bigint`
- `balance_after bigint`
- `operation_key text`
- `prediction_id uuid nullable`
- `settlement_id uuid nullable`
- `related_market_id uuid nullable`
- `reason text nullable`
- `created_by uuid nullable`
- `metadata jsonb`
- `created_at timestamptz`

Initial entry types:

- `starting_grant`
- `prediction_debit`
- `settlement_payout`
- `market_refund`
- `organizer_adjustment`

Constraints:

- Unique `operation_key`
- `amount_delta <> 0`
- `balance_after >= 0`
- Prediction debits are negative.
- Grants, payouts, and refunds are positive.
- A prediction has exactly one debit ledger entry.
- A settled winning prediction has no more than one payout allocation.
- Rows are immutable.

### 9.10 `market_snapshots`

One immutable trend point containing the complete market state after a meaningful event.

Required fields:

- `id uuid primary key`
- `market_id uuid`
- `sequence bigint`
- `source_type snapshot_source_type`
- `source_prediction_id uuid nullable`
- `market_version bigint`
- `participant_pool_credits bigint`
- `created_at timestamptz`

Constraints:

- Unique `(market_id, sequence)`
- Unique `source_prediction_id` when present
- `participant_pool_credits >= 0`
- Rows are immutable.

### 9.11 `market_snapshot_outcomes`

The normalized outcome values for every trend snapshot.

Required fields:

- `snapshot_id uuid`
- `outcome_id uuid`
- `staked_credits bigint`
- `probability_bps integer`

Constraints:

- Primary key `(snapshot_id, outcome_id)`
- Every configured outcome appears exactly once in each complete snapshot.
- Probabilities for a snapshot sum to exactly `10000` basis points.
- The outcome belongs to the snapshot’s market.

### 9.12 `event_annotations`

Parent-approved context for the event timeline.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `author_membership_id uuid`
- `category text`
- `title text`
- `body text`
- `source_label text nullable`
- `occurred_at timestamptz`
- `published_at timestamptz nullable`
- `status annotation_status`
- `created_at timestamptz`
- `updated_at timestamptz`

Initial statuses:

- `draft`
- `published`
- `unpublished`
- `removed`

Only published annotations are guest-readable. Every create, edit, publish, unpublish, or removal action must be written to the organizer audit log with before/after metadata. Annotations must never be used automatically as resolution evidence.

### 9.13 `canonical_event_facts`

Parent-approved facts used to resolve one or more markets.

Keep this table in the `private` schema and expose only a redacted public resolution read model. This prevents a policy or query mistake from returning `private_source_note`.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `fact_key text`
- `value jsonb`
- `effective_timezone text nullable`
- `public_summary text`
- `private_source_note text nullable`
- `confirmed_by uuid`
- `confirmed_at timestamptz`
- `created_at timestamptz`

Constraints:

- Unique `(event_id, fact_key)`
- The value validates against a fact-key-specific schema.
- Guest reads never expose `private_source_note`.
- Facts used by a completed settlement cannot be silently edited.

Initial fact keys:

- `revealed_gender`
- `birth_local_date`
- `birth_weight_ounces`
- `birth_local_time`

### 9.14 `market_resolutions`

The immutable market result.

Required fields:

- `id uuid primary key`
- `market_id uuid unique`
- `winning_outcome_id uuid`
- `canonical_fact_id uuid nullable`
- `resolution_note text`
- `idempotency_key uuid unique`
- `resolved_by uuid`
- `resolved_at timestamptz`

Constraints:

- Winning outcome belongs to the market.
- Canonical fact belongs to the same event.
- There is no direct client update or delete.

### 9.15 `market_settlements`

The one-time settlement control record.

Required fields:

- `id uuid primary key`
- `market_id uuid unique`
- `resolution_id uuid unique`
- `status settlement_status`
- `participant_pool_credits bigint`
- `winning_stake_credits bigint`
- `payout_credits bigint`
- `prediction_count integer`
- `winning_prediction_count integer`
- `idempotency_key uuid unique`
- `started_at timestamptz`
- `completed_at timestamptz nullable`
- `created_by uuid`

Initial statuses:

- `pending`
- `running`
- `completed`
- `failed`

For the expected family-sized event, resolution and settlement should complete within one database transaction. A database exception rolls back the resolution, payouts, balances, and final status together. If the product later exceeds the tested transaction size, a separately designed queued/batched settlement may replace this approach without changing the public product semantics.

### 9.16 `settlement_allocations`

The immutable payout calculation by winning prediction or refund source.

Required fields:

- `id uuid primary key`
- `settlement_id uuid`
- `prediction_id uuid`
- `membership_id uuid`
- `allocation_type allocation_type`
- `amount bigint`
- `ledger_entry_id uuid unique`
- `created_at timestamptz`

Constraints:

- Unique `(settlement_id, prediction_id, allocation_type)`
- `amount > 0`
- Every allocation has one matching ledger entry.
- Allocation sums equal the settlement’s `payout_credits`.

### 9.17 `organizer_audit_log`

An append-only record of consequential organizer activity.

Keep this table in the `private` schema and expose an organizer-only security-invoker read function or redacted view when the audit UI is implemented.

Required fields:

- `id uuid primary key`
- `event_id uuid`
- `actor_user_id uuid`
- `action text`
- `target_type text`
- `target_id uuid nullable`
- `request_id text nullable`
- `before_data jsonb nullable`
- `after_data jsonb nullable`
- `reason text nullable`
- `created_at timestamptz`

Audited actions include membership-role changes, suspensions, event configuration, market publication, lock, annotation changes, canonical facts, resolution, cancellation, settlement, and balance adjustments.

### 9.18 `idempotency_records`

A private registry for safe retry of mutating operations that do not already have a natural immutable receipt.

Required fields:

- `id uuid primary key`
- `actor_user_id uuid`
- `operation text`
- `idempotency_key uuid`
- `request_hash text`
- `resource_type text nullable`
- `resource_id uuid nullable`
- `response jsonb nullable`
- `created_at timestamptz`

Constraints:

- Unique `(actor_user_id, operation, idempotency_key)`
- The same key and operation may return the saved result only when `request_hash` matches.
- A different payload with the same key returns `IDEMPOTENCY_CONFLICT`.
- Client roles receive no direct read or mutation privileges.

Predictions, ledger entries, resolutions, and settlements retain their own unique operation keys as defense in depth. The general registry covers joins, annotations, locks, canonical facts, and other organizer mutations.

## 10. Probability and snapshot rules

### 10.1 Current forecast

For the recommended pari-mutuel first release:

`raw weight for outcome = seed_weight + accepted staked credits`

`raw probability = outcome raw weight ÷ total raw weight`

The system converts raw probabilities to basis points totaling exactly `10000` using the largest-remainder method. Remaining basis points are assigned by descending fractional remainder and then stable outcome display order. This avoids UI totals such as 99% or 101% and makes snapshots reproducible.

If all seed weights and participant stakes are zero, publication is invalid. At least one positive seed weight is required for the initial release.

### 10.2 Snapshot timing

Create a complete snapshot:

- When a market is first published/opened
- After every accepted prediction
- When an organizer locks a market, if status annotations are shown on the trend
- At resolution, if a final result marker is shown

A prediction and its resulting snapshot must share the same market version and transaction. Later calculations never rewrite prior snapshots.

## 11. Required database operations

All mutating operations below are versioned Postgres functions. Exposed functions accept only the minimum required inputs plus an idempotency key, derive the acting user from `auth.uid()`, validate authorization internally, and return stable result shapes and error codes.

### 11.1 `join_event`

Inputs:

- Event slug
- Invitation code when required
- Display name
- Idempotency key

Required behavior:

1. Require an authenticated Supabase user.
2. Lock the applicable invitation record when a code is required.
3. Return the existing membership when `(event_id, user_id)` already exists.
4. Otherwise validate the event and invitation, create the membership, and increment invitation use count.
5. Append exactly one `starting_grant` ledger entry.
6. Set `credit_balance` to the configured starting credits.
7. Return membership, role, event, and wallet.

A retry must return the original membership and must never grant credits again.

### 11.2 `quote_prediction`

Inputs:

- Market ID
- Outcome ID
- Credits

Returns:

- Current market version and status
- Current probability
- Estimated entry-time payout and profit
- Current wallet balance
- Estimate expiry or quote ID if required by the enabled pricing model

The quote is informative for pari-mutuel markets because later participation changes winnings. Fixed-share or AMM implementations require a bounded quote, slippage rule, and expiry before those models may be enabled.

### 11.3 `place_prediction`

Inputs:

- Market ID
- Outcome ID
- Integer credits
- Idempotency key
- Quote ID or expected version only when required by the pricing model

Required transaction order:

1. Require `auth.uid()` and validate basic input.
2. Lock the market row.
3. Check for a completed request with the same membership/idempotency key and return its original receipt when found; reject the key if its original market, outcome, or amount differs.
4. Lock the caller’s event-membership row.
5. Lock the market’s outcome rows in stable primary-key order.
6. Validate that the event is active and the membership is active.
7. Validate `status = open` and database `opens_at <= now() < locks_at`.
8. Validate that the outcome belongs to the market.
9. Validate the minimum prediction, configured per-user restrictions, and `credit_balance >= credits`.
10. Calculate the authoritative entry probability and estimate.
11. Insert the immutable prediction.
12. Decrement `event_memberships.credit_balance`.
13. Insert the unique `prediction_debit` ledger entry.
14. Update the selected outcome’s aggregate stake.
15. Upsert the participant’s selected outcome position.
16. Increment the market version.
17. Recalculate probabilities for every market outcome.
18. Insert a complete market snapshot and snapshot-outcome rows.
19. Return the authoritative receipt, balance, position, probabilities, and version.

All operations occur in one transaction. Any exception rolls everything back.

After acquiring the membership lock, the function must repeat the idempotency lookup. This handles two simultaneous requests by the same member even when the requests target different markets. If another transaction committed the same key, return the original result for identical inputs or `IDEMPOTENCY_CONFLICT` for different inputs.

The global lock order for market operations is market, membership rows in stable ID order, then outcome rows in stable ID order. Settlement and cancellation use the same order to prevent deadlocks with placements.

### 11.4 `publish_market`

Organizer-only behavior:

- Validate required copy, times, timezone, pricing model, and resolution source.
- Require at least two outcomes.
- Require positive total seed weight.
- Validate unique stable keys and ordering.
- Validate mutually exclusive, exhaustive criteria for the supported resolution kind.
- Create the initial complete snapshot.
- Change the market from `draft` to `open` or schedule it to open.
- Write the organizer audit log.

### 11.5 `lock_market`

Organizer-only behavior:

- Transition `open` to `locked` once.
- Be idempotent for an already locked market.
- Never reopen a market that has accepted predictions without a separately approved correction procedure.
- Write an audit entry.

Even if no manual lock call occurs, `place_prediction` must reject at `locks_at` using database time.

### 11.6 `publish_annotation` and `change_annotation_status`

Organizer-only behavior:

- Validate event ownership and allowed content lengths.
- Create or update the annotation.
- Write before/after audit metadata.
- Expose only the published row to guests.

### 11.7 `record_canonical_fact`

Organizer-only behavior:

- Validate the fact type and event timezone.
- Require a parent-approved public summary.
- Store sensitive source context only in the private field.
- Return a resolution preview listing the outcome selected for each dependent market.
- Reject a value mapping to zero or multiple outcomes.
- Write an audit entry.

Recording a fact does not silently resolve a market. Resolution requires a separate explicit confirmation.

### 11.8 `resolve_and_settle_market`

Organizer-only inputs:

- Market ID
- Winning outcome ID or canonical fact ID
- Public resolution note
- Idempotency key

Required transaction:

1. Lock the market row.
2. Return the existing completed result for an identical retry.
3. Require the market to be locked and not canceled.
4. Derive the winning outcome from the canonical fact where configured.
5. Validate that exactly one configured outcome wins.
6. Insert the immutable resolution.
7. Create the settlement control record.
8. Lock affected membership rows in stable ID order.
9. Calculate every winning allocation with the approved payout model.
10. Apply the deterministic integer-rounding rule.
11. Insert settlement allocations and matching credit-ledger entries.
12. Increment each winner’s cached balance.
13. Reconcile allocation totals to the participant pool.
14. Mark settlement completed and market resolved.
15. Write an audit entry.
16. Return the final market, allocations, personal results, and leaderboard inputs.

If no participant predicted the winning outcome under the recommended pari-mutuel policy, step 9 creates refunds for every accepted prediction instead.

A failure at any point rolls back the entire resolution and settlement.

### 11.9 `cancel_and_refund_market`

Organizer-only behavior:

- Require an allowed pre-resolution state and a mandatory reason.
- Lock the market and affected memberships in the standard order.
- Create one refund allocation and ledger entry per accepted prediction.
- Restore exact committed credits.
- Mark the market canceled.
- Be safe to retry and never refund the same prediction twice.
- Write an audit entry.

### 11.10 `adjust_member_credits`

Organizer-only behavior:

- Require a non-empty reason and idempotency key.
- Reject an adjustment that would make the balance negative.
- Append an `organizer_adjustment` ledger entry.
- Update the cached balance in the same transaction.
- Never alter a prediction, settlement, or prior ledger row.
- Write an audit entry.

### 11.11 Read functions/views

Provide stable, RLS-safe read models for:

- `get_event_bootstrap(event_slug)` — event, market switcher, current market states, published annotations, and authenticated membership summary
- `get_market_detail(market_id)` — outcomes, current forecast, rules, complete trend series, and lock/result state
- `get_my_portfolio(event_id)` — wallet, positions, timestamped prediction receipts, current estimates, and settled payouts
- `get_leaderboard(event_id)` — only public display names and permitted totals after the configured reveal policy
- `preview_market_resolution(market_id, canonical_fact_id)` — organizer only
- `reconcile_event(event_id)` — organizer/operations only

Security-invoker views are preferred when a view is exposed so underlying RLS policies still apply.

## 12. State machines

### 12.1 Event state

Allowed transitions:

- `draft → active`
- `active → completed`
- `completed → archived`

An archived event is read-only. Reopening is not included in the first release.

### 12.2 Market state

Allowed transitions:

- `draft → open`
- `open → locked`
- `open → canceled`
- `locked → resolving`
- `locked → canceled`
- `resolving → resolved`
- `resolving → locked` only through transaction rollback, never as a committed manual state

`resolved` and `canceled` are terminal in the first release.

The UI may display a market as locked immediately when local time passes the deadline, but only the database status and `locks_at` validation control acceptance.

## 13. Authentication and identity

### 13.1 Recommended launch choice

Use email magic link or email OTP for guests and organizers, plus an event invitation code when prediction access is restricted. This gives participants a recoverable, multi-device identity and reduces accidental duplicate accounts.

Supabase anonymous sign-in may be used for a lower-friction experiment, but it must be treated as a deliberate product choice because access can be lost with device/browser data and public anonymous creation requires stronger abuse protection.

Both identity methods map to `auth.users`, so the database model does not change.

### 13.2 Next.js session implementation

For the preferred standard Next.js path:

- Use `@supabase/supabase-js` and `@supabase/ssr`.
- Create separate browser and server Supabase clients.
- Store and refresh auth tokens with cookies.
- Use a Next.js proxy/middleware-equivalent only for token refresh and route coordination, not as the sole authorization layer.
- Verify identity on the server with `supabase.auth.getClaims()` before rendering protected information; do not use an unverified `getSession()` user object as the authorization decision.
- Let RLS and database functions enforce data authorization even after an application check passes.

### 13.3 User lifecycle

- Joining creates or restores one event membership.
- A changed display name does not change historical user identity.
- Suspending a membership blocks new predictions but preserves its receipts and ledger.
- Removing a public display name should anonymize guest-facing output while retaining the internal UUID and immutable accounting history.
- Deleting an Auth user must not cascade-delete accepted predictions or financial audit history; production foreign-key behavior must preserve/anonymize those records according to a reviewed retention policy.

## 14. Row Level Security design

Enable RLS on every table in an exposed schema before application integration. No exposed table should accidentally rely on the default absence of policies.

| Resource | Anonymous viewer | Active guest | Organizer | Direct mutation |
| --- | --- | --- | --- | --- |
| Public event fields | Read if event is public | Read joined event | Read managed event | Organizer RPC only |
| Published markets/outcomes | Read if event permits | Read joined event | Read managed event | Organizer RPC only |
| Snapshots/trend | Read if market is viewable | Read joined event | Read managed event | Prediction/system RPC only |
| Published annotations | Read if event is viewable | Read joined event | Read all event statuses | Organizer RPC only |
| Own membership/wallet | None | Read own row | Read event rows | Trusted RPC only |
| Predictions | None | Read own receipts | Read event receipts | `place_prediction` only |
| Positions | None | Read own positions | Read event positions | Trusted RPC only |
| Credit ledger | None | Read own entries | Read event entries | Trusted RPC only |
| Invitations | None | None | Limited admin operation | Trusted RPC only |
| Canonical private facts | None | Public result only | Read managed event | Organizer RPC only |
| Resolution/settlement public result | Event policy | Event policy | Read managed event | Settlement RPC only |
| Organizer audit log | None | None | Read managed event | Trusted RPC only |

Required helper predicates include:

- `private.is_event_member(event_id)`
- `private.is_event_organizer(event_id)`
- `private.can_view_event(event_id)`

If a helper or mutating RPC uses `security definer`, it must:

- Set an empty or tightly controlled `search_path`
- Schema-qualify every relation and function reference
- Validate `auth.uid()` and authorization internally
- Revoke default execute privileges from broad roles
- Grant execute only to the specific `authenticated` or service role that needs it

Most read functions should remain `security invoker`.

Do not use user-editable `raw_user_meta_data` for authorization. Organizer membership must come from protected database rows or trusted app metadata with a documented token-refresh limitation.

## 15. Realtime design

### 15.1 Published live tables

Add only the following read-safe tables to the Supabase Realtime publication initially:

- `markets` for status/version changes
- `market_outcomes` for current aggregate probabilities
- `market_snapshots`
- `market_snapshot_outcomes`
- `event_annotations`
- `market_resolutions` or a public resolution view

Do not publish:

- Invitation records
- Raw membership wallets
- Credit-ledger entries
- Private canonical-fact source details
- Organizer audit records
- All participants’ raw predictions

### 15.2 Client behavior

- Subscribe with event/market filters wherever supported.
- On a live event, invalidate/refetch the relevant authoritative query.
- After the caller places a prediction, use the RPC response immediately; do not wait for its own Realtime echo.
- On reconnect, refetch current market, wallet, and portfolio state.
- Treat duplicate or out-of-order events as normal by comparing market versions/snapshot sequences.
- Show a non-blocking reconnecting state; prediction submission still depends on the RPC response.

The first-release target is for accepted public market changes to appear on connected devices within two seconds under normal conditions.

## 16. Application integration plan

For a standard Next.js migration, use a structure similar to:

- `lib/supabase/client.ts` — browser client using publishable configuration
- `lib/supabase/server.ts` — cookie-aware server client
- `lib/supabase/proxy.ts` — token refresh support
- `lib/database.types.ts` — generated Supabase TypeScript types
- `app/actions/join-event.ts` — server action wrapping `join_event`
- `app/actions/place-prediction.ts` — server action wrapping `place_prediction`
- `app/actions/manage-market.ts` — organizer operations
- `app/data/markets.ts` — authoritative read helpers
- `supabase/migrations/` — ordered schema and function migrations
- `supabase/seed.sql` — deterministic local development seed
- `supabase/tests/` — SQL/RLS/business-invariant tests

Rules:

- Validate request shape in the application and repeat every consequential validation in Postgres.
- Return stable domain errors rather than raw database messages.
- Do not duplicate payout calculations in the browser.
- The browser may calculate an instant preview for responsiveness, but the UI must label it provisional and replace it with the server quote/receipt.
- Local storage may retain UI preferences or an unsubmitted ticket draft, but never authoritative balances, accepted predictions, market totals, or results.

## 17. Stable operation responses and errors

Mutating RPCs should return typed response objects with a `schema_version`, entity IDs, authoritative timestamps, and current market/wallet versions.

Initial domain error codes:

- `AUTH_REQUIRED`
- `EVENT_NOT_FOUND`
- `EVENT_NOT_JOINABLE`
- `INVITATION_INVALID`
- `INVITATION_EXPIRED`
- `MEMBERSHIP_REQUIRED`
- `MEMBERSHIP_INACTIVE`
- `ORGANIZER_REQUIRED`
- `MARKET_NOT_FOUND`
- `MARKET_NOT_OPEN`
- `MARKET_LOCKED`
- `OUTCOME_INVALID`
- `AMOUNT_NOT_INTEGER`
- `AMOUNT_BELOW_MINIMUM`
- `INSUFFICIENT_CREDITS`
- `IDEMPOTENCY_CONFLICT`
- `QUOTE_EXPIRED`
- `FACT_INVALID`
- `RESOLUTION_AMBIGUOUS`
- `ALREADY_RESOLVED`
- `ALREADY_CANCELED`
- `SETTLEMENT_RECONCILIATION_FAILED`
- `RATE_LIMITED`

The application maps these to friendly mobile UI copy and never shows raw SQL or secret data.

## 18. Indexing and performance

Required indexes include:

- Unique `profiles(id)`
- Unique `events(slug)`
- Unique `event_memberships(event_id, user_id)`
- `event_memberships(user_id, status)`
- Unique `markets(event_id, slug)`
- `markets(event_id, status, display_order)`
- Unique `market_outcomes(market_id, outcome_key)`
- `market_outcomes(market_id, display_order)`
- Unique `predictions(membership_id, idempotency_key)`
- `predictions(membership_id, placed_at desc)`
- `predictions(market_id, placed_at)`
- `predictions(outcome_id, placed_at)`
- Primary key/unique `market_positions(membership_id, market_id, outcome_id)`
- `market_positions(market_id, membership_id)`
- Unique `credit_ledger_entries(operation_key)`
- `credit_ledger_entries(membership_id, created_at desc)`
- Unique `market_snapshots(market_id, sequence)`
- `market_snapshots(market_id, created_at)`
- `event_annotations(event_id, status, published_at desc)`
- Unique `market_resolutions(market_id)`
- Unique `market_settlements(market_id)`

Columns used in RLS predicates must be indexed. Query plans must be reviewed against seeded family-sized and synthetic larger datasets before production.

## 19. Environment and secrets

### Browser-safe values

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`

These are expected in client code and are safe only because RLS and function privileges enforce access.

### Server-only values

- `SUPABASE_SERVICE_ROLE_KEY` only if a trusted operational job truly requires it
- Database connection or CLI credentials used by migrations/CI
- Invitation hashing secret if hashing occurs in the application tier

Rules:

- Never prefix server secrets with `NEXT_PUBLIC_`.
- Never log tokens, invitation codes, cookies, service keys, or database passwords.
- Ordinary authenticated requests must use the participant’s session, not the service role.
- Use separate development, preview/staging, and production Supabase projects or explicitly isolated branches.
- Configure Supabase Auth redirect URLs for local, Vercel preview, and production domains.
- Keep `.env.local` uncommitted and commit only a redacted `.env.example`.
- Rotate any key that is accidentally committed or emitted to client bundles.

## 20. Local development and migrations

### 20.1 Repository setup

When implementation begins:

1. Initialize the Supabase local development directory.
2. Commit `supabase/config.toml`, ordered migrations, deterministic seed data, and tests.
3. Keep all schema, policy, privilege, publication, and function changes in migrations.
4. Use the Dashboard for inspection, not as the only record of a production schema change.
5. Rebuild local state from zero regularly to prove reproducibility.
6. Generate TypeScript database types after schema changes and commit them with the migration.

### 20.2 Proposed migration sequence

1. Extensions, private schema, enums, and shared utility functions
2. Profiles, events, invitations, and memberships
3. Markets, outcomes, predictions, and positions
4. Ledger, snapshots, annotations, facts, resolutions, and settlements
5. Constraints, immutable-row protections, indexes, and updated-at triggers
6. RLS policies and authorization helpers
7. Join, quote, prediction, annotation, lock, resolution, settlement, cancellation, and adjustment RPCs
8. Security grants/revocations
9. Security-invoker read views/functions
10. Realtime publication configuration
11. Local development seed and automated SQL tests

### 20.3 Environment promotion

- Develop and reset against the local Supabase stack.
- Link the CLI to a non-production remote project first.
- Preview migration SQL before applying it.
- Run migration, RLS, transaction, and integration tests in staging.
- Apply the same committed migrations to production.
- Generate production types from the deployed schema as a verification step.
- Never repair production with an unrecorded Dashboard-only edit.

## 21. Seed data

Local development seed data should include:

- One event for Baby K in `America/Chicago`
- Placeholder due date February 3, 2027
- Reveal/lock time October 10, 2026 at 1:00 PM Central Time
- Starting wallet of 1,000 credits
- Minimum prediction of 25 credits
- Gender market with Girl and Boy
- Birth-date market with the five documented exhaustive windows
- Birth-weight market with four documented ranges
- Birth-time market with four six-hour windows
- Initial positive seed weights and an opening snapshot for every market
- Several published annotations that contain no medical or identifying information
- Test guest and organizer memberships created through supported local test setup

Do not seed real participant email addresses, private family details, or usable production invitation codes.

## 22. Migration from the local proof of concept

- Do not import `stork-market-multi-v2` browser storage into production by default.
- Treat local balances, predictions, trends, positions, and annotations as disposable demo data.
- Create the production event and opening market snapshots from reviewed seed/configuration data.
- Require every live participant to authenticate and join the production event.
- Grant the starting wallet through `join_event`, never by copying a local balance.
- Remove or feature-flag local reset controls in production.
- Remove local-storage fallback for accepted transactions; an offline placement must remain unsubmitted until connectivity returns.
- Keep a temporary development-only adapter only if it helps UI work, and make the active data source visually unmistakable to developers.

## 23. Reconciliation and observability

### 23.1 Required reconciliation checks

`reconcile_event` must report, without silently repairing:

- Each membership balance equals the sum of its ledger deltas.
- Every accepted prediction has exactly one matching debit.
- Every market/outcome aggregate equals the sum of its accepted predictions.
- Every position equals the sum of its member/market/outcome predictions.
- Every complete snapshot includes every outcome and totals `10000` basis points.
- Every completed settlement allocation has one ledger entry.
- Settlement allocation totals equal the documented payout/refund pool.
- A resolved market has one resolution and one completed settlement.
- No terminal market accepts a later prediction.

### 23.2 Logs and alerts

- Attach a request ID and idempotency key to mutation logs.
- Record domain error codes without recording secrets or private content.
- Monitor RPC failures, auth failures, Realtime health, and elevated prediction rejection rates.
- Alert on any reconciliation failure before a reveal or settlement.
- Record organizer actions in the audit table in addition to infrastructure logs.
- Verify the active Supabase backup retention and point-in-time-recovery plan before the live event.

## 24. Security and privacy requirements

- Use least-privilege database grants in addition to RLS.
- Do not grant direct table mutations for wallets, predictions, positions, aggregates, ledger, facts, resolutions, or settlements.
- Rate-limit join, quote, placement, and organizer mutation endpoints.
- Add CAPTCHA or equivalent abuse controls before exposing anonymous sign-up publicly.
- Validate UUIDs, integer amounts, text lengths, JSON structures, state transitions, and timestamps in Postgres.
- Escape or safely render annotation content; do not accept arbitrary HTML in the first release.
- Keep invitation verification timing and error copy from revealing whether a specific event/member exists.
- Keep private source notes out of public views, Realtime, analytics, and logs.
- Collect only the identity information needed to restore participation and administer the event.
- Document data retention and display-name anonymization before launch.
- Run the database linter/security advisor and address relevant findings before production.
- Confirm backups and rehearse restoration before the real event.

## 25. Test plan

### 25.1 Migration and schema tests

- A clean local database can apply every migration and seed from zero.
- All required foreign keys, uniqueness rules, checks, indexes, RLS settings, and grants exist.
- Published market rules cannot change after the first accepted prediction.
- Immutable financial rows reject update/delete attempts.

### 25.2 RLS tests

- Anonymous viewers see only public event data.
- Guests cannot read another guest’s wallet, predictions, positions, or ledger.
- A member of Event A cannot read private Event B data.
- Guests cannot directly insert or update any financial table.
- Guests cannot publish annotations, create facts, lock, resolve, settle, refund, or adjust.
- Organizers can act only inside events they organize.
- Service-role-only resources remain unavailable to authenticated users.
- Security-invoker views preserve underlying policies.

### 25.3 Wallet and prediction tests

- A membership receives its starting grant exactly once across retries.
- Minimum, integer, positive, and balance limits are enforced.
- A locked, resolved, canceled, suspended, or wrong-event request fails.
- An outcome from a different market fails.
- An accepted prediction creates the prediction, debit, position, aggregate update, snapshot, and receipt together.
- A forced failure rolls back every related write.
- Repeating an idempotency key returns the original result without a second debit.
- Reusing one key with different inputs returns `IDEMPOTENCY_CONFLICT`.
- Fifty concurrent placements cannot create a negative balance, duplicate sequence, or inaccurate pool.
- Settlement concurrent with placement cannot deadlock or accept after lock.

### 25.4 Multi-outcome and boundary tests

- Every configured market has at least two outcomes.
- Display probabilities total exactly `10000` basis points.
- Date boundaries cover every date once, including January 26, January 27, February 2, February 3, February 4, February 10, and February 11.
- Weight boundaries cover ounces immediately below, on, and above 7, 8, and 9 pounds.
- Time windows cover all 1,440 local minutes exactly once.
- Daylight-saving rules do not change a stored local delivery clock time’s intended window.
- A fact matching zero or multiple outcomes prevents resolution.

### 25.5 Settlement and refund tests

- Only a locked market can resolve.
- Only an organizer can resolve.
- One canonical fact maps to exactly one winner.
- Pro-rata integer payout plus remainder allocation equals the complete participant pool.
- Multiple predictions by one member settle correctly.
- Predictions by one member on opposing outcomes follow the approved rule.
- No-winner behavior refunds everyone exactly once.
- Cancellation refunds exact committed credits exactly once.
- A repeated settlement request returns the original completed result.
- A deliberately injected failure leaves no partial balances, allocations, or resolution.
- Reconciliation passes after prediction, settlement, cancellation, and adjustment scenarios.

### 25.6 Auth, application, and Realtime tests

- Expired sessions refresh or require sign-in without exposing protected data.
- The same identity can restore its portfolio on a second device when the chosen auth mode supports it.
- Realtime delivers market, snapshot, annotation, lock, and result changes without exposing private wallet data.
- A disconnected client refetches and becomes consistent after reconnecting.
- A slow or duplicated mobile submission creates one visible receipt.
- Error codes map to understandable UI states.

## 26. Delivery phases

### Phase 0 — Approvals and architecture

- Approve the payout and participation rules.
- Confirm the planned standard Next.js/Vercel migration sequence.
- Choose guest identity and event visibility.
- Confirm expected participant count and Supabase plan requirements.

### Phase 1 — Supabase foundation

- Create separate non-production and production projects.
- Initialize local Supabase development and migrations.
- Add core tables, constraints, indexes, types, and seed data.
- Add browser/server auth clients and session handling.

### Phase 2 — Identity and wallet

- Implement profile and membership reads.
- Implement invitations and `join_event`.
- Implement the one-time starting grant and wallet/ledger UI.
- Complete cross-user and cross-event RLS tests.

### Phase 3 — Shared market data

- Load events, markets, outcomes, annotations, and trends from Supabase.
- Implement read models for the focused market routes and switcher.
- Keep local storage only for unsubmitted UI state.

### Phase 4 — Atomic predictions

- Implement quote and placement RPCs.
- Connect the prediction ticket, receipt, portfolio, and shared wallet.
- Complete retry, rollback, idempotency, and concurrency tests.

### Phase 5 — Realtime

- Publish the limited live-table set.
- Add filtered subscriptions and authoritative refetch behavior.
- Test reconnects and multiple phones.

### Phase 6 — Organizer and resolution

- Implement organizer authentication and permissions.
- Implement annotation, lock, fact preview, resolution, settlement, cancellation, and adjustment operations.
- Add audit and reconciliation views.

### Phase 7 — Production hardening

- Configure environments, Auth redirects, rate limits, abuse controls, logging, backups, and monitoring.
- Run all automated tests and a multi-device rehearsal.
- Verify event copy, dates, timezones, outcomes, invitations, and organizers.
- Cut over from local data only after reconciliation and rollback plans are approved.

## 27. Production acceptance criteria

The Supabase implementation is ready when:

- A clean environment can be recreated entirely from committed migrations and seed data.
- A new authenticated participant can join and receive exactly 1,000 credits once.
- The same participant uses one wallet across all four markets.
- The schema supports Girl/Boy and arbitrary multi-outcome markets without market-specific columns.
- Two or more devices see the same current markets, trends, annotations, and results.
- Every accepted prediction atomically creates one debit, one immutable prediction, the correct position update, aggregate update, and complete snapshot.
- Retried or double-tapped submissions never duplicate a debit or prediction.
- Concurrent predictions cannot produce negative balances or inaccurate aggregates.
- A guest sees only their own wallet, positions, receipts, and ledger.
- A guest cannot directly mutate protected tables or perform organizer actions.
- Market deadlines reject predictions using database time.
- Machine-readable date, weight, and time criteria resolve to exactly one outcome.
- Resolution and settlement complete exactly once or roll back completely.
- Every payout, refund, grant, and adjustment reconciles to the ledger.
- Realtime exposes only approved public/read-safe changes and clients recover by refetching.
- Service-role and database secrets are absent from browser bundles and logs.
- Security, migration, RLS, concurrency, settlement, mobile-network, backup, and rehearsal checks pass.

## 28. Launch checklist

- [ ] Standard Next.js/Vercel target confirmed
- [ ] Payout and participation policies approved
- [ ] Auth mode and visibility approved
- [ ] Real event title, due date, reveal time, timezone, and lock policies confirmed
- [ ] Development, preview/staging, and production environments separated
- [ ] All schema changes represented by committed migrations
- [ ] Type generation current
- [ ] RLS enabled and tested on every exposed table/view
- [ ] Function execute privileges reviewed
- [ ] Service role absent from client code
- [ ] Invitation codes hashed and rate-limited
- [ ] All four markets and their exact outcome boundaries reviewed
- [ ] Starting credits and minimum prediction reviewed
- [ ] Realtime publication contains only approved tables
- [ ] Reconciliation passes on staging seed and rehearsal data
- [ ] Settlement and cancellation rehearsed with retries and injected failures
- [ ] Backup/PITR availability and restore procedure verified
- [ ] Mobile multi-device rehearsal completed
- [ ] Organizer resolution runbook available during the reveal

## 29. Official implementation references

- [Supabase server-side authentication for Next.js](https://supabase.com/docs/guides/auth/server-side/creating-a-client?framework=nextjs&queryGroups=framework)
- [Supabase anonymous sign-ins](https://supabase.com/docs/guides/auth/auth-anonymous)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase database functions](https://supabase.com/docs/guides/database/functions)
- [Supabase Realtime Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes)
- [Supabase local development and database migrations](https://supabase.com/docs/guides/local-development/database-migrations)
- [Supabase CLI workflows](https://supabase.com/docs/guides/local-development/cli-workflows)
- [Supabase database overview and backups](https://supabase.com/docs/guides/database/overview)
- [Supabase branching](https://supabase.com/docs/guides/deployment/branching)
