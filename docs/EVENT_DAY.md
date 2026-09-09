# Baby K’s event-day experience

This branch pivots Stork Market to a guest book, one-person boy/girl voting,
a shared TV dashboard, and a host-controlled reveal. The older credit markets
remain at `/markets/[slug]` and `/portfolio`; their data is not migrated.

## The event flow

- `/` or `/dashboard`: TV dashboard, live vote totals, individual guest picks,
  paged guest list, rotating public notes, old wives’ tales, and a real QR code.
- `/vote`: first-time guests enter a name and optional note in a modal, then
  choose boy/girl. A receipt confirms the saved choice. They can edit their
  name, note, and vote until the reveal starts. No email or account is needed.
- `/host`: passcode-protected configuration, private notes, and reveal controls.
  Set the actual result on a private phone before putting the dashboard on TV.
- `/rehearsal`: standalone preview with sample guests and either sample result.
  No host passcode or backend setup is needed. Start, stop, replay, change the
  sample result, or jump straight to a sample celebration. This affects only
  the current screen and never calls the event or host APIs.
- “Ready for the reveal?” on the dashboard: unlock host controls, confirm the
  parents are ready, and start a ten-second countdown across all screens.
  Hosts can stop it before zero; the completed reveal cannot be reset in the UI.
- After the reveal announcement, the celebration opens automatically after
  12 seconds or immediately through “Join the celebration.” The TV shows final
  vote totals, guests who guessed correctly, rotating public wishes, a message
  from the parents, and a QR code to `/celebration`. Rotation can be paused.
- `/celebration`: opens only after the real reveal. Guests can add or edit a
  final wish, choosing whether to share it on the TV or only with the hosts.
  Earlier notes are preserved. Late visitors can leave wishes without voting.
  The `/vote` route also shows the celebration afterward, so existing QR codes
  still work. Refreshes and new visits show the celebration directly.

