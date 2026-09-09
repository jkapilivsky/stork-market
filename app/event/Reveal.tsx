"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { api, useEvent } from "./EventProvider";
import { Flower } from "./EventShell";
import { Modal } from "./Modal";
import { tally, type Gender, type HostSnapshot } from "./model";

export function Reveal() {
  const { event, now, connected, submit } = useEvent();
  const [activeRevealAt, setActiveRevealAt] = useState<number | null>(null);
  // Only screens that watched this countdown play the announcement. Returning
  // guests and refreshed pages go straight to the lasting celebration screen.
  if (event.phase === "countdown" && event.revealAt !== activeRevealAt)
    setActiveRevealAt(event.revealAt);
  const playingResult =
    event.phase === "revealed" &&
    activeRevealAt !== null &&
    activeRevealAt === event.revealAt;
  useEffect(() => {
    if (!playingResult) return;
    const timer = setTimeout(() => setActiveRevealAt(null), 12_000);
    return () => clearTimeout(timer);
  }, [playingResult]);
  const [host, setHost] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (event.phase !== "countdown") return;
    let active = true;
    api<HostSnapshot>("/api/host")
      .then((status) => {
        if (active) setHost(status.authenticated);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [event.phase]);
  async function stop() {
    setStopping(true);
    setError("");
    try {
      await submit({ action: "cancel" }, true);
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Couldn’t stop the countdown.",
      );
    } finally {
      setStopping(false);
    }
  }
  const counts = tally(event.guests);
  if (
    event.phase === "voting" ||
    (event.phase === "revealed" && !playingResult)
  )
    return null;
  const remaining = event.revealAt
    ? Math.max(0, Math.ceil((event.revealAt - now) / 1000))
    : 10;
  return (
    <RevealPresentation
      babyName={event.settings.babyName}
      result={event.phase === "revealed" ? event.result : null}
      counts={counts}
      remaining={remaining}
      connected={connected}
      onContinue={() => setActiveRevealAt(null)}
      onStop={host ? () => void stop() : undefined}
      stopping={stopping}
      error={error}
    />
  );
}

export function RevealPresentation({
  babyName,
  result,
  counts,
  remaining,
  connected = true,
  onContinue,
  onStop,
  stopping = false,
  error = "",
  rehearsal = false,
}: {
  babyName: string;
  result: Gender | null;
  counts: ReturnType<typeof tally>;
  remaining: number;
  connected?: boolean;
  onContinue: () => void;
  onStop?: () => void;
  stopping?: boolean;
  error?: string;
  rehearsal?: boolean;
}) {
  const revealed = Boolean(result);
  return (
    <Modal
      title={revealed ? `It’s a ${result}!` : "The big reveal"}
      className={`party-reveal ${revealed ? `is-${result}` : ""}`}
      onClose={revealed ? onContinue : undefined}
    >
      {rehearsal && (
        <span className="rehearsal-ribbon">REHEARSAL · SAMPLE RESULT</span>
      )}
      {revealed && (
        <div className="party-confetti" aria-hidden="true">
          {Array.from({ length: 48 }, (_, index) => (
            <i
              key={index}
              style={
                {
                  "--x": `${(index * 37) % 100}%`,
                  "--delay": `${(index % 9) * -0.7}s`,
                  "--rotation": `${index * 53}deg`,
                  "--color": [
                    "#9eb9a0",
                    "#edc689",
                    "#e8aaa2",
                    "#9abacc",
                    "#faf4dd",
                  ][index % 5],
                } as CSSProperties
              }
            />
          ))}
        </div>
      )}
      <div className="party-reveal-content">
        <Flower />
        <span className="party-eyebrow">
          {revealed ? "THE LITTLE SECRET IS OUT" : "EVERYONE, GATHER ROUND"}
        </span>
        {revealed ? (
          <>
            <h1>
              It’s a <em>{result}!</em>
            </h1>
            <p>{babyName}, you are already so loved.</p>
            <span className="reveal-team">
              {counts.total
                ? `${counts[result!]} of ${counts.total} guests guessed it!`
                : "Let the happy tears begin."}
            </span>
            <button className="party-button" onClick={onContinue}>
              Join the celebration <span aria-hidden="true">♡</span>
            </button>
            <small className="reveal-next">
              The celebration opens automatically in a moment.
            </small>
          </>
        ) : (
          <>
            <h1>
              A little closer to
              <br />
              meeting you.
            </h1>
            <div
              className="reveal-number"
              key={remaining}
              role="timer"
              aria-live="polite"
              aria-atomic="true"
            >
              {remaining > 0 ? remaining : <span>Here we go…</span>}
            </div>
            <p>
              {remaining > 0
                ? "The sweetest surprise is almost here."
                : connected
                  ? "Opening our little secret…"
                  : "Reconnecting for the big reveal…"}
            </p>
            {onStop && remaining > 0 && (
              <button
                className="party-button party-button-secondary"
                disabled={stopping || !connected}
                onClick={onStop}
              >
                {stopping
                  ? "Stopping…"
                  : rehearsal
                    ? "Stop rehearsal"
                    : "Stop countdown"}
              </button>
            )}
            {error && (
              <p className="party-error" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
