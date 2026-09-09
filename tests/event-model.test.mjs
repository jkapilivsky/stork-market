import assert from "node:assert/strict";
import { test } from "node:test";
import {
  castVote,
  cancelReveal,
  configureEvent,
  createEvent,
  joinGuest,
  leaveCelebrationNote,
  snapshot,
  startReveal,
  tally,
} from "../app/event/model.ts";

const join = (event, token = "guest-token", shareMessage = true) =>
  joinGuest(
    event,
    { name: "Auntie Sarah", message: "We love you already!", shareMessage },
    token,
    `guest-${event.guests.length}`,
    1000,
  );

test("a returning guest and repeated submissions remain one person and one vote", () => {
  const event = createEvent();
  join(event);
  join(event);
  castVote(event, "guest-token", "boy", 2000);
  castVote(event, "guest-token", "boy", 3000);
  assert.equal(event.guests.length, 1);
  assert.equal(event.guests[0].votedAt, 2000);
  castVote(event, "guest-token", "girl", 4000);
  assert.deepEqual(tally(event.guests), {
    boy: 0,
    girl: 1,
    total: 1,
    boyPercent: 0,
    girlPercent: 100,
  });
});

test("parents’ thank-you stays private until the reveal and survives older settings payloads", () => {
  const event = createEvent();
  const message = "Our little girl is so loved!";
  configureEvent(event, {
    settings: { ...event.settings, thankYouMessage: message },
    result: "girl",
  });
  const olderSettings = { ...event.settings };
  delete olderSettings.thankYouMessage;
  configureEvent(event, { settings: olderSettings });
  assert.equal(event.settings.thankYouMessage, message);
  assert.doesNotMatch(
    JSON.stringify(snapshot(event, null, 1, "local")),
    /Our little girl/,
  );
  startReveal(event, 1000);
  assert.equal(
    snapshot(event, null, 10999, "local").settings.thankYouMessage,
    undefined,
  );
  assert.equal(
    snapshot(event, null, 11000, "local").settings.thankYouMessage,
    message,
  );
  const fresh = createEvent();
  assert.throws(
    () =>
      configureEvent(fresh, {
        settings: { ...fresh.settings, thankYouMessage: "x".repeat(501) },
      }),
    /500/,
  );
});

test("final wishes preserve votes and original notes, honor privacy, and accept late guests without a vote", () => {
  const event = createEvent();
  join(event);
  castVote(event, "guest-token", "boy", 1500);
  const before = tally(event.guests);
  const wish = {
    name: "A different name",
    message: "A private final wish",
    shareMessage: false,
    vote: "girl",
  };
  assert.throws(
    () => leaveCelebrationNote(event, wish, "guest-token", "unused", 2000),
    /after the reveal/,
  );
  event.secretResult = "girl";
  startReveal(event, 2000);
  assert.throws(
    () => leaveCelebrationNote(event, wish, "guest-token", "unused", 11999),
    /after the reveal/,
  );
  leaveCelebrationNote(event, wish, "guest-token", "unused", 12000);
  assert.equal(event.guests[0].name, "Auntie Sarah");
  assert.equal(event.guests[0].message, "We love you already!");
  assert.equal(
    snapshot(event, null, 12000, "local").guests[0].celebrationNote,
    "",
  );
  assert.equal(
    snapshot(event, "guest-token", 12000, "local").me.celebrationNote,
    wish.message,
  );
  leaveCelebrationNote(
    event,
    { ...wish, message: "A shared final wish", shareMessage: true },
    "guest-token",
    "unused",
    12001,
  );
  assert.equal(
    snapshot(event, null, 12001, "local").guests[0].celebrationNote,
    "A shared final wish",
  );
  const lateWish = {
    name: "Late guest",
    message: "So happy for you!",
    shareMessage: true,
    vote: "girl",
  };
  leaveCelebrationNote(event, lateWish, "late-token", "late-id", 12002);
  leaveCelebrationNote(event, lateWish, "late-token", "unused", 12003);
  assert.equal(event.guests.length, 2);
  assert.equal(event.guests[1].vote, null);
  assert.equal(event.guests[1].votedAt, null);
  assert.deepEqual(tally(event.guests), before);
  assert.throws(
    () => castVote(event, "late-token", "girl", 12003),
    /Voting has closed/,
  );
});

