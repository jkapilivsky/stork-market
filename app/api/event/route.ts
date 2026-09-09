import { randomUUID } from "node:crypto";
import { NextRequest } from "next/server";
import {
  castVote,
  EventError,
  joinGuest,
  leaveCelebrationNote,
  snapshot,
} from "../../event/model";
import { readEvent, storageMode, updateEvent } from "../../event/server/store";
import {
  assertSameOrigin,
  errorResponse,
  guestToken,
  json,
  readBody,
  setGuestCookie,
} from "../../event/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { token, tokenHash } = guestToken(request);
    const { state, revision } = await readEvent();
    const response = json(
      snapshot(state, tokenHash, Date.now(), storageMode, revision),
    );
    // Establish identity before joining so a lost submission response can be retried safely.
    setGuestCookie(response, request, token);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readBody(request);
    const { token, tokenHash } = guestToken(request);
    const result = await updateEvent((event, revision) => {
      if (body.action === "join")
        joinGuest(event, body, tokenHash, randomUUID(), Date.now());
      else if (body.action === "vote")
        castVote(event, tokenHash, body.vote, Date.now());
      else if (body.action === "wish")
        leaveCelebrationNote(event, body, tokenHash, randomUUID(), Date.now());
      else throw new EventError("That action isn’t available.");
      return snapshot(event, tokenHash, Date.now(), storageMode, revision + 1);
    });
    const response = json(result);
    setGuestCookie(response, request, token);
    return response;
  } catch (error) {
    return errorResponse(error);
  }
}
