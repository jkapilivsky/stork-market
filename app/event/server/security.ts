import "server-only";
import {
  createHash,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { EventError } from "../model.ts";
import { updateEvent } from "./store.ts";

const GUEST_COOKIE = "stork_guest";
const HOST_COOKIE = "stork_host";
const pin = process.env.STORK_HOST_PIN;
const signingKey = process.env.STORK_SESSION_SECRET || pin;
export const hostConfigured = Boolean(pin && pin.length >= 6 && signingKey);
const eventSlug = process.env.NEXT_PUBLIC_STORK_EVENT_SLUG || "baby-k";
const hash = (value: string) =>
  createHash("sha256").update(value).digest("hex");

function safeEqual(left: string, right: string) {
  return timingSafeEqual(Buffer.from(hash(left)), Buffer.from(hash(right)));
}

export function guestToken(request: NextRequest) {
  const cookie = request.cookies.get(GUEST_COOKIE)?.value;
  const token =
    cookie && /^[a-f0-9]{64}$/.test(cookie)
      ? cookie
      : randomBytes(32).toString("hex");
  return { token, tokenHash: hash(token) };
}

function cookieOptions(request: NextRequest, maxAge: number) {
  return {
    httpOnly: true,
    secure:
      request.nextUrl.protocol === "https:" || Boolean(process.env.VERCEL),
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}

export function setGuestCookie(
  response: NextResponse,
  request: NextRequest,
  token: string,
) {
  response.cookies.set(
    GUEST_COOKIE,
    token,
    cookieOptions(request, 60 * 60 * 24 * 120),
  );
}

function signature(payload: string) {
  return createHmac("sha256", signingKey || "unconfigured")
    .update(`${eventSlug}:${payload}`)
    .digest("hex");
}

export function isHost(request: NextRequest): boolean {
  if (!hostConfigured) return false;
  const value = request.cookies.get(HOST_COOKIE)?.value;
  if (!value) return false;
  const [expires, signed, extra] = value.split(".");
  if (
    extra ||
    !expires ||
    !signed ||
    !/^\d+$/.test(expires) ||
    Number(expires) <= Date.now()
  )
    return false;
  return safeEqual(signed, signature(expires));
}

export function requireHost(request: NextRequest) {
  if (!isHost(request))
    throw new EventError("Enter the host passcode to continue.", 401);
}

export async function checkHostLogin(
  request: NextRequest,
  enteredPin: unknown,
) {
  if (!hostConfigured)
    throw new EventError(
      "Host access hasn’t been set up yet. Add STORK_HOST_PIN (at least 6 characters) to the server environment.",
      503,
    );
  // Persistent limits work across serverless instances. Unknown/self-hosted IPs share a bucket.
  const ip = process.env.VERCEL
    ? request.headers.get("x-vercel-forwarded-for") || "unknown"
    : "local";
  const bucket = hash(ip);
  const allowed = await updateEvent((event) => {
    const now = Date.now();
    for (const [key, value] of Object.entries(event.hostAttempts))
      if (value.resetAt <= now) delete event.hostAttempts[key];
    const attempt = event.hostAttempts[bucket] || {
      count: 0,
      resetAt: now + 15 * 60_000,
    };
    if (attempt.count >= 8) return false;
    attempt.count++;
    event.hostAttempts[bucket] = attempt;
    return true;
  });
  if (!allowed)
    throw new EventError(
      "Too many attempts. Please try again in 15 minutes.",
      429,
    );
  if (typeof enteredPin !== "string" || !safeEqual(enteredPin, pin!))
    throw new EventError("That passcode doesn’t match. Please try again.", 401);
  await updateEvent((event) => {
    delete event.hostAttempts[bucket];
  });
}

export function setHostCookie(response: NextResponse, request: NextRequest) {
  const expires = String(Date.now() + 12 * 60 * 60_000);
  response.cookies.set(
    HOST_COOKIE,
    `${expires}.${signature(expires)}`,
    cookieOptions(request, 12 * 60 * 60),
  );
}

export function clearHostCookie(response: NextResponse, request: NextRequest) {
  response.cookies.set(HOST_COOKIE, "", cookieOptions(request, 0));
}

export function assertSameOrigin(request: NextRequest) {
  const origin = request.headers.get("origin");
  if (!origin)
    throw new EventError("Please submit this form from the event page.", 403);
  const configured = process.env.NEXT_PUBLIC_STORK_SITE_URL;
  // Next may construct nextUrl with its bind address (0.0.0.0) on a LAN preview.
  // Browsers cannot change Host independently of the origin they're submitting to.
  const requestHost = request.headers.get("host");
  const requestOrigin = requestHost
    ? `${request.nextUrl.protocol}//${requestHost}`
    : request.nextUrl.origin;
  const allowed = [
    requestOrigin,
    ...(configured ? [new URL(configured).origin] : []),
  ];
  if (!allowed.includes(origin))
    throw new EventError("This request didn’t come from the event page.", 403);
}

export async function readBody(
  request: NextRequest,
): Promise<Record<string, unknown>> {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new EventError("Please send a valid form.", 415);
  if (Number(request.headers.get("content-length")) > 16_384)
    throw new EventError("This message is too long.", 413);
  const reader = request.body?.getReader();
  if (!reader) throw new EventError("Please send a valid form.");
  let text = "";
  let size = 0;
  const decoder = new TextDecoder();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 16_384) {
      await reader.cancel();
      throw new EventError("This message is too long.", 413);
    }
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode();
  try {
    const body = JSON.parse(text);
    if (!body || typeof body !== "object" || Array.isArray(body))
      throw new Error();
    return body;
  } catch {
    throw new EventError("Please send a valid form.");
  }
}

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      Vary: "Cookie",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function errorResponse(error: unknown) {
  return json(
    {
      error:
        error instanceof EventError
          ? error.message
          : "Something went wrong. Please try again.",
    },
    error instanceof EventError ? error.status : 500,
  );
}
