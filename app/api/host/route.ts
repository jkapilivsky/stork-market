import { NextRequest } from "next/server";
import {
  cancelReveal,
  configureEvent,
  EventError,
  snapshot,
  startReveal,
} from "../../event/model";
import { readEvent, storageMode, updateEvent } from "../../event/server/store";
import {
  assertSameOrigin,
  checkHostLogin,
  clearHostCookie,
  errorResponse,
  guestToken,
  hostConfigured,
  isHost,
  json,
  readBody,
  requireHost,
  setHostCookie,
} from "../../event/server/security";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    if (!isHost(request))
      return json({ authenticated: false, configured: hostConfigured });
    const { state } = await readEvent();
    return json({
      authenticated: true,
      configured: hostConfigured,
      resultReady: Boolean(state.secretResult),
      thankYouMessage: state.settings.thankYouMessage,
      privateNotes: state.guests.flatMap((guest) => [
        ...(!guest.shareMessage && guest.message
          ? [{ id: guest.id, name: guest.name, message: guest.message }]
          : []),
        ...(!guest.shareCelebrationNote && guest.celebrationNote
          ? [
              {
                id: `${guest.id}-wish`,
                name: guest.name,
                message: guest.celebrationNote,
              },
            ]
          : []),
      ]),
    });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const body = await readBody(request);
    if (body.action === "login") {
      await checkHostLogin(request, body.pin);
      const response = json({ ok: true });
      setHostCookie(response, request);
      return response;
    }
    requireHost(request);
    if (body.action === "logout") {
      const response = json({ ok: true });
      clearHostCookie(response, request);
      return response;
    }
    const { tokenHash } = guestToken(request);
    const result = await updateEvent((event, revision) => {
      if (body.action === "configure") configureEvent(event, body);
      else if (body.action === "start") startReveal(event, Date.now());
      else if (body.action === "cancel") cancelReveal(event, Date.now());
      else throw new EventError("That host action isn’t available.");
      return snapshot(event, tokenHash, Date.now(), storageMode, revision + 1);
    });
    return json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
