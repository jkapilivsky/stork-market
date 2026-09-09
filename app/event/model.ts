export type Gender = "boy" | "girl";

export const TALES = [
  {
    id: "cravings",
    title: "The cravings",
    symbol: "✦",
    girl: "Something sweet",
    boy: "Something salty",
    story: "The story goes: a sweet tooth means girl; salty cravings mean boy.",
  },
  {
    id: "bump",
    title: "The baby bump",
    symbol: "◡",
    girl: "Carrying high",
    boy: "Carrying low",
    story:
      "An old favorite: carrying high points to girl, carrying low to boy.",
  },
  {
    id: "heartbeat",
    title: "The heartbeat",
    symbol: "♡",
    girl: "Above 140 bpm",
    boy: "Below 140 bpm",
    story:
      "This tale puts a faster heartbeat on team girl and a slower one on team boy.",
  },
  {
    id: "ring",
    title: "The ring test",
    symbol: "◎",
    girl: "Swinging in circles",
    boy: "Swinging back & forth",
    story:
      "One version says a dangling ring circles for a girl and swings for a boy.",
  },
] as const;

export type TaleId = (typeof TALES)[number]["id"];
export type EventSettings = {
  babyName: string;
  parentsLabel: string;
  dateLabel: string;
  thankYouMessage?: string;
  tales: Record<TaleId, Gender | null>;
};
export type Guest = {
  id: string;
  name: string;
  message: string;
  shareMessage: boolean;
  vote: Gender | null;
  joinedAt: number;
  votedAt: number | null;
  celebrationNote?: string;
  shareCelebrationNote?: boolean;
};
export type PrivateGuest = Guest & { tokenHash: string };
export type PrivateEvent = {
  settings: EventSettings;
  guests: PrivateGuest[];
  secretResult: Gender | null;
  revealAt: number | null;
  hostAttempts: Record<string, { count: number; resetAt: number }>;
};
export type EventSnapshot = {
  settings: EventSettings;
  guests: Guest[];
  me: Guest | null;
  phase: "voting" | "countdown" | "revealed";
  revealAt: number | null;
  result: Gender | null;
  serverTime: number;
  revision: number;
  storage: "local" | "supabase";
};
export type HostSnapshot = {
  authenticated: boolean;
  configured: boolean;
  resultReady?: boolean;
  thankYouMessage?: string;
  privateNotes?: Pick<Guest, "id" | "name" | "message">[];
};

export const DEFAULT_THANK_YOU =
  "Thank you for every guess, every kind word, and all the love. We’re so happy you’re part of our little one’s story.";

export const DEFAULT_SETTINGS: EventSettings = {
  babyName: "Baby K",
  parentsLabel: "the parents-to-be",
  dateLabel: "October 10, 2026",
  thankYouMessage: DEFAULT_THANK_YOU,
  tales: { cravings: null, bump: null, heartbeat: null, ring: null },
};

export function createEvent(): PrivateEvent {
  return {
    settings: structuredClone(DEFAULT_SETTINGS),
    guests: [],
    secretResult: null,
    revealAt: null,
    hostAttempts: {},
  };
}

export class EventError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export function isGender(value: unknown): value is Gender {
  return value === "boy" || value === "girl";
}

function cleanText(
  value: unknown,
  label: string,
  max: number,
  required = false,
): string {
  if (typeof value !== "string") throw new EventError(`Please enter ${label}.`);
  const text = value.trim();
  if (required && !text) throw new EventError(`Please enter ${label}.`);
  if (text.length > max)
    throw new EventError(`${label} must be ${max} characters or fewer.`);
  return text;
}

function publicGuest(guest: PrivateGuest, own = false): Guest {
  return {
    id: guest.id,
    name: guest.name,
    message: own || guest.shareMessage ? guest.message : "",
    shareMessage: guest.shareMessage,
    vote: guest.vote,
    joinedAt: guest.joinedAt,
    votedAt: guest.votedAt,
    celebrationNote:
      own || guest.shareCelebrationNote ? guest.celebrationNote || "" : "",
    shareCelebrationNote: guest.shareCelebrationNote ?? false,
  };
}

export function snapshot(
  event: PrivateEvent,
  tokenHash: string | null,
  now: number,
  storage: EventSnapshot["storage"],
  revision = 0,
): EventSnapshot {
  const phase =
    event.revealAt === null
      ? "voting"
      : now < event.revealAt
        ? "countdown"
        : "revealed";
  const me = event.guests.find((guest) => guest.tokenHash === tokenHash);
  return {
    settings: {
      ...event.settings,
      // A parents’ thank-you may mention the answer. Keep it private until zero, too.
      thankYouMessage:
        phase === "revealed" ? event.settings.thankYouMessage : undefined,
    },
    guests: event.guests.map((guest) => publicGuest(guest)),
    me: me ? publicGuest(me, true) : null,
    phase,
    revealAt: event.revealAt,
    // Never put the answer in public responses before the server deadline.
    result: phase === "revealed" ? event.secretResult : null,
    serverTime: now,
    revision,
    storage,
  };
}