Baby K is the confirmed display name. The date remains October 10, 2026 from
the existing event configuration. Parents’ names and tale answers are editable.
The four starter tales are cravings, bump position, heartbeat, and the ring test.
They have no invented family measurements or answers. The tales are explicitly
party folklore, not medical predictions. Sources:
[Pampers’ folklore collection](https://www.pampers.com/en-us/pregnancy/pregnancy-announcement/article/old-wives-tales-gender-prediction)
and [Cleveland Clinic on the heartbeat myth](https://health.clevelandclinic.org/does-babys-heart-rate-reveal-their-sex).

## Preview the reveal without changing the event

Open `/rehearsal`, or choose “Open rehearsal” from host setup. Select a sample
boy/girl result, then start the ten-second practice countdown. The sample result
and guest names are labeled throughout. “Stop rehearsal” returns to setup;
“Replay rehearsal” starts again. “Preview celebration screen” skips the countdown.
Refreshing resets the preview. This works even after the real event is revealed.

Rehearsal uses the same countdown and celebration presentation as the event,
but no real guests, saved result, or persistent state. It does not synchronize
other screens. Use a separate event/database for an end-to-end network rehearsal.

## Run the app locally

Node 22.13+ is required; SQLite is provided by Node's experimental `node:sqlite`.

```bash
npm install
# Set STORK_HOST_PIN in .env.local, or pass a temporary rehearsal passcode:
STORK_HOST_PIN=baby-k-preview npm run dev -- --hostname 0.0.0.0
```

The console prints the actual port. Open that URL and `/rehearsal` for a sample
preview, or `/host` to configure the local event. When the dashboard is opened at localhost, its QR code uses this
computer’s private IPv4 address if available. Phones must be on the same Wi-Fi
and the computer's firewall must allow the local server. Set
`NEXT_PUBLIC_STORK_SITE_URL` to the reachable origin if automatic selection
chooses a VPN or a different network adapter.

Without a Supabase secret key, development uses `.data/event.sqlite`, shared by
all phones connected to this server and persistent through server restarts.
This is independent of the old browser-local credit wallet. Use a different
`STORK_LOCAL_DB` path for each fresh rehearsal; existing guest data is never
silently reset. Database files are git-ignored.

For a local production-build rehearsal only:

```bash
npm run build
STORK_ALLOW_LOCAL_STORE=true STORK_HOST_PIN=baby-k-preview npm start
```

An unconfigured production deployment returns an explicit setup error. It never
silently falls back to per-instance memory or ephemeral disk on Vercel.

## Connect a hosted event to Supabase

The new migration has been prepared locally. It has **not** been applied to the
live Supabase project. The code has **not** been deployed from this branch.

1. Reconcile the remote migration history as described in `supabase/README.md`
   before using `db:push`. Do not blindly push a directory containing only this
   new migration over the existing remote history. Alternatively, review and run
   `supabase/migrations/20260907000000_event_party.sql` in Supabase's SQL editor.
2. Configure the hosting environment with the following values, then rebuild:

   | Variable | Purpose |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Existing project API URL |
   | `SUPABASE_SECRET_KEY` | Server-only Supabase secret; legacy `SUPABASE_SERVICE_ROLE_KEY` is also supported |
   | `NEXT_PUBLIC_STORK_EVENT_SLUG` | `baby-k` (use a separate slug for a hosted rehearsal) |
   | `STORK_HOST_PIN` | A private host passcode, at least six characters |
   | `STORK_SESSION_SECRET` | Optional separate random secret for signing host cookies; defaults to the host passcode |
   | `NEXT_PUBLIC_STORK_SITE_URL` | Canonical HTTPS origin that the TV QR code should open |

3. On a private phone, open `/host`, unlock controls, fill in the event details
   and folklore answers, select the actual result, and save.
4. Open `/dashboard` on the TV and enter full screen. Scan the QR from two
   separate phones and rehearse the flow on a separate event slug before using
   the real event.

Never put `SUPABASE_SECRET_KEY`, the host passcode, or the session secret in a
`NEXT_PUBLIC_` variable. The new private table and RPCs are separate from the
legacy market schema; they do not alter balances, predictions, or invitations.

## Consistency, identity, and privacy

- All guests share server-owned state. The TV polls every two seconds, with
  faster result fetching at the countdown deadline and refresh on reconnect.
  Event revisions prevent delayed responses from overwriting newer state.
- A random, HttpOnly cookie identifies each guest. Only its SHA-256 hash is
  stored with the guest. Name collisions are allowed; names are not identities.
- One browser profile has one editable vote. Clearing cookies, using incognito,
  or switching devices can create another guest. This intentionally simple
  party flow is not an identity-verification system. A shared phone supports
  one guest at a time; use separate devices/profiles for separate guests.
- Public snapshots omit token hashes, the saved answer, host login attempts,
  and private note text. Guests explicitly choose whether their note is on TV.
  Hosts can read private notes after unlocking `/host`.
- The parents’ thank-you message is editable in host setup (500 characters).
  It is withheld from public snapshots until the reveal, since it may mention
  the result. Blank messages use the default thank-you. Final wishes also allow
  500 characters and retain one wish per browser identity. The server accepts
  them only after the deadline and never changes the original vote or note.
- Thank-you and final-wish fields are optional fields in the existing party
  JSON document. Older event state remains compatible; these additions need
  no further SQL migration beyond the original party migration.
- A signed, HttpOnly host cookie expires after 12 hours. Host login is limited
  to eight attempts per 15 minutes. Vercel uses its trusted forwarding header;
  local and other self-hosted deployments share one rate-limit bucket.
- Mutations check origin, payload size, text limits, guest/host authorization,
  and event phase on the server. Votes are rejected as soon as the countdown
  starts. Retrying the start command cannot extend the reveal deadline.
- Both SQLite and Supabase use revision-based compare-and-swap for atomic
  mutation. Conflicting writes retry against the newest event state.
- The result is returned only when server time reaches the stored deadline.
  There is no hidden answer in page HTML, public JSON, or client configuration
  during voting or countdown. A disconnected screen waits to fetch the result.
- The guest book is capped at 1,000 browser identities. This is a small family
  event implementation using one JSON document; larger/public events should
  use normalized guest tables, an invite gate, and more granular abuse limits.
- Event pages and guest names/choices are visible to anyone with the site URL.
  Protect the deployment separately if invite-only viewing is required. The
  archived market invitation system does not gate these new party routes.

## Checks

`npm test` builds and runs model, rendered-page, and real HTTP API tests. The API
suite uses a disposable SQLite database, including simultaneous submissions,
private notes, host authorization, countdown cancellation, and vote locking.

`npm run test:browser` runs isolated sample rehearsal checks, the guest → TV →
host → reveal → celebration flow, final wishes, and responsive checks against
a disposable production server. Install a Playwright browser
first (`npx playwright install chromium`) or set `STORK_CHROME_PATH` to an
installed Chrome executable. Browser screenshots go to ignored `test-results/`.

The Supabase SQL should also be verified in an isolated PostgreSQL environment
before applying it live. The permissions follow Supabase's
[database function guidance](https://supabase.com/docs/guides/database/functions)
and [API key model](https://supabase.com/docs/guides/api/api-keys).

### Validation in this workspace

The production build (Webpack), lint, 22 model/HTTP/rendered-page checks, and
four browser scenarios passed for the rehearsal and celebration additions.
The original party migration passed isolated PostgreSQL permission/atomic-write
assertions. The extended suite covers rehearsal isolation, replaying both sample
results, automatic celebration transitions, wish privacy, locked vote totals,
and TV/phone layouts. Browser screenshots are saved under `test-results/`.

macOS blocked the installed native Next.js/Tailwind compiler binaries in this
session. Validation used published WebAssembly compiler packages installed
locally without saving them to the project dependencies, with a temporary
compiler adapter at `/private/tmp/stork-wasm-compiler.cjs`. The deployment
scripts retain the standard native build path. The running local preview
serves the verified production build.
