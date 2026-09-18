"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { useEvent } from "./EventProvider";
import { Flower } from "./EventShell";
import { Modal } from "./Modal";
import { Reveal } from "./Reveal";
import { LiveCelebration } from "./Celebration";
import { tally, type Gender } from "./model";

function WelcomeForm({
  onComplete,
  onClose,
}: {
  onComplete: () => void;
  onClose?: () => void;
}) {
  const { event, submit, connected } = useEvent();
  const [name, setName] = useState(event.me?.name || "");
  const [message, setMessage] = useState(event.me?.message || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function join(form: FormEvent) {
    form.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await submit({
        action: "join",
        name: name.trim() || "Guest",
        message,
        shareMessage: false,
      });
      onComplete();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title={event.me ? "Your guest book entry" : "Welcome to Baby K’s reveal"}
      onClose={busy ? undefined : onClose}
      className="welcome-modal"
    >
      <form onSubmit={join} className="party-form">
        <label htmlFor="guest-name">
          Your name <span>optional</span>
        </label>
        <input
          id="guest-name"
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          autoComplete="name"
          maxLength={50}
          autoFocus
        />
        <label htmlFor="guest-message">
          What is your favorite childhood/family tradition? <span>optional</span>
        </label>
        <textarea
          id="guest-message"
          name="message"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          rows={4}
          maxLength={500}
        />
        <span className="party-char-count">{message.length}/500</span>
        {error && (
          <p className="party-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="party-button"
          disabled={busy || !connected}
          type="submit"
        >
          {busy
            ? "Saving your little hello…"
            : event.me
              ? "Save my note"
              : "Let’s make a guess"}
          <span aria-hidden="true">→</span>
        </button>
      </form>
      {!event.me && (
        <Link className="welcome-back" href="/">
          Just here to watch? View the big screen ↗
        </Link>
      )}
    </Modal>
  );
}

function VotingContent() {
  const { event, ready, connected, submit } = useEvent();
  const [selected, setSelected] = useState<Gender | null>(null);
  const [editingVote, setEditingVote] = useState(false);
  const [editingGuest, setEditingGuest] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const choice = selected || event.me?.vote || null;
  const saved = event.me?.vote && !editingVote;
  const counts = tally(event.guests);
  const closed = event.phase !== "voting";
  async function vote(form: FormEvent) {
    form.preventDefault();
    if (!choice || busy) return;
    setBusy(true);
    setError("");
    try {
      await submit({ action: "vote", vote: choice });
      setEditingVote(false);
      setSelected(null);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "We couldn’t save your guess. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="party-vote-page">
        <div className="vote-heading">
          <h1>What’s your guess?</h1>
        </div>
        {!ready ? (
          <div className="party-vote-loading" role="status">
            <Flower />
            <p>
              {connected
                ? "Getting the guest book ready…"
                : "Connecting to the celebration…"}
            </p>
          </div>
        ) : saved ? (
          <section
            className={`party-vote-receipt is-${event.me!.vote}`}
            aria-label="Your saved guess"
          >
            <span className="receipt-stamp" aria-hidden="true">
              ✓
            </span>
            <span className="party-eyebrow">YOUR GUESS IS IN</span>
            <h2>
              It’s a {event.me!.vote}
              <span aria-hidden="true">
                {event.me!.vote === "girl" ? "✿" : "✦"}
              </span>
            </h2>
            <div className="receipt-divider" />
            <div className="receipt-details">
              <span>
                GUEST<strong>{event.me!.name}</strong>
              </span>
              <span>
                PART OF THE PARTY
                <strong>
                  {counts.total} {counts.total === 1 ? "guess" : "guesses"} &
                  counting
                </strong>
              </span>
            </div>
            {event.me!.message && (
              <blockquote>
                “{event.me!.message}”
                <small>
                  {event.me!.shareMessage
                    ? "Your note is on the big screen."
                    : "Your note is just for the hosts."}
                </small>
              </blockquote>
            )}
            <Link href="/" className="party-button">
              Back to Homepage <span aria-hidden="true">↗</span>
            </Link>
            {!closed && (
              <div className="receipt-actions">
                <button
                  onClick={() => {
                    setEditingVote(true);
                    setSelected(event.me!.vote);
                  }}
                >
                  Change my guess
                </button>
                <button onClick={() => setEditingGuest(true)}>
                  Edit my note
                </button>
              </div>
            )}
          </section>
        ) : closed ? (
          <section className="party-closed-card">
            <Flower />
            <h2>
              {event.phase === "revealed"
                ? `It’s a ${event.result}!`
                : "All eyes on the big screen."}
            </h2>
            <p>
              {event.phase === "revealed"
                ? `${event.settings.babyName}, we can’t wait to meet you.`
                : "The parents have started the reveal. Voting is now closed."}
            </p>
            <Link href="/" className="party-button">
              Join the celebration ↗
            </Link>
          </section>
        ) : (
          <form onSubmit={vote} className="party-vote-form">
            <fieldset disabled={busy || !event.me || !connected}>
              <legend className="sr-only">Choose your guess</legend>
              <div className="party-vote-choices">
                {(["boy", "girl"] as const).map((gender) => (
                  <label
                    key={gender}
                    className={`party-vote-choice is-${gender} ${choice === gender ? "is-selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name="gender"
                      value={gender}
                      checked={choice === gender}
                      onChange={() => setSelected(gender)}
                    />
                    <span className="vote-choice-check" aria-hidden="true">
                      {choice === gender ? "✓" : ""}
                    </span>
                    <span className="vote-choice-art" aria-hidden="true">
                      {gender === "boy" ? "✦" : "✿"}
                    </span>
                    <span className="vote-choice-name">
                      {gender === "boy" ? "Boy" : "Girl"}
                    </span>
                  </label>
                ))}
              </div>
              {error && (
                <p className="party-error" role="alert">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="party-button"
                disabled={!choice || busy || !event.me || !connected}
              >
                {busy
                  ? "Saving your guess…"
                  : choice
                    ? `I’m guessing ${choice}`
                    : "Select boy or girl above"}
                <span aria-hidden="true">→</span>
              </button>
            </fieldset>
            {event.me && (
              <button
                type="button"
                className="vote-edit-name"
                onClick={() => setEditingGuest(true)}
              >
                Voting as {event.me.name} · Edit
              </button>
            )}
          </form>
        )}
        <p className="vote-bottom-note">
          <span aria-hidden="true">♡</span>{" "}
          {closed
            ? "Thanks for being part of this little story."
            : "You can change your guess until the countdown begins."}
        </p>
      </div>
      {ready && !closed && (!event.me || editingGuest) && (
        <WelcomeForm
          onComplete={() => setEditingGuest(false)}
          onClose={event.me ? () => setEditingGuest(false) : undefined}
        />
      )}
    </>
  );
}

export function VotePage() {
  const { event } = useEvent();
  return (
    <>
      {event.phase === "revealed" && event.result ? (
        <LiveCelebration />
      ) : (
        <VotingContent />
      )}
      <Reveal />
    </>
  );
}
