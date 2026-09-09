"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_SETTINGS, type EventSnapshot } from "./model";

const EMPTY: EventSnapshot = {
  settings: DEFAULT_SETTINGS,
  guests: [],
  me: null,
  phase: "voting",
  revealAt: null,
  result: null,
  serverTime: 0,
  revision: -1,
  storage: "local",
};
type EventContextValue = {
  event: EventSnapshot;
  ready: boolean;
  connected: boolean;
  error: string;
  now: number;
  refresh: () => Promise<void>;
  submit: (body: Record<string, unknown>, host?: boolean) => Promise<void>;
};
const EventContext = createContext<EventContextValue | null>(null);

export async function api<T>(
  path: string,
  body?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(path, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "We couldn’t save that. Please try again.");
  return data;
}

export function EventProvider({ children }: { children: ReactNode }) {
  const [event, setEvent] = useState(EMPTY);
  const [ready, setReady] = useState(false);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const clockOffset = useRef(0);
  const latestServerTime = useRef(0);
  const latestRevision = useRef(-1);
  const mounted = useRef(true);
  const polling = useRef(false);

  const accept = useCallback((data: EventSnapshot) => {
    if (
      !mounted.current ||
      data.revision < latestRevision.current ||
      (data.revision === latestRevision.current &&
        data.serverTime < latestServerTime.current)
    )
      return;
    latestRevision.current = data.revision;
    latestServerTime.current = data.serverTime;
    clockOffset.current = data.serverTime - Date.now();
    setEvent(data);
    setNow(data.serverTime);
    setReady(true);
    setConnected(true);
    setError("");
  }, []);

  const refresh = useCallback(async () => {
    if (polling.current) return;
    polling.current = true;
    try {
      accept(await api<EventSnapshot>("/api/event"));
    } catch (error) {
      if (mounted.current) {
        setConnected(false);
        setError(
          error instanceof Error ? error.message : "Reconnecting to the party…",
        );
      }
    } finally {
      polling.current = false;
    }
  }, [accept]);

  useEffect(() => {
    mounted.current = true;
    const initial = setTimeout(() => {
      void refresh();
    }, 0);
    const poll = setInterval(() => {
      if (!document.hidden) void refresh();
    }, 2000);
    const resume = () => {
      if (!document.hidden) void refresh();
    };
    window.addEventListener("online", resume);
    window.addEventListener("focus", resume);
    document.addEventListener("visibilitychange", resume);
    return () => {
      mounted.current = false;
      clearTimeout(initial);
      clearInterval(poll);
      window.removeEventListener("online", resume);
      window.removeEventListener("focus", resume);
      document.removeEventListener("visibilitychange", resume);
    };
  }, [refresh]);

  useEffect(() => {
    if (event.phase !== "countdown") return;
    const tick = setInterval(() => {
      const time = Date.now() + clockOffset.current;
      setNow(time);
      // Fetch the answer only after the countdown. It is never stored in the browser early.
      if (event.revealAt !== null && time >= event.revealAt) void refresh();
    }, 200);
    return () => clearInterval(tick);
  }, [event.phase, event.revealAt, refresh]);

  const submit = useCallback(
    async (body: Record<string, unknown>, host = false) => {
      try {
        accept(
          await api<EventSnapshot>(host ? "/api/host" : "/api/event", body),
        );
      } catch (error) {
        void refresh();
        throw error;
      }
    },
    [accept, refresh],
  );

  return (
    <EventContext.Provider
      value={{ event, ready, connected, error, now, refresh, submit }}
    >
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) throw new Error("EventProvider is required");
  return context;
}
