# Stork Market — Supabase backend

**Event-day pivot:** `migrations/20260907000000_event_party.sql` adds an isolated
private event store and two server-only RPCs. This new migration is local and
has **not** been applied remotely. Reconcile the existing remote history before
using `db:push`. See [event-day setup](../docs/EVENT_DAY.md). The legacy contract
below remains unchanged.

Authoritative backend for the production Stork Market event, implemented against
[`docs/prds/SUPABASE_IMPLEMENTATION_PRD.md`](../docs/prds/SUPABASE_IMPLEMENTATION_PRD.md).

- **Project:** `StorkMarket` (`gqarndebnclzfgnqyhud`), region `us-east-2`, Postgres 17
- **API URL:** `https://gqarndebnclzfgnqyhud.supabase.co`
- **Event slug:** `baby-k`
- **Payout model:** pari-mutuel
- **Identity:** email magic link / OTP, invite-only viewing
- **Prediction rule:** unlimited top-ups per market, but one outcome per member per market

## Getting the migrations locally

The schema was applied through the Supabase management API, so the migration
history lives in the remote project. Pull it into `supabase/migrations/` once:

```bash
npx supabase login
npx supabase link --project-ref gqarndebnclzfgnqyhud
npm run db:pull      # writes supabase/migrations/*.sql
npm run db:types     # regenerates app/database.types.ts
```

From then on, `npm run db:push` applies new local migrations to the remote
project, and `npx supabase start` runs the whole stack locally.

## Schema map

| Table | Purpose |
| --- | --- |
| `public.profiles` | One app profile per auth user (auto-created on signup) |
| `public.events` | Event config: timezone, due date, reveal, starting credits, minimum |
| `public.event_memberships` | One identity + wallet per user per event; `role` is `guest` or `organizer` |
| `public.markets` | One prediction question; carries `status`, `version`, `opens_at`, `locks_at` |
| `public.market_outcomes` | Selectable results; `criterion` is machine-readable, labels are never parsed |
| `public.predictions` | Immutable accepted placements |
| `public.market_positions` | Per-member read model; unique on `(membership, market)` |
| `public.credit_ledger_entries` | Append-only record of every credit change |
| `public.market_snapshots` / `..._outcomes` | Complete immutable trend points; probabilities sum to exactly 10000 bps |
| `public.event_annotations` | Parent-approved timeline context; guests see `published` only |
| `public.market_resolutions` / `market_settlements` / `settlement_allocations` | One-time result and payout records |
| `private.event_invitations` | Hashed invite codes; `grants_role` bootstraps organizers |
| `private.canonical_event_facts` | Parent-approved facts; `private_source_note` never reaches a guest |
| `private.organizer_audit_log` | Append-only organizer activity |
| `private.idempotency_records` | Retry registry for mutations without a natural receipt |

The `private` schema is not in the PostgREST exposed schemas and `anon` /
`authenticated` hold no table privileges on it.

## RPC surface

Mutations (all `security definer`, all derive the actor from `auth.uid()`,
all validate authorization internally):

| Function | Caller | Notes |
| --- | --- | --- |
| `join_event(slug, display_name, code, key)` | authenticated | One membership, exactly one starting grant, never re-granted on retry |
| `place_prediction(market, outcome, credits, key)` | authenticated | The whole transaction described in PRD §11.3 |
| `publish_market(market, key)` | organizer | Validates criteria, normalizes probabilities, writes the opening snapshot |
| `lock_market(market, reason, key)` | organizer | Idempotent |
| `upsert_annotation(...)` / `change_annotation_status(...)` | organizer | Audited with before/after |
| `record_canonical_fact(...)` | organizer | Returns a resolution preview; never resolves anything |
| `resolve_and_settle_market(market, note, key, outcome?)` | organizer | Resolution + settlement in one transaction |
| `cancel_and_refund_market(market, reason, key)` | organizer | Exact refunds, safe to retry |
| `adjust_member_credits(membership, delta, reason, key)` | organizer | Appends an adjustment, never rewrites history |

Reads (all `security invoker`, so RLS decides what each caller sees):
`quote_prediction`, `get_event_bootstrap`, `get_market_detail`,
`get_my_portfolio`, `get_leaderboard`, `get_market_settlement_result`.
`reconcile_event` and `preview_market_resolution` are organizer-only.

## Invariants enforced in Postgres

- Predictions, ledger entries, snapshots, resolutions, and allocations reject
  `UPDATE` and `DELETE` at the trigger level.
- `place_prediction` locks market → membership → outcomes, in that order.
  Settlement and cancellation use the same order.
- Idempotency is checked before *and* after the membership lock.
- Probabilities are normalized by largest remainder and asserted to total 10000 bps.
- Settlement asserts that the distributed total equals the participant pool
  before committing; any mismatch rolls the whole thing back.
- Outcome criteria must be proven mutually exclusive and exhaustive before a
  market can be published.
- No table in `public` has an `INSERT`, `UPDATE`, or `DELETE` policy.

## Outcome criteria format

| `resolution_kind` | `criterion` shape | Domain |
| --- | --- | --- |
| `text_fact` | `{"value": "girl"}` | distinct values |
| `date_fact` | `{"from": "2027-01-27", "to": "2027-02-02"}` | open-ended (`null` bound) |
| `integer_fact` | `{"from": 112, "to": 127}` (ounces) | open-ended |
| `time_fact` | `{"from": 360, "to": 719}` (minute of day) | `resolution_config` pins 0–1439 |

Bounds are inclusive. `markets.resolution_config` may set `domain_min` /
`domain_max`; the publication check requires the windows to start and end
exactly on those bounds with no gaps or overlaps.

## Realtime

Published tables: `markets`, `market_outcomes`, `market_snapshots`,
`market_snapshot_outcomes`, `event_annotations`, `market_resolutions`.
Wallets, ledger entries, invitations, private facts, and audit records are
deliberately not published. Treat a Realtime event as a signal to refetch, never
as proof that a write succeeded.

## Operational notes

- Invitation codes are stored only as `sha256(event_id || ':' || UPPER(code))`.
  A lost code cannot be recovered — mint a new one and revoke the old row.
- `reconcile_event(event_id)` returns wallet, outcome, and settlement drift.
  All three arrays should always be empty.
- Before launch, enable leaked-password protection and set the production
  redirect URLs in Auth settings.
