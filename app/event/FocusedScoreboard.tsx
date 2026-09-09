"use client";

import Link from "next/link";
import { FamilyForecast } from "./Dashboard";
import { useEvent } from "./EventProvider";
import { HostControls } from "./HostControls";
import { QRCard } from "./QRCard";
import { Reveal } from "./Reveal";

export function FocusedScoreboard() {
  const { event } = useEvent();

  return (
    <>
      <section className="focused-scoreboard-intro">
        <div>
          <span className="party-eyebrow">LIVE FROM THE PARTY</span>
          <h1>The room has a hunch.</h1>
        </div>
        <div className="focused-scoreboard-intro-copy">
          <p>
            {event.settings.babyName} is keeping everyone guessing. The answer
            stays secret until the big reveal.
          </p>
          <Link href="/" className="party-text-link">
            View the original dashboard ↗
          </Link>
        </div>
      </section>

      <div className="focused-scoreboard-layout">
        <FamilyForecast className="focused-forecast-card" />
        <QRCard />
      </div>

      <div className="party-host-bar focused-scoreboard-host-bar">
        <span>
          <span aria-hidden="true">✦</span> One sweet question. One room full
          of guesses.
        </span>
        <HostControls />
      </div>
      <Reveal />
    </>
  );
}
