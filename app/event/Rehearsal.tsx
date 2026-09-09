"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CelebrationScreen } from "./Celebration";
import { Flower } from "./EventShell";
import { RevealPresentation } from "./Reveal";
import { DEFAULT_SETTINGS, tally, type Gender, type Guest } from "./model";

// Deliberately independent of EventProvider, cookies, storage, and the event API.
const SAMPLE_GUESTS: Guest[] = [
  [
    "Auntie Sarah",
    "girl",
    "May your days be full of wonder, your home full of laughter, and your little heart full of love.",
  ],
  ["Uncle James", "boy", "We can’t wait for all the adventures ahead."],
  ["Grandma", "girl", "There’s already a special place for you in our hearts."],
  ["Grandpa", "boy", "A whole family of love is waiting for you."],
  ["Mia", "girl", "You picked the sweetest parents, little one."],
  ["Daniel", "boy", "Here’s to tiny fingers and a very big adventure."],
  ["Sophie", "girl", ""],
  ["Oliver", "boy", ""],
  ["Emma", "girl", ""],
  ["Theo", "girl", ""],
  ["Lily", "boy", ""],
  ["Noah", "girl", ""],
].map(([name, vote, message], index) => ({
  id: `sample-${index}`,
  name,
  vote: vote as Gender,
  message,
  shareMessage: true,
  joinedAt: index,
  votedAt: index,
}));

type Stage = "setup" | "countdown" | "revealed" | "celebration";

export function RehearsalPage() {
  const [result, setResult] = useState<Gender>("girl");
  const [stage, setStage] = useState<Stage>("setup");
  const [deadline, setDeadline] = useState(0);
  const [remaining, setRemaining] = useState(10);
  const [fullscreenError, setFullscreenError] = useState("");

  useEffect(() => {
    if (stage !== "countdown") return;
    const tick = () => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) setStage("revealed");
    };
    const timer = setInterval(tick, 100);
    return () => clearInterval(timer);
  }, [stage, deadline]);
  useEffect(() => {
    if (stage !== "revealed") return;
    const timer = setTimeout(() => setStage("celebration"), 12_000);
    return () => clearTimeout(timer);
  }, [stage]);

  function start() {
    setRemaining(10);
    setDeadline(Date.now() + 10_000);
    setStage("countdown");
  }
  async function fullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError(
        "Use your browser’s full-screen option to fill the TV.",
      );
    }
  }
  return (
    <div className="party party-rehearsal">
      <header className="party-header rehearsal-header">
        <Link
          className="party-brand"
          href="/host"
          prefetch={false}
          aria-label="Return to host setup"
        >
          <Flower />
          <span>
            stork<span className="brand-light">market</span>
            <small>A LITTLE GUESS. A LOT OF LOVE.</small>
          </span>
        </Link>
        <span className="rehearsal-badge">
          REHEARSAL <span>· SAMPLE EVENT</span>
        </span>
        <div className="rehearsal-header-actions">
          <button
            className="party-icon-button"
            onClick={() => void fullscreen()}
            aria-label="Toggle full screen"
          >
            ⛶
          </button>
          <Link className="party-text-link" href="/host" prefetch={false}>
            Exit rehearsal ↗
          </Link>
        </div>
      </header>
      {fullscreenError && (
        <p className="party-connection" role="status">
          {fullscreenError}
        </p>
      )}
      <main id="party-content">
        {stage === "setup" ? (
          <section
            className="rehearsal-setup"
            aria-labelledby="rehearsal-title"
          >
            <div className="rehearsal-copy">
              <span className="party-eyebrow">
                A PRACTICE RUN FOR THE BIG LITTLE MOMENT
              </span>
              <h1 id="rehearsal-title">
                All the butterflies.
                <br />
                <em>A little practice.</em>
              </h1>
              <p>
                Try the countdown, the confetti, and the celebration before
                everyone arrives.
              </p>
              <div className="rehearsal-assurance">
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>Your real celebration stays just as it is.</strong>
                  <span>
                    This preview uses sample guests and your choice of sample
                    result. It plays on this screen only.
                  </span>
                </div>
              </div>
              <ol className="rehearsal-steps">
                <li>
                  <span>01</span>Gather round
                </li>
                <li>
                  <span>02</span>The big reveal
                </li>
                <li>
                  <span>03</span>Keep celebrating
                </li>
              </ol>
            </div>
            <div className="party-card rehearsal-controls">
              <Flower />
              <span className="party-eyebrow">LET’S TRY IT OUT</span>
              <h2>Pick a sample surprise.</h2>
              <fieldset className="rehearsal-options">
                <legend className="sr-only">Sample reveal result</legend>
                {(["boy", "girl"] as const).map((gender) => (
                  <label
                    className={`is-${gender} ${result === gender ? "is-selected" : ""}`}
                    key={gender}
                  >
                    <input
                      type="radio"
                      name="sample-result"
                      value={gender}
                      checked={result === gender}
                      onChange={() => setResult(gender)}
                    />
                    <span aria-hidden="true">
                      {gender === "boy" ? "✦" : "✿"}
                    </span>
                    Sample {gender}
                  </label>
                ))}
              </fieldset>
              <p className="host-hint">This choice is only for practice.</p>
              <button className="party-button" onClick={start}>
                Start rehearsal <span aria-hidden="true">→</span>
              </button>
              <button
                className="party-text-link"
                onClick={() => setStage("celebration")}
              >
                Preview celebration screen ↗
              </button>
            </div>
          </section>
        ) : (
          <>
            <div className="rehearsal-toolbar">
              <span>Sample guests · Sample {result} result</span>
              <div>
                <button
                  className="party-button party-button-secondary"
                  onClick={() => setStage("setup")}
                >
                  Change sample result
                </button>
                <button className="party-button" onClick={start}>
                  Replay rehearsal <span aria-hidden="true">↻</span>
                </button>
              </div>
            </div>
            <CelebrationScreen
              key={result}
              event={{
                settings: DEFAULT_SETTINGS,
                guests: SAMPLE_GUESTS,
                me: null,
                result,
              }}
              rehearsal
              invitation={
                <aside className="celebration-write-card rehearsal-invitation">
                  <Flower />
                  <span className="party-eyebrow">AFTER THE BIG REVEAL</span>
                  <h2>
                    The love
                    <br />
                    <em>keeps going.</em>
                  </h2>
                  <p>
                    At the real event, a QR code invites guests to leave a final
                    wish for Baby K and the parents.
                  </p>
                  <span className="rehearsal-badge">SAMPLE GUESTS & NOTES</span>
                </aside>
              }
            />
          </>
        )}
        {(stage === "countdown" || stage === "revealed") && (
          <RevealPresentation
            babyName={DEFAULT_SETTINGS.babyName}
            result={stage === "revealed" ? result : null}
            counts={tally(SAMPLE_GUESTS)}
            remaining={remaining}
            rehearsal
            onContinue={() => setStage("celebration")}
            onStop={() => setStage("setup")}
          />
        )}
      </main>
      <footer className="party-footer">
        <span>
          A practice run for Baby K <span aria-hidden="true">♡</span>
        </span>
        <span>Sample results only · Replay as often as you like</span>
      </footer>
    </div>
  );
}