export function joinGuest(
  event: PrivateEvent,
  input: Record<string, unknown>,
  tokenHash: string,
  id: string,
  now: number,
): void {
  if (event.revealAt !== null)
    throw new EventError("Voting has closed. Join us for the reveal!", 409);
  const name = cleanText(input.name, "your name", 50, true);
  const message = cleanText(input.message ?? "", "your note", 500);
  if (typeof input.shareMessage !== "boolean")
    throw new EventError("Choose whether to share your note.");
  const existing = event.guests.find((guest) => guest.tokenHash === tokenHash);
  if (existing) {
    Object.assign(existing, {
      name,
      message,
      shareMessage: input.shareMessage,
    });
    return;
  }
  if (event.guests.length >= 1000)
    throw new EventError(
      "The guest book is full. Please let the hosts know.",
      409,
    );
  event.guests.push({
    id,
    tokenHash,
    name,
    message,
    shareMessage: input.shareMessage,
    vote: null,
    joinedAt: now,
    votedAt: null,
  });
}

export function castVote(
  event: PrivateEvent,
  tokenHash: string | null,
  vote: unknown,
  now: number,
): void {
  if (event.revealAt !== null)
    throw new EventError("Voting has closed. It’s almost time!", 409);
  if (!isGender(vote)) throw new EventError("Choose boy or girl.");
  const guest = event.guests.find((entry) => entry.tokenHash === tokenHash);
  if (!guest)
    throw new EventError("Add your name before making your pick.", 401);
  // Updating the existing guest keeps retries and changed picks to one vote.
  if (guest.vote !== vote) {
    guest.vote = vote;
    guest.votedAt = now;
  }
}

export function leaveCelebrationNote(
  event: PrivateEvent,
  input: Record<string, unknown>,
  tokenHash: string,
  id: string,
  now: number,
): void {
  if (event.revealAt === null || now < event.revealAt)
    throw new EventError("Final wishes open after the reveal.", 409);
  const message = cleanText(input.message, "your wish", 500, true);
  if (typeof input.shareMessage !== "boolean")
    throw new EventError("Choose whether to share your wish.");
  let guest = event.guests.find((entry) => entry.tokenHash === tokenHash);
  if (!guest) {
    const name = cleanText(input.name, "your name", 50, true);
    if (event.guests.length >= 1000)
      throw new EventError(
        "The guest book is full. Please let the hosts know.",
        409,
      );
    guest = {
      id,
      tokenHash,
      name,
      message: "",
      shareMessage: false,
      vote: null,
      votedAt: null,
      joinedAt: now,
    };
    event.guests.push(guest);
  }
  // A final wish preserves the original note and can never add or change a vote.
  guest.celebrationNote = message;
  guest.shareCelebrationNote = input.shareMessage;
}

export function configureEvent(
  event: PrivateEvent,
  input: Record<string, unknown>,
): void {
  if (event.revealAt !== null)
    throw new EventError(
      "Event settings are locked during and after the reveal.",
      409,
    );
  const settings = input.settings;
  if (!settings || typeof settings !== "object" || Array.isArray(settings))
    throw new EventError("Event details are missing.");
  const values = settings as Record<string, unknown>;
  const tales = values.tales as Record<string, unknown> | undefined;
  if (!tales || typeof tales !== "object" || Array.isArray(tales))
    throw new EventError("Please check the old wives’ tales.");
  const answers = {} as EventSettings["tales"];
  for (const tale of TALES) {
    const answer = tales[tale.id];
    if (answer !== null && !isGender(answer))
      throw new EventError("Please check the old wives’ tales.");
    answers[tale.id] = answer;
  }
  if (input.result !== undefined && !isGender(input.result))
    throw new EventError("Choose the reveal result.");
  event.settings = {
    babyName: cleanText(values.babyName, "the baby’s name", 40, true),
    parentsLabel: cleanText(
      values.parentsLabel,
      "the parents’ names",
      80,
      true,
    ),
    dateLabel: cleanText(values.dateLabel, "the event date", 60, true),
    thankYouMessage: cleanText(
      values.thankYouMessage ??
        event.settings.thankYouMessage ??
        DEFAULT_THANK_YOU,
      "the thank-you message",
      500,
    ),
    tales: answers,
  };
  if (isGender(input.result)) event.secretResult = input.result;
}

export function startReveal(event: PrivateEvent, now: number): void {
  if (!event.secretResult)
    throw new EventError("Set the reveal result in host setup first.", 409);
  if (event.revealAt !== null) return; // An accidental double click cannot restart the clock.
  event.revealAt = now + 10_000;
}

export function cancelReveal(event: PrivateEvent, now: number): void {
  if (event.revealAt === null) return;
  if (now >= event.revealAt)
    throw new EventError("The result has already been revealed.", 409);
  event.revealAt = null;
}

export function tally(guests: Guest[]) {
  const boy = guests.filter((guest) => guest.vote === "boy").length;
  const girl = guests.filter((guest) => guest.vote === "girl").length;
  const total = boy + girl;
  const boyPercent = total ? Math.round((boy / total) * 100) : 0;
  return {
    boy,
    girl,
    total,
    boyPercent,
    girlPercent: total ? 100 - boyPercent : 0,
  };
}
