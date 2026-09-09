"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, useEvent } from "./EventProvider";
import { Flower } from "./EventShell";
import { Modal } from "./Modal";
import {
  TALES,
  DEFAULT_THANK_YOU,
  type EventSettings,
  type Gender,
  type HostSnapshot,
} from "./model";

function useHostAccess() {
  const [host, setHost] = useState<HostSnapshot | null>(null);
  const [error, setError] = useState("");
  const reload = useCallback(async () => {
    try {
      setHost(await api<HostSnapshot>("/api/host"));
      setError("");
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Host access could not be checked.",
      );
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    return () => clearTimeout(timer);
  }, [reload]);
  return { host, reload, error };
}

function HostLogin({
  host,
  onLogin,
}: {
  host: HostSnapshot | null;
  onLogin: () => Promise<void>;
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function login(form: FormEvent) {
    form.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api("/api/host", { action: "login", pin });
      setPin("");
      await onLogin();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  if (host && !host.configured)
    return (
      <div className="host-setup-needed">
        <p>Host access needs a passcode before the reveal can be set up.</p>
        <p>
          Add <code>STORK_HOST_PIN</code> with at least 6 characters to the
          server environment, then restart the app.
        </p>
      </div>
    );
  return (
    <form className="party-form" onSubmit={login}>
      <label htmlFor="host-pin">Host passcode</label>
      <input
        id="host-pin"
        type="password"
        value={pin}
        onChange={(event) => setPin(event.target.value)}
        autoComplete="current-password"
        placeholder="Your little secret"
        required
        autoFocus
        maxLength={128}
      />
      <p className="host-hint">For the parents and the keeper of the secret.</p>
      {error && (
        <p className="party-error" role="alert">
          {error}
        </p>
      )}
      <button
        type="submit"
        className="party-button"
        disabled={busy || !host || !pin}
      >
        {busy ? "Opening host controls…" : "Unlock host controls"}
        <span aria-hidden="true">→</span>
      </button>
    </form>
  );
}

function RevealControls({ onStarted }: { onStarted?: () => void }) {
  const { event, submit, connected } = useEvent();
  const { host, reload, error: accessError } = useHostAccess();
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function act(action: "start" | "cancel") {
    setBusy(true);
    setError("");
    try {
      await submit({ action }, true);
      if (action === "start") onStarted?.();
      setConfirmed(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {accessError && (
        <p className="party-error" role="alert">
          {accessError}
          <button onClick={() => void reload()}>Retry</button>
        </p>
      )}
      {!host?.authenticated ? (
        <HostLogin host={host} onLogin={reload} />
      ) : event.phase === "revealed" ? (
        <div className="host-ready">
          <span aria-hidden="true">♡</span>
          <h3>The secret is out!</h3>
          <p>
            It’s a {event.result}. Time to celebrate {event.settings.babyName}.
          </p>
        </div>
      ) : event.phase === "countdown" ? (
        <>
          <p className="host-hint">
            The countdown is running on the TV and guest phones.
          </p>
          <button
            className="party-button party-button-secondary"
            disabled={busy || !connected}
            onClick={() => void act("cancel")}
          >
            {busy ? "Stopping…" : "Stop countdown & reopen voting"}
          </button>
        </>
      ) : !host.resultReady ? (
        <div className="host-ready">
          <p>
            First, save the reveal result in host setup. Do this on a private
            screen so the surprise stays a surprise.
          </p>
          <Link href="/host" className="party-button">
            Open host setup ↗
          </Link>
        </div>
      ) : (
        <div className="host-ready">
          <span className="host-secret-ready">
            <span aria-hidden="true">✓</span> The secret is safely saved
          </span>
          <p>
            Gather everyone around. Starting the reveal closes voting and begins
            a 10-second countdown on every screen.
          </p>
          <label className="party-checkbox">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>
              The parents are ready. Let’s reveal {event.settings.babyName}!
            </span>
          </label>
          <button
            type="button"
            className="party-button"
            disabled={busy || !confirmed || !connected}
            onClick={() => void act("start")}
          >
            {busy ? "Starting the countdown…" : "Start the 10-second countdown"}
            <span aria-hidden="true">✦</span>
          </button>
          <small>You can stop the countdown before it reaches zero.</small>
        </div>
      )}
      {error && (
        <p className="party-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}

export function HostControls() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className="party-host-button"
        onClick={() => setOpen(true)}
      >
        <span aria-hidden="true">✧</span> Ready for the reveal?{" "}
        <span aria-hidden="true">→</span>
      </button>
      {open && (
        <Modal
          title="Reveal controls"
          onClose={() => setOpen(false)}
          className="host-modal"
        >
          <Flower />
          <span className="party-eyebrow">
            THE MOMENT WE’VE BEEN WAITING FOR
          </span>
          <h2>
            Ready for the
            <br />
            <em>big little reveal?</em>
          </h2>
          <RevealControls onStarted={() => setOpen(false)} />
          <Link
            href="/rehearsal"
            className="party-text-link host-rehearsal-link"
          >
            Try a rehearsal with sample results ↗
          </Link>
        </Modal>
      )}
    </>
  );
}

function HostSettings({
  host,
  reload,
}: {
  host: HostSnapshot;
  reload: () => Promise<void>;
}) {
  const { event, submit, connected } = useEvent();
  const [settings, setSettings] = useState<EventSettings>(() => ({
    ...structuredClone(event.settings),
    thankYouMessage: host.thankYouMessage ?? DEFAULT_THANK_YOU,
  }));
  const [result, setResult] = useState<Gender | "">("");
  const [showResult, setShowResult] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const locked = event.phase !== "voting";
  const change = (
    field: keyof Pick<EventSettings, "babyName" | "parentsLabel" | "dateLabel">,
    value: string,
  ) => {
    setSettings((settings) => ({ ...settings, [field]: value }));
    setSaved(false);
  };
  async function save(form: FormEvent) {
    form.preventDefault();
    setBusy(true);
    setSaved(false);
    setError("");
    try {
      await submit(
        { action: "configure", settings, ...(result ? { result } : {}) },
        true,
      );
      setResult("");
      setShowResult(false);
      setSaved(true);
      await reload();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Settings couldn’t be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="party-form host-settings" onSubmit={save}>
      <fieldset disabled={busy || locked || !connected}>
        <div className="host-settings-heading">
          <span className="party-eyebrow">MAKE IT YOUR CELEBRATION</span>
          <h2>The little details</h2>
        </div>
        <div className="host-field-grid">
          <div>
            <label htmlFor="baby-name">Baby’s name</label>
            <input
              id="baby-name"
              value={settings.babyName}
              onChange={(event) => change("babyName", event.target.value)}
              maxLength={40}
              required
            />
          </div>
          <div>
            <label htmlFor="parents-name">Parents’ names</label>
            <input
              id="parents-name"
              value={settings.parentsLabel}
              onChange={(event) => change("parentsLabel", event.target.value)}
              placeholder="e.g. Jess & Alex"
              maxLength={80}
              required
            />
          </div>
        </div>
        <label htmlFor="event-date">Date on the big screen</label>
        <input
          id="event-date"
          value={settings.dateLabel}
          onChange={(event) => change("dateLabel", event.target.value)}
          maxLength={60}
          required
        />
        <div className="host-settings-heading">
          <span className="party-eyebrow">JUST FOR FUN</span>
          <h2>{event.settings.babyName}’s little clues</h2>
          <p>
            Choose the family’s answers to put these tales on the board. Leave a
            clue a mystery if you haven’t tried it.
          </p>
        </div>
        <div className="host-tales">
          {TALES.map((tale) => (
            <label key={tale.id} htmlFor={`host-${tale.id}`}>
              <span>
                {tale.symbol} {tale.title}
              </span>
              <select
                id={`host-${tale.id}`}
                value={settings.tales[tale.id] || ""}
                onChange={(event) => {
                  const value = event.target.value as Gender | "";
                  setSettings((settings) => ({
                    ...settings,
                    tales: { ...settings.tales, [tale.id]: value || null },
                  }));
                  setSaved(false);
                }}
              >
                <option value="">Still a mystery</option>
                <option value="girl">{tale.girl} → Girl</option>
                <option value="boy">{tale.boy} → Boy</option>
              </select>
            </label>
          ))}
        </div>
        <p className="host-folklore">
          These are party traditions, not reliable predictions.{" "}
          <a
            href="https://www.pampers.com/en-us/pregnancy/pregnancy-announcement/article/old-wives-tales-gender-prediction"
            target="_blank"
            rel="noreferrer"
          >
            Read about the tales ↗
          </a>
        </p>
        <div className="host-settings-heading">
          <span className="party-eyebrow">AFTER THE HAPPY TEARS</span>
          <h2>A note from the parents</h2>
          <p>This appears on the celebration screen after the reveal.</p>
        </div>
        <label htmlFor="thank-you-message">Your thank-you message</label>
        <textarea
          id="thank-you-message"
          rows={4}
          maxLength={500}
          value={settings.thankYouMessage || ""}
          onChange={(event) => {
            setSettings((settings) => ({
              ...settings,
              thankYouMessage: event.target.value,
            }));
            setSaved(false);
          }}
          placeholder={DEFAULT_THANK_YOU}
        />
        <span className="party-char-count">
          {(settings.thankYouMessage || "").length}/500
        </span>
        <div className="host-secret">
          <div>
            <span className="party-eyebrow">FOR YOUR EYES ONLY</span>
            <h2>The big little secret</h2>
            <p>
              Set this on your phone, away from the TV. The answer stays hidden
              until the countdown ends.
            </p>
          </div>
          {host.resultReady && (
            <span className="host-secret-ready">
              ✓ A reveal result is saved
            </span>
          )}
          {showResult ? (
            <fieldset className="host-result-options">
              <legend>What will the parents reveal?</legend>
              {(["boy", "girl"] as const).map((gender) => (
                <label key={gender}>
                  <input
                    type="radio"
                    name="reveal-result"
                    value={gender}
                    checked={result === gender}
                    onChange={() => {
                      setResult(gender);
                      setSaved(false);
                    }}
                  />
                  It’s a {gender}
                </label>
              ))}
            </fieldset>
          ) : (
            <button
              type="button"
              className="party-button party-button-secondary"
              onClick={() => setShowResult(true)}
            >
              {host.resultReady
                ? "Change the saved result"
                : "Set the reveal result"}
            </button>
          )}
        </div>
        <button
          className="party-button"
          disabled={busy || !connected}
          type="submit"
        >
          {busy ? "Saving the details…" : "Save event details"}
          <span aria-hidden="true">✓</span>
        </button>
      </fieldset>
      {locked && (
        <p className="host-hint">
          Settings are locked because the reveal has started.
        </p>
      )}
      {saved && (
        <p className="host-success" role="status">
          The details are saved. The big screen is up to date.
        </p>
      )}
      {error && (
        <p className="party-error" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}

export function HostPage() {
  const { ready, event } = useEvent();
  const { host, reload, error } = useHostAccess();
  const [logoutError, setLogoutError] = useState("");
  async function logout() {
    try {
      await api("/api/host", { action: "logout" });
      await reload();
    } catch {
      setLogoutError("Couldn’t lock host controls. Please try again.");
    }
  }
  return (
    <div className="party-host-page">
      <div className="vote-heading">
        <span className="party-eyebrow">FOR THE KEEPERS OF THE SECRET</span>
        <h1>
          A little prep.
          <br />
          <em>A magical moment.</em>
        </h1>
        <p>Everything you need for {event.settings.babyName}’s big reveal.</p>
      </div>
      <section className="host-rehearsal-card party-card">
        <span aria-hidden="true">✧</span>
        <div>
          <h2>A little practice, before the party.</h2>
          <p>
            Preview the countdown and celebration with sample guests. Replay as
            often as you like.
          </p>
        </div>
        <Link href="/rehearsal" className="party-button party-button-secondary">
          Open rehearsal ↗
        </Link>
      </section>
      {error && (
        <p className="party-error" role="alert">
          {error}
          <button onClick={() => void reload()}>Retry</button>
        </p>
      )}
      {!host?.authenticated ? (
        <section className="party-card host-login-card">
          <h2>Welcome, hosts.</h2>
          <HostLogin host={host} onLogin={reload} />
        </section>
      ) : (
        <>
          {ready ? (
            <div className="host-page-grid">
              <section className="party-card">
                <HostSettings host={host} reload={reload} />
              </section>
              <div className="host-sidebar">
                <section className="party-card host-launch-card">
                  <Flower />
                  <h2>Make it a moment.</h2>
                  <RevealControls key={String(host.resultReady)} />
                  <Link href="/" className="party-text-link">
                    Open the TV dashboard ↗
                  </Link>
                </section>
                <section className="party-card host-notes">
                  <h2>Notes just for you</h2>
                  <p>These guests chose to keep their notes off the TV.</p>
                  {host.privateNotes?.length ? (
                    host.privateNotes.map((note) => (
                      <blockquote key={note.id}>
                        {note.message}
                        <cite>With love, {note.name}</cite>
                      </blockquote>
                    ))
                  ) : (
                    <p className="host-hint">
                      Private love notes will appear here.
                    </p>
                  )}
                  <button
                    className="party-text-link"
                    onClick={() => void reload()}
                  >
                    Refresh notes ↻
                  </button>
                </section>
              </div>
            </div>
          ) : (
            <p role="status">Loading your event…</p>
          )}
          <div className="host-logout">
            <button className="party-text-link" onClick={() => void logout()}>
              Lock host controls
            </button>
            {logoutError && (
              <p className="party-error" role="alert">
                {logoutError}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
