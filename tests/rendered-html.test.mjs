import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set(
    "test",
    `${process.pid}-${Date.now()}-${pathname.replaceAll("/", "-")}`,
  );
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("home is one focused gender market with a compact market switcher", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  const composers = html.match(/id="prediction-composer"/g) ?? [];
  assert.equal(composers.length, 1);
  assert.match(
    html,
    /<title>Stork Market \| The Family Prediction Exchange<\/title>/i,
  );
  assert.match(html, /What will the parents reveal\?/);
  assert.match(html, /Girl/);
  assert.match(html, /Boy/);
  assert.match(html, /Saturday, Oct 10 · 1:00 PM/);
  assert.match(html, /class="baby-size-card"/);
  assert.match(html, /class="market-switcher"/);
  assert.match(html, /href="\/markets\/birth-date"/);
  assert.match(html, /href="\/markets\/birth-weight"/);
  assert.match(html, /href="\/markets\/birth-time"/);
  assert.match(html, /Event annotations/);
  assert.doesNotMatch(html, /class="market-directory-grid"/);
  assert.doesNotMatch(html, /When will Baby K arrive\?/);
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

test("multi-outcome state, responsive switching, and product direction are documented", async () => {
  const [config, store, css, context, productionPrd] = await Promise.all([
    readFile(new URL("../app/market-config.ts", import.meta.url), "utf8"),
    readFile(new URL("../app/market-store.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/globals.css", import.meta.url), "utf8"),
    readFile(new URL("../context.md", import.meta.url), "utf8"),
    readFile(
      new URL("../docs/prds/PRODUCTION_LAUNCH_PRD.md", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(config, /slug: "girl-or-boy"/);
  assert.match(config, /slug: "birth-date"/);
  assert.match(config, /slug: "birth-weight"/);
  assert.match(config, /slug: "birth-time"/);
  assert.doesNotMatch(config, /slug: "born-before-due-date"/);
  assert.match(config, /trendFocusKey/);
  assert.match(config, /timezone: "America\/Chicago"/);

  assert.match(store, /const STORAGE_KEY = "stork-market-multi-v2"/);
  assert.match(store, /pools: Record<OutcomeKey, number>/);
  assert.match(store, /currentMarket\.pools\[outcome\] \+ credits/);
  assert.match(store, /balance: current\.balance - credits/);

  assert.match(css, /\.market-switcher\s*\{/);
  assert.match(css, /\.outcome-grid\.is-multi\s*\{/);
  assert.match(css, /overflow-x:\s*clip/);
  assert.match(css, /@media \(max-width: 380px\)/);

  assert.match(context, /one focused market at a time/i);
  assert.match(productionPrd, /mutually exclusive outcomes/i);
  assert.match(productionPrd, /Birth weight/);
  assert.match(productionPrd, /Birth time/);
});
