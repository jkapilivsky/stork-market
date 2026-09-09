import { expect, test } from "@playwright/test";

test("rehearsals replay either sample result without reading or changing the real event", async ({
  page,
  request,
}) => {
  const before = await (await request.get("/api/event")).json();
  const eventRequests: string[] = [];
  const errors: string[] = [];
  page.on("request", (request) => {
    if (new URL(request.url()).pathname.startsWith("/api/"))
      eventRequests.push(request.url());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.clock.install();
  await page.goto("/rehearsal");
  await expect(
    page.getByRole("heading", { name: /All the butterflies/ }),
  ).toBeVisible();
  await page.screenshot({
    path: "test-results/rehearsal-setup.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Start rehearsal", exact: true })
    .click();
  await expect(
    page.getByRole("dialog", { name: "The big reveal" }),
  ).toBeVisible();
  await expect(
    page.getByText("REHEARSAL · SAMPLE RESULT", { exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Stop rehearsal" }).click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Start rehearsal", exact: true })
    .click();
  await page.clock.fastForward(10100);
  await expect(
    page.getByRole("dialog", { name: "It’s a girl!" }),
  ).toBeVisible();
  await page.clock.fastForward(12100);
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(
    page.getByText("SAMPLE CELEBRATION", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Pause celebration rotation" })
    .click();
  await page.screenshot({
    path: "test-results/celebration-rehearsal.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Change sample result" }).click();
  await page.getByRole("radio", { name: "Sample boy" }).check();
  await page
    .getByRole("button", { name: "Start rehearsal", exact: true })
    .click();
  await page.clock.fastForward(10100);
  await expect(page.getByRole("dialog", { name: "It’s a boy!" })).toBeVisible();
  await page.getByRole("button", { name: "Join the celebration" }).click();
  await expect(
    page.getByRole("heading", { name: "It’s a boy!" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Replay rehearsal" }).click();
  await expect(page.getByRole("timer")).toHaveText("10");
  await page.getByRole("button", { name: "Stop rehearsal" }).click();
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Start rehearsal", exact: true }),
  ).toBeVisible();
  expect(eventRequests).toEqual([]);
  expect(errors).toEqual([]);
  const after = await (await request.get("/api/event")).json();
  for (const field of [
    "revision",
    "phase",
    "result",
    "revealAt",
    "guests",
    "settings",
  ])
    expect(after[field]).toEqual(before[field]);
  await page.goto("/celebration");
  await expect(
    page.getByRole("heading", { name: /A little more/ }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Leave a final wish" }),
  ).toHaveCount(0);
});

test("mobile guest book, live TV, host setup, and a synchronized reveal", async ({
  browser,
}) => {
  test.setTimeout(60000);
  const guest = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const host = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
  });
  const guestPage = await guest.newPage();
  const tv = await host.newPage();
  const errors: string[] = [];
  guestPage.on("pageerror", (error) => errors.push(error.message));
  tv.on("pageerror", (error) => errors.push(error.message));

  await tv.goto("/");
  await expect(tv.getByText("Voting is open", { exact: true })).toBeVisible();
  await expect(tv.getByRole("img", { name: /Scan to open/ })).toBeVisible();
  await expect(
    tv.getByRole("button", { name: "Ready for the reveal?" }),
  ).toBeInViewport({ ratio: 1 });
  await tv.screenshot({
    path: "test-results/dashboard-empty.png",
    fullPage: true,
  });

  await guestPage.goto("/vote");
  const welcome = guestPage.getByRole("dialog", {
    name: "Welcome to Baby K’s reveal",
  });
  await expect(welcome).toBeVisible();
  await expect(
    welcome.getByRole("textbox", { name: /^Your name/ }),
  ).toBeFocused();
  await guestPage.screenshot({
    path: "test-results/guest-welcome-mobile.png",
    fullPage: true,
  });
  await welcome
    .getByRole("textbox", { name: /^Your name/ })
    .fill("Auntie Sarah");
  await welcome
    .getByLabel("A note for the parents")
    .fill(
      "You two are going to be the most wonderful parents. Baby K is so loved already!",
    );
  await welcome.getByRole("button", { name: "Let’s make a guess" }).click();
  await expect(welcome).not.toBeVisible();
  await guestPage.getByRole("radio", { name: /Girl/ }).check();
  await guestPage.screenshot({
    path: "test-results/guest-pick-mobile.png",
    fullPage: true,
  });
  await guestPage.getByRole("button", { name: "I’m guessing girl" }).click();
  await expect(
    guestPage.getByText("YOUR GUESS IS IN", { exact: true }),
  ).toBeVisible();
  await expect(tv.locator(".party-team.is-girl .team-number")).toContainText(
    "1",
  );
  await expect(tv.getByText("Auntie Sarah", { exact: true })).toHaveCount(0);
  await expect(tv.getByText(/You two are going to be/)).toHaveCount(0);
  await guestPage.reload();
  await expect(
    guestPage.getByText("YOUR GUESS IS IN", { exact: true }),
  ).toBeVisible();
  await guestPage.getByRole("button", { name: "Change my guess" }).click();
  await guestPage.getByRole("radio", { name: /Boy/ }).check();
  await guestPage.getByRole("button", { name: "I’m guessing boy" }).click();
  await expect(
    guestPage.getByRole("heading", { name: "It’s a boy" }),
  ).toBeVisible();
  await expect(tv.locator(".party-team.is-boy .team-number")).toContainText(
    "1",
  );

  const setup = await host.newPage();
  await setup.goto("/host");
  await setup.getByLabel("Host passcode").fill("browser-host-secret");
  await setup.getByRole("button", { name: "Unlock host controls" }).click();
  await setup.getByLabel("Parents’ names").fill("Jess & Alex");
  await setup
    .getByLabel("Your thank-you message")
    .fill("Thank you for celebrating our little girl with us.");
  await setup.getByLabel(/The cravings/).selectOption("girl");
  await setup.getByLabel(/The baby bump/).selectOption("boy");
  await setup.getByRole("button", { name: "Set the reveal result" }).click();
  await setup.getByRole("radio", { name: "It’s a girl" }).check();
  await setup.getByRole("button", { name: "Save event details" }).click();
  await expect(
    setup.getByText("The details are saved.", { exact: false }),
  ).toBeVisible();
  await expect(tv.getByText("Something sweet", { exact: true })).toBeVisible();
  await expect(
    tv.getByText("Thank you for celebrating our little girl with us."),
  ).toHaveCount(0);
  const rightGuess = await browser.newContext();
  await rightGuess.request.get("http://localhost:4207/api/event");
  const post = (data: Record<string, unknown>) =>
    rightGuess.request.post("http://localhost:4207/api/event", {
      data,
      headers: { Origin: "http://localhost:4207" },
    });
  expect(
    (
      await post({
        action: "join",
        name: "Uncle James",
        message: "A private family note",
        shareMessage: false,
      })
    ).ok(),
  ).toBeTruthy();
  expect((await post({ action: "vote", vote: "girl" })).ok()).toBeTruthy();
  await expect(tv.locator(".party-total strong")).toHaveText("2");
  await expect(tv.locator(".party-team.is-girl .team-number")).toContainText(
    "1",
  );
  await expect(tv.getByText("Uncle James", { exact: true })).toHaveCount(0);
  await tv.screenshot({
    path: "test-results/dashboard-with-guest.png",
    fullPage: true,
  });
  await tv.getByRole("button", { name: "Ready for the reveal?" }).click();
  await tv.getByRole("checkbox", { name: /The parents are ready/ }).check();
  await tv
    .getByRole("button", { name: "Start the 10-second countdown" })
    .click();
  await expect(
    tv.getByRole("dialog", { name: "The big reveal" }),
  ).toBeVisible();
  await expect(
    guestPage.getByRole("dialog", { name: "The big reveal" }),
  ).toBeVisible();
  await tv.screenshot({ path: "test-results/countdown.png" });
  await tv.getByRole("button", { name: "Stop countdown", exact: true }).click();
  await expect(
    guestPage.getByRole("dialog", { name: "The big reveal" }),
  ).not.toBeVisible();
  await tv.getByRole("button", { name: "Ready for the reveal?" }).click();
  await tv.getByRole("checkbox", { name: /The parents are ready/ }).check();
  await tv
    .getByRole("button", { name: "Start the 10-second countdown" })
    .click();
  await expect(tv.getByRole("dialog", { name: "It’s a girl!" })).toBeVisible({
    timeout: 15000,
  });
  await expect(
    guestPage.getByRole("dialog", { name: "It’s a girl!" }),
  ).toBeVisible();
  await tv.screenshot({ path: "test-results/reveal.png" });
  await guestPage.getByRole("button", { name: "Join the celebration" }).click();
  await expect(
    guestPage.getByRole("button", { name: "Change my guess" }),
  ).toHaveCount(0);
  await guestPage.getByRole("button", { name: "Leave a final wish" }).click();
  await guestPage
    .getByLabel("Your final wish")
    .fill("May you always know how loved you are, little one.");
  await guestPage.getByRole("button", { name: "Save my wish" }).click();
  await expect(
    guestPage.getByRole("button", { name: "Edit my final wish" }),
  ).toBeVisible();
  await guestPage.reload();
  await expect(
    guestPage.getByRole("button", { name: "Edit my final wish" }),
  ).toBeVisible();
  await expect(guestPage.getByRole("dialog")).toHaveCount(0);
  // The TV continues automatically, without the host clicking another control.
  await expect(tv.getByRole("dialog")).toHaveCount(0, { timeout: 15000 });
  await expect(
    tv.getByText("Thank you for celebrating our little girl with us."),
  ).toBeVisible();
  const correctGuesses = tv.getByLabel("Guests who guessed correctly");
  await expect(correctGuesses.getByText("Uncle James")).toBeVisible();
  await expect(correctGuesses.getByText("Auntie Sarah")).toHaveCount(0);
  await expect(tv.getByText("A private family note")).toHaveCount(0);
  await expect(tv.getByRole("img", { name: /celebration page/ })).toBeVisible();
  await expect(tv.locator(".party-qr-link a")).toHaveAttribute(
    "href",
    /\/celebration$/,
  );
  await tv.getByRole("button", { name: "Pause celebration rotation" }).click();
  if (!(await tv.getByText(/May you always know/).isVisible())) {
    await tv.getByRole("button", { name: "Next celebration note" }).click();
  }
  await expect(tv.getByText(/May you always know/)).toBeVisible();
  await tv.screenshot({
    path: "test-results/celebration-live-tv.png",
    fullPage: true,
  });
  await guestPage.screenshot({
    path: "test-results/celebration-mobile.png",
    fullPage: true,
  });
  // A late visitor can leave a wish, with no opportunity to create a late vote.
  const late = await browser.newContext({
    viewport: { width: 390, height: 844 },
  });
  const latePage = await late.newPage();
  await latePage.goto("/celebration");
  await latePage.getByRole("button", { name: "Leave a final wish" }).click();
  await latePage.getByLabel("Your name", { exact: true }).fill("Cousin Mia");
  await latePage
    .getByLabel("Your final wish")
    .fill("A wish just for the parents");
  await latePage.getByRole("checkbox", { name: /Share my wish/ }).uncheck();
  await latePage.getByRole("button", { name: "Save my wish" }).click();
  await expect(
    latePage.getByText("Your wish is just for the hosts."),
  ).toBeVisible();
  await latePage.reload();
  await expect(
    latePage.getByRole("button", { name: "Edit my final wish" }),
  ).toBeVisible();
  const finalEvent = await (
    await late.request.get("http://localhost:4207/api/event")
  ).json();
  expect(finalEvent.me.vote).toBeNull();
  expect(
    finalEvent.guests.filter((guest: { vote: string | null }) => guest.vote),
  ).toHaveLength(2);
  await expect(tv.getByText("A wish just for the parents")).toHaveCount(0);
  await setup.getByRole("button", { name: "Refresh notes" }).click();
  await expect(setup.getByText("A wish just for the parents")).toBeVisible();
  await late.close();
  await rightGuess.close();
  await expect(
    tv.getByText("THE SECRET IS OUT", { exact: true }),
  ).toBeVisible();
  expect(errors).toEqual([]);
  await guest.close();
  await host.close();
});

test("dashboard fits narrow phones and a TV without horizontal overflow", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 768, height: 1024 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/");
    const reveal = page.getByRole("button", {
      name: "Join the celebration",
    });
    await expect(page.locator(".party-live")).toHaveText(
      /Voting is open|The secret is out/,
    );
    if (await reveal.isVisible()) await reveal.click();
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await page.screenshot({
      path: `test-results/dashboard-${viewport.width}.png`,
      fullPage: true,
    });
  }
});

test("focused scoreboard keeps the family forecast and voting QR together", async ({
  page,
}) => {
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/focused-scoreboard");
    await expect(
      page.getByRole("heading", { name: "The room has a hunch." }),
    ).toBeVisible();
    await expect(page.getByRole("img", { name: /Scan to open/ })).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
  }
});

test("host setup keeps the rehearsal prompt readable on desktop", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/host");

  const card = page.locator(".host-rehearsal-card");
  const copy = card.locator("div");
  const button = card.getByRole("link", { name: "Open rehearsal" });
  await expect(card).toBeVisible();
  await expect(button).toBeVisible();

  const [cardBox, copyBox, buttonBox] = await Promise.all([
    card.boundingBox(),
    copy.boundingBox(),
    button.boundingBox(),
  ]);
  expect(cardBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(copyBox!.width).toBeGreaterThan(300);
  expect(buttonBox!.width).toBeLessThan(cardBox!.width / 2);
  expect(cardBox!.height).toBeLessThan(240);
});

test("rehearsal controls and the sample celebration fit phones and tablets", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  for (const viewport of [
    { width: 320, height: 740 },
    { width: 768, height: 1024 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto("/rehearsal");
    await page
      .getByRole("button", { name: "Start rehearsal", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Stop rehearsal" }),
    ).toBeInViewport({ ratio: 1 });
    await page.getByRole("button", { name: "Stop rehearsal" }).click();
    await page
      .getByRole("button", { name: "Preview celebration screen" })
      .click();
    await expect(
      page.getByRole("heading", { name: "It’s a girl!" }),
    ).toBeVisible();
    const dimensions = await page.evaluate(() => ({
      content: document.documentElement.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(dimensions.content).toBeLessThanOrEqual(dimensions.viewport);
    await page.screenshot({
      path: `test-results/rehearsal-${viewport.width}.png`,
      fullPage: true,
    });
  }
});
