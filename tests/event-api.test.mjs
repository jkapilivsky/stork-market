import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, test } from "node:test";

const port = 3700 + (process.pid % 400);
const origin = `http://localhost:${port}`;
let server;
let directory;
let guestCookie;
let hostCookie;
let logs = "";

async function request(path, body, cookie = "", headers = {}) {
  const response = await fetch(`${origin}${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      ...(body ? { "Content-Type": "application/json", Origin: origin } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json();
  return {
    status: response.status,
    data,
    headers: response.headers,
    cookie: response.headers
      .getSetCookie()
      .map((value) => value.split(";")[0])
      .join("; "),
  };
}

before(async () => {
  directory = await mkdtemp(join(tmpdir(), "stork-event-api-"));
  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "--port", String(port)],
    {
      env: {
        ...process.env,
        STORK_ALLOW_LOCAL_STORE: "true",
        STORK_LOCAL_DB: join(directory, "event.sqlite"),
        STORK_HOST_PIN: "test-host-secret",
        SUPABASE_SECRET_KEY: "",
        SUPABASE_SERVICE_ROLE_KEY: "",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  server.stdout.on("data", (data) => {
    logs += data;
  });
  server.stderr.on("data", (data) => {
    logs += data;
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(logs);
    try {
      const response = await request("/api/event");
      if (response.status === 200) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Test server did not start: ${logs}`);
});