test("invalid final wishes do not create guests or overwrite saved messages", () => {
  const event = createEvent();
  event.secretResult = "boy";
  startReveal(event, 0);
  const valid = { name: "Guest", message: "Lots of love", shareMessage: true };
  for (const invalid of [
    { message: " " },
    { name: " " },
    { message: "x".repeat(501) },
    { name: "x".repeat(51) },
    { shareMessage: "true" },
  ]) {
    assert.throws(() =>
      leaveCelebrationNote(
        event,
        { ...valid, ...invalid },
        "token",
        "id",
        10000,
      ),
    );
    assert.equal(event.guests.length, 0);
  }
});

test("the public snapshot never contains secrets or private notes", () => {
  const event = createEvent();
  join(event, "secret-guest-token", false);
  event.secretResult = "girl";
  event.hostAttempts.ip = { count: 3, resetAt: 100000 };
  const publicView = snapshot(event, null, 2000, "local");
  assert.equal(publicView.guests[0].message, "");
  assert.equal(publicView.result, null);
  assert.equal(publicView.me, null);
  assert.doesNotMatch(
    JSON.stringify(publicView),
    /secret-guest-token|secretResult|hostAttempts|We love you already/,
  );
  assert.equal(
    snapshot(event, "secret-guest-token", 2000, "local").me.message,
    "We love you already!",
  );
});

test("the answer is withheld through the final millisecond and late voters are rejected", () => {
  const event = createEvent();
  join(event);
  assert.throws(() => startReveal(event, 2000), /Set the reveal result/);
  event.secretResult = "boy";
  startReveal(event, 2000);
  startReveal(event, 3000);
  assert.equal(event.revealAt, 12000);
  assert.equal(snapshot(event, null, 11999, "local").result, null);
  assert.equal(snapshot(event, null, 11999, "local").phase, "countdown");
  assert.equal(snapshot(event, null, 12000, "local").result, "boy");
  assert.equal(snapshot(event, null, 12000, "local").phase, "revealed");
  assert.throws(
    () => castVote(event, "guest-token", "girl", 2001),
    /Voting has closed/,
  );
  assert.throws(() => join(event, "late-guest"), /Voting has closed/);
  assert.throws(
    () => configureEvent(event, { settings: event.settings, result: "girl" }),
    /locked/,
  );
  assert.throws(() => cancelReveal(event, 12000), /already been revealed/);
});

test("stopping an unfinished countdown reopens voting without removing guest notes", () => {
  const event = createEvent();
  join(event);
  event.secretResult = "girl";
  startReveal(event, 2000);
  cancelReveal(event, 4000);
  castVote(event, "guest-token", "girl", 5000);
  assert.equal(event.revealAt, null);
  assert.equal(event.guests[0].message, "We love you already!");
  startReveal(event, 6000);
  assert.equal(event.revealAt, 16000);
});

test("input validation rejects blank names, long messages, unknown picks, and unauthenticated votes", () => {
  const event = createEvent();
  assert.throws(
    () => joinGuest(event, { name: "  ", shareMessage: true }, "a", "a", 1),
    /your name/,
  );
  assert.throws(
    () =>
      joinGuest(
        event,
        { name: "Guest", message: "x".repeat(501), shareMessage: true },
        "a",
        "a",
        1,
      ),
    /500/,
  );
  assert.throws(() => castVote(event, null, "boy", 1), /Add your name/);
  assert.throws(() => castVote(event, null, "banana", 1), /Choose boy or girl/);
  assert.equal(event.guests.length, 0);
});

test("host settings validate tales and keep a previously saved result when editing public details", () => {
  const event = createEvent();
  const settings = {
    ...event.settings,
    babyName: "Baby K",
    tales: { cravings: "girl", bump: "boy", heartbeat: null, ring: null },
  };
  configureEvent(event, { settings, result: "girl" });
  configureEvent(event, {
    settings: { ...settings, parentsLabel: "Jess & Alex" },
  });
  assert.equal(event.secretResult, "girl");
  assert.equal(event.settings.parentsLabel, "Jess & Alex");
  assert.throws(
    () =>
      configureEvent(event, {
        settings: { ...settings, tales: { ...settings.tales, ring: "oops" } },
      }),
    /old wives/,
  );
});
