import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { after, before, test } from "node:test";
import { fileURLToPath } from "node:url";

const rootDirectory = fileURLToPath(new URL("..", import.meta.url));
const port = 3100 + (process.pid % 500);
const baseUrl = `http://127.0.0.1:${port}`;

let server;

async function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (server?.exitCode != null) {
      throw new Error(`next start exited early with code ${server.exitCode}`);
    }

    try {
      const response = await fetch(baseUrl, { redirect: "manual" });
      await response.arrayBuffer();
      return;
    } catch {
      // Server is not accepting connections yet.
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`next start did not become ready on ${baseUrl}`);
}

before(async () => {
  server = spawn("npx", ["next", "start", "--port", String(port)], {
    cwd: rootDirectory,
    stdio: "ignore",
  });
  await waitForServer();
});

after(() => {
  server?.kill("SIGTERM");
});

async function render(pathname = "/") {
  return fetch(`${baseUrl}${pathname}`, {
    headers: { accept: "text/html" },
    redirect: "manual",
  });
}

test("home is the event dashboard without the old wallet or betting composer", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Stork Market \| Baby K’s Big Reveal/);
  assert.match(html, /A little mystery/);
  assert.match(html, /What’s your little hunch/);
  assert.match(html, /Look who’s guessing/);
  assert.match(html, /What do the old wives’ tales say/);
  assert.match(html, /href="\/vote"/);
  assert.match(html, /Ready for the reveal/);
  assert.doesNotMatch(
    html,
    /id="prediction-composer"|My balance|Reset local demo/,
  );
});

test("guest, TV, and host routes render independently", async () => {
  for (const [path, expected] of [
    ["/vote", /What’s your/],
    ["/dashboard", /A little mystery/],
    ["/host", /Welcome, hosts/],
    ["/rehearsal", /Start rehearsal/],
    ["/celebration", /A little more/],
  ]) {
    const response = await render(path);
    assert.equal(response.status, 200);
    assert.match(await response.text(), expected);
  }
});

test("the former market directory redirects to the focused experience", async () => {
  const response = await render("/markets");
  assert.ok([307, 308].includes(response.status));
  assert.match(response.headers.get("location") ?? "", /\/$/);
});

test("birth date is one multi-outcome market rather than three yes-no markets", async () => {
  const response = await render("/markets/birth-date");
  assert.equal(response.status, 200);

  const html = await response.text();
  const composers = html.match(/id="prediction-composer"/g) ?? [];
  assert.equal(composers.length, 1);
  assert.match(html, /When will Baby K arrive\?/);
  assert.match(html, /choices · 1 winner/);
  assert.match(html, /Jan 26 or earlier/);
  assert.match(html, /Jan 27–Feb 2/);
  assert.match(html, /Due date · Feb 3/);
  assert.match(html, /Feb 4–10/);
  assert.match(html, /Feb 11 or later/);
  assert.match(html, /Exactly one listed date window wins/);
  assert.match(html, /Place Jan 26 or earlier prediction/);
  assert.doesNotMatch(html, /Will the baby be born before February 3/);
  assert.doesNotMatch(html, /Will the baby be born on February 3/);
});

test("the two additional ideas remain separate switchable markets", async () => {
  const [weightResponse, timeResponse] = await Promise.all([
    render("/markets/birth-weight"),
    render("/markets/birth-time"),
  ]);
  assert.equal(weightResponse.status, 200);
  assert.equal(timeResponse.status, 200);

  const [weightHtml, timeHtml] = await Promise.all([
    weightResponse.text(),
    timeResponse.text(),
  ]);
  assert.match(weightHtml, /What will Baby K weigh at birth\?/);
  assert.match(weightHtml, /7 lb–7 lb 15 oz/);
  assert.match(weightHtml, /9 lb or more/);
  assert.match(timeHtml, /What time of day will Baby K arrive\?/);
  assert.match(timeHtml, /Morning · 6:00–11:59 AM/);
  assert.match(timeHtml, /Evening · 6:00–11:59 PM/);
});

test("portfolio supports separate positions across multi-outcome markets", async () => {
  const response = await render("/portfolio");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /One portfolio, separate positions\./);
  assert.match(html, /Every receipt stays tied to one question/);
  assert.match(html, /No market positions yet/);
  assert.match(html, /Make my first prediction/);
  assert.doesNotMatch(html, /id="prediction-composer"/);
});
