import "server-only";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { createEvent, EventError, type PrivateEvent } from "../model.ts";

type RecordVersion = { revision: number; state: PrivateEvent };
const slug = process.env.NEXT_PUBLIC_STORK_EVENT_SLUG || "baby-k";
const secret =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
export const storageMode = secret ? "supabase" : "local";
let sqlite: DatabaseSync | undefined;

async function localDatabase() {
  // Never fall back to ephemeral disk on Vercel or an unconfigured production deployment.
  if (
    process.env.VERCEL ||
    (process.env.NODE_ENV === "production" &&
      process.env.STORK_ALLOW_LOCAL_STORE !== "true")
  ) {
    throw new EventError(
      "The event is not connected yet. Please ask the hosts to finish setup.",
      503,
    );
  }
  if (!sqlite) {
    const { DatabaseSync } = await import("node:sqlite");
    const file = process.env.STORK_LOCAL_DB || resolve(".data", "event.sqlite");
    mkdirSync(dirname(file), { recursive: true });
    sqlite = new DatabaseSync(file);
    sqlite.exec(
      "PRAGMA journal_mode = WAL; PRAGMA busy_timeout = 5000; CREATE TABLE IF NOT EXISTS party_events (slug TEXT PRIMARY KEY, revision INTEGER NOT NULL DEFAULT 0, state TEXT NOT NULL)",
    );
    sqlite
      .prepare("INSERT OR IGNORE INTO party_events (slug, state) VALUES (?, ?)")
      .run(slug, JSON.stringify(createEvent()));
  }
  return sqlite;
}

async function rpc(name: string, body: Record<string, unknown>) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || !secret)
    throw new EventError("The event database needs to be configured.", 503);
  const response = await fetch(`${url}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: secret,
      // Legacy service_role JWTs need Authorization. New sb_secret keys use apikey.
      ...(secret.startsWith("sb_secret_")
        ? {}
        : { Authorization: `Bearer ${secret}` }),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok)
    throw new EventError(
      "We couldn’t reach the event. Please try again in a moment.",
      503,
    );
  return response.json();
}

export async function readEvent(): Promise<RecordVersion> {
  if (storageMode === "supabase") {
    const record = await rpc("stork_party_read", { p_slug: slug });
    if (record) return record;
    await rpc("stork_party_commit", {
      p_slug: slug,
      p_revision: -1,
      p_state: createEvent(),
    });
    const initialized = await rpc("stork_party_read", { p_slug: slug });
    if (!initialized)
      throw new EventError("The event could not be loaded.", 503);
    return initialized;
  }
  const db = await localDatabase();
  const row = db
    .prepare("SELECT revision, state FROM party_events WHERE slug = ?")
    .get(slug) as { revision: number; state: string };
  return { revision: row.revision, state: JSON.parse(row.state) };
}

async function commit(expected: number, state: PrivateEvent): Promise<boolean> {
  if (storageMode === "supabase")
    return rpc("stork_party_commit", {
      p_slug: slug,
      p_revision: expected,
      p_state: state,
    });
  const db = await localDatabase();
  return (
    db
      .prepare(
        "UPDATE party_events SET state = ?, revision = revision + 1 WHERE slug = ? AND revision = ?",
      )
      .run(JSON.stringify(state), slug, expected).changes === 1
  );
}

export async function updateEvent<T>(
  mutate: (state: PrivateEvent, revision: number) => T,
): Promise<T> {
  // Compare-and-swap serializes guest votes, host edits, and reveal locking across instances.
  for (let attempt = 0; attempt < 12; attempt++) {
    const { state, revision } = await readEvent();
    const result = mutate(state, revision);
    if (await commit(revision, state)) return result;
    await new Promise((resolve) =>
      setTimeout(resolve, 15 + Math.random() * 40 * (attempt + 1)),
    );
  }
  throw new EventError("A few guests arrived at once. Please try again.", 409);
}
