"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useEvent } from "./EventProvider";

export function Flower({ className = "" }: { className?: string }) {
  return (
    <span className={`party-flower ${className}`} aria-hidden="true">
      <i />
      <i />
      <i />
      <i />
      <b />
    </span>
  );
}

export function EventShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { event, ready, connected, error, refresh } = useEvent();
  const [fullscreen, setFullscreen] = useState(false);
  const [screenError, setScreenError] = useState("");
  const dashboard = pathname === "/" || pathname === "/dashboard";

  useEffect(() => {
    const changed = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, []);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        setScreenError("Use your browser’s full-screen option to fill the TV.");
    } catch {
      setScreenError("Use your browser’s full-screen option to fill the TV.");
    }
  }

  return (
    <div className={`party ${dashboard ? "party-dashboard" : "party-guest"}`}>
      <a className="party-skip" href="#party-content">
        Skip to content
      </a>
      <header className="party-header">
        <Link className="party-brand" href="/" aria-label="Stork Market home">
          <Flower />
          <span>
            stork<span className="brand-light">market</span>
            <small>A LITTLE GUESS. A LOT OF LOVE.</small>
          </span>
        </Link>
        <nav className="party-nav" aria-label="Primary navigation">
          <Link href="/" aria-current={dashboard ? "page" : undefined}>
            The big screen
          </Link>
          <Link
            href={event.phase === "revealed" ? "/celebration" : "/vote"}
            aria-current={
              pathname === "/vote" || pathname === "/celebration"
                ? "page"
                : undefined
            }
          >
            {event.phase === "revealed"
              ? "Join the celebration"
              : "Make your guess"}{" "}
            <span aria-hidden="true">↗</span>
          </Link>
        </nav>
        <div className="party-header-end">
          <span
            className={`party-live ${!connected ? "is-offline" : ""}`}
            role="status"
          >
            <i />
            {!ready
              ? "Connecting"
              : !connected
                ? "Reconnecting"
                : event.phase === "voting"
                  ? "Voting is open"
                  : event.phase === "countdown"
                    ? "It’s time!"
                    : "The secret is out"}
          </span>
          {dashboard && (
            <button
              type="button"
              className="party-icon-button fullscreen-button"
              onClick={toggleFullscreen}
              aria-label={fullscreen ? "Exit full screen" : "Enter full screen"}
              title={fullscreen ? "Exit full screen" : "TV full screen"}
            >
              ⛶
            </button>
          )}
        </div>
      </header>
      {error && (
        <div className="party-connection" role="status">
          <span>
            {ready
              ? "Connection interrupted. Your last updates are still here."
              : error}
          </span>
          <button onClick={() => void refresh()}>Try again</button>
        </div>
      )}
      {screenError && (
        <div className="party-connection" role="status">
          {screenError}
          <button onClick={() => setScreenError("")}>Dismiss</button>
        </div>
      )}
      <main id="party-content">{children}</main>
      <footer className="party-footer">
        <span>
          Made with love for {event.settings.babyName}{" "}
          <span aria-hidden="true">♡</span>
        </span>
        <Link href="/host">
          Host setup <span aria-hidden="true">↗</span>
        </Link>
      </footer>
    </div>
  );
}
