# Active PRDs

This folder contains only planned work that has not yet been completed.

## Current backlog

1. [Production Launch PRD](./PRODUCTION_LAUNCH_PRD.md) — remaining product, hosting, identity, organizer, resolution, and launch work required to turn the local proof of concept into a live shared event.
2. [Supabase Implementation PRD](./SUPABASE_IMPLEMENTATION_PRD.md) — detailed database, authentication, authorization, transaction, Realtime, settlement, migration, and test requirements.

## Removed during the August 5, 2026 cleanup

- `FUTURE_PREDICTION_MARKETS_PRD.md` — removed because the gender, birth-date, birth-weight, and birth-time market experiences are implemented locally. Durable market contracts now live in the Production Launch PRD and `app/market-config.ts`.
- `PRD.md` — replaced because it mixed completed proof-of-concept requirements with future production work. Its remaining backlog is consolidated into the Production Launch PRD.
- Root `SUPABASE_IMPLEMENTATION_PRD.md` — moved here without changing its implementation scope.

## Maintenance rule

When an active PRD is fully implemented and verified:

1. Move lasting product decisions and operational facts into [`context.md`](../../context.md).
2. Update tests or code comments that reference the PRD.
3. Remove the completed PRD from this folder rather than keeping it as an active backlog document.