after(async () => {
  if (server?.exitCode === null) {
    const closed = new Promise((resolve) => server.once("exit", resolve));
    server.kill("SIGTERM");
    await closed;
  }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test("guest identity uses an HttpOnly cookie and retries do not duplicate guests", async () => {
  const initial = await request("/api/event");
  assert.equal(initial.data.phase, "voting");
  assert.equal(initial.data.guests.length, 0);
  assert.match(initial.headers.get("set-cookie"), /HttpOnly/i);
  assert.match(initial.headers.get("cache-control"), /no-store/);
  guestCookie = initial.cookie;
  const body = {
    action: "join",
    name: "Auntie Sarah",
    message: "Our private wish for Baby K",
    shareMessage: false,
  };
  const joined = await request("/api/event", body, guestCookie);
  assert.equal(joined.status, 200);
  assert.equal(joined.data.me.name, "Auntie Sarah");
  await request("/api/event", body, guestCookie);
  const vote = await request(
    "/api/event",
    { action: "vote", vote: "boy" },
    guestCookie,
  );
  assert.equal(vote.data.guests.length, 1);
  assert.equal(vote.data.me.vote, "boy");
  await request("/api/event", { action: "vote", vote: "girl" }, guestCookie);
  const refreshed = await request("/api/event", undefined, guestCookie);
  assert.equal(refreshed.data.guests.length, 1);
  assert.equal(refreshed.data.me.vote, "girl");
  assert.equal(refreshed.data.me.message, body.message);
  const tv = await request("/api/event");
  assert.equal(tv.data.guests[0].message, "");
  assert.equal(tv.data.me, null);
  assert.doesNotMatch(
    JSON.stringify(tv.data),
    /tokenHash|private wish|secretResult|hostAttempts/,
  );
});

test("server validates input, origin, guest identity, and host authorization", async () => {
  assert.equal(
    (await request("/api/event", { action: "vote", vote: "boy" })).status,
    401,
  );
  assert.equal(
    (
      await request("/api/event", {
        action: "join",
        name: " ",
        message: "",
        shareMessage: true,
      })
    ).status,
    400,
  );
  assert.equal(
    (await request("/api/event", { action: "vote", vote: "oops" }, guestCookie))
      .status,
    400,
  );
  assert.equal(
    (
      await request(
        "/api/event",
        { action: "vote", vote: "boy" },
        guestCookie,
        { Origin: "https://unrelated.example" },
      )
    ).status,
    403,
  );
  assert.equal(
    (await request("/api/host", { action: "start" }, guestCookie)).status,
    401,
  );
  assert.equal(
    (await request("/api/host", { action: "login", pin: "wrong" })).status,
    401,
  );
  assert.equal(
    (
      await request(
        "/api/host",
        { action: "start" },
        "stork_host=9999999999999.forged",
      )
    ).status,
    401,
  );
  assert.equal((await request("/api/host")).data.authenticated, false);
  assert.equal(
    (
      await request("/api/event", {
        action: "wish",
        name: "Early wish",
        message: "Love",
        shareMessage: true,
      })
    ).status,
    409,
  );
  const oversized = await request("/api/event", {
    action: "join",
    name: "Guest",
    message: "a".repeat(20000),
    shareMessage: true,
  });
  assert.equal(oversized.status, 413);
});

test("concurrent guests and votes all survive atomic writes", async () => {
  const guests = await Promise.all(
    Array.from({ length: 16 }, async (_, index) => {
      const identity = await request("/api/event");
      const joined = await request(
        "/api/event",
        {
          action: "join",
          name: `Guest ${index}`,
          message: "Lots of love!",
          shareMessage: true,
        },
        identity.cookie,
      );
      assert.equal(joined.status, 200);
      const vote = await request(
        "/api/event",
        { action: "vote", vote: index % 2 ? "girl" : "boy" },
        identity.cookie,
      );
      assert.equal(vote.status, 200);
      return vote.data.me;
    }),
  );
  assert.equal(new Set(guests.map((guest) => guest.id)).size, 16);
  const tv = await request("/api/event");
  assert.equal(tv.data.guests.length, 17);
  assert.equal(
    tv.data.guests.filter((guest) => guest.vote === "boy").length,
    8,
  );
  assert.equal(
    tv.data.guests.filter((guest) => guest.vote === "girl").length,
    9,
  );
});

test("host setup withholds the answer and exposes private notes only to the host", async () => {
  const login = await request("/api/host", {
    action: "login",
    pin: "test-host-secret",
  });
  assert.equal(login.status, 200);
  hostCookie = login.cookie;
  assert.match(login.headers.get("set-cookie"), /HttpOnly/i);
  assert.equal(
    (await request("/api/host", { action: "start" }, hostCookie)).status,
    409,
  );
  const current = await request("/api/event");
  const saved = await request(
    "/api/host",
    {
      action: "configure",
      settings: {
        ...current.data.settings,
        thankYouMessage: "Thank you for celebrating our little girl.",
      },
      result: "girl",
    },
    hostCookie,
  );
  assert.equal(saved.status, 200);
  assert.equal(saved.data.result, null);
  const host = await request("/api/host", undefined, hostCookie);
  assert.equal(host.data.resultReady, true);
  assert.equal(
    host.data.thankYouMessage,
    "Thank you for celebrating our little girl.",
  );
  assert.doesNotMatch(JSON.stringify(saved.data), /our little girl/);
  assert.equal(
    host.data.privateNotes[0].message,
    "Our private wish for Baby K",
  );
  assert.doesNotMatch(
    JSON.stringify(host.data),
    /secretResult|"result":"girl"/,
  );
  assert.equal((await request("/api/event")).data.result, null);
});

test("host can stop a countdown, then reveal once while votes stay locked", async () => {
  const first = await request("/api/host", { action: "start" }, hostCookie);
  assert.equal(first.data.phase, "countdown");
  assert.equal(first.data.result, null);
  const retry = await request("/api/host", { action: "start" }, hostCookie);
  assert.equal(retry.data.revealAt, first.data.revealAt);
  assert.equal(
    (await request("/api/event", { action: "vote", vote: "boy" }, guestCookie))
      .status,
    409,
  );
  const canceled = await request("/api/host", { action: "cancel" }, hostCookie);
  assert.equal(canceled.data.phase, "voting");
  assert.equal(canceled.data.guests.length, 17);
  const started = await request("/api/host", { action: "start" }, hostCookie);
  assert.equal((await request("/api/event")).data.result, null);
  assert.equal(
    (
      await request("/api/event", {
        action: "join",
        name: "Late guest",
        message: "",
        shareMessage: true,
      })
    ).status,
    409,
  );
  await new Promise((resolve) =>
    setTimeout(resolve, Math.max(0, started.data.revealAt - Date.now() + 80)),
  );
  const result = await request("/api/event");
  assert.equal(result.data.phase, "revealed");
  assert.equal(result.data.result, "girl");
  assert.equal(
    result.data.settings.thankYouMessage,
    "Thank you for celebrating our little girl.",
  );
  assert.equal(
    (await request("/api/host", { action: "cancel" }, hostCookie)).status,
    409,
  );
  assert.equal(
    (
      await request(
        "/api/host",
        { action: "configure", settings: result.data.settings, result: "boy" },
        hostCookie,
      )
    ).status,
    409,
  );
  const logout = await request("/api/host", { action: "logout" }, hostCookie);
  assert.equal(logout.status, 200);
  assert.match(logout.headers.get("set-cookie"), /Max-Age=0/i);
});

test("QR code is generated locally and points to the guest route", async () => {
  const qr = await request("/api/qr");
  assert.equal(qr.status, 200);
  assert.equal(new URL(qr.data.url).pathname, "/vote");
  assert.match(qr.data.dataUrl, /^data:image\/png;base64,/);
  const celebration = await request("/api/qr?page=celebration");
  assert.equal(new URL(celebration.data.url).pathname, "/celebration");
  assert.match(celebration.data.dataUrl, /^data:image\/png;base64,/);
});

test("final wishes use the guest cookie, retain privacy, and never change final voting totals", async () => {
  const before = await request("/api/event");
  const votes = before.data.guests.map(({ id, vote }) => ({ id, vote }));
  const body = {
    action: "wish",
    name: "Ignored new name",
    message: "A private final wish",
    shareMessage: false,
    vote: "boy",
  };
  const saved = await request("/api/event", body, guestCookie);
  assert.equal(saved.status, 200);
  assert.equal(saved.data.me.celebrationNote, body.message);
  assert.equal(saved.data.me.message, "Our private wish for Baby K");
  assert.equal(saved.data.me.vote, "girl");
  const tv = await request("/api/event");
  assert.doesNotMatch(JSON.stringify(tv.data), /A private final wish/);
  assert.deepEqual(
    tv.data.guests.map(({ id, vote }) => ({ id, vote })),
    votes,
  );
  const login = await request("/api/host", {
    action: "login",
    pin: "test-host-secret",
  });
  const host = await request("/api/host", undefined, login.cookie);
  assert.ok(
    host.data.privateNotes.some((note) => note.message === body.message),
  );
  const late = await request("/api/event");
  const lateWish = {
    ...body,
    name: "Late guest",
    message: "A happy new chapter",
    shareMessage: true,
  };
  const first = await request("/api/event", lateWish, late.cookie);
  const retry = await request("/api/event", lateWish, late.cookie);
  assert.equal(first.status, 200);
  assert.equal(first.data.me.id, retry.data.me.id);
  assert.equal(retry.data.me.vote, null);
  assert.equal(retry.data.guests.length, before.data.guests.length + 1);
  assert.equal(
    (await request("/api/event", { action: "vote", vote: "girl" }, late.cookie))
      .status,
    409,
  );
});
