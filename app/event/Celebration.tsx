"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { useEvent } from "./EventProvider";
import { Flower } from "./EventShell";
import { Modal } from "./Modal";
import { QRCard } from "./QRCard";
import { Reveal } from "./Reveal";
import {
  DEFAULT_THANK_YOU,
  tally,
  type EventSnapshot,
  type Gender,
} from "./model";

type CelebrationEvent = Pick<EventSnapshot, "settings" | "guests" | "me"> & {
  result: Gender;
};

export function CelebrationScreen({
  event,
  invitation,
  rehearsal = false,
}: {
  event: CelebrationEvent;
  invitation: ReactNode;
  rehearsal?: boolean;
}) {
  const [pageIndex, setPageIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const counts = tally(event.guests);
  const correct = event.guests.filter((guest) => guest.vote === event.result);
  const pages = Math.max(1, Math.ceil(correct.length / 8));
  const page = pageIndex % pages;
  const notes = event.guests.flatMap((guest) => [
    ...(guest.celebrationNote && guest.shareCelebrationNote
      ? [
          {
            id: `${guest.id}-wish`,
            name: guest.name,
            message: guest.celebrationNote,
          },
        ]
      : []),
    ...(guest.message && guest.shareMessage
      ? [{ id: guest.id, name: guest.name, message: guest.message }]
      : []),
  ]);
  const note = notes.length ? notes[noteIndex % notes.length] : null;
  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setPageIndex((value) => value + 1);
      setNoteIndex((value) => value + 1);
    }, 10_000);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div className={`party-celebration is-${event.result}`}>
      <section className="celebration-hero" aria-labelledby="celebration-title">
        <div className="celebration-announcement">
          <span className="party-eyebrow">
            {rehearsal ? "SAMPLE CELEBRATION" : "THE SECRET IS OUT"}
          </span>
          <h1 id="celebration-title">
            It’s a <em>{event.result}!</em>
          </h1>
          <p>{event.settings.babyName}, you are already so loved.</p>
          <span className="celebration-date">
            {event.settings.dateLabel} <span aria-hidden="true">✦</span> A day
            to remember
          </span>
          {event.me?.vote && (
            <span className="celebration-personal" role="status">
              {event.me.vote === event.result
                ? `${event.me.name}, your little hunch was right!`
                : `${event.me.name}, thank you for adding your love to the room.`}
            </span>
          )}
        </div>
        <div className="celebration-thanks">
          <Flower />
          <span className="party-eyebrow">FROM OUR GROWING FAMILY</span>
          <blockquote>
            {event.settings.thankYouMessage || DEFAULT_THANK_YOU}
          </blockquote>
          <p>
            With love, <strong>{event.settings.parentsLabel}</strong>
          </p>
        </div>
      </section>

      <div className="celebration-grid">
        <section
          className="party-card celebration-results"
          aria-labelledby="final-guesses-title"
        >
          <div className="party-section-heading">
            <div>
              <span className="party-eyebrow">THE FINAL FAMILY FORECAST</span>
              <h2 id="final-guesses-title">Every guess, all the love.</h2>
            </div>
            <span className="celebration-total">
              {counts.total} {counts.total === 1 ? "guess" : "guesses"}
            </span>
          </div>
          <div className="celebration-split" aria-label="Final vote split">
            {(["boy", "girl"] as const).map((gender) => (
              <div className={`celebration-team is-${gender}`} key={gender}>
                <span>TEAM {gender.toUpperCase()}</span>
                <strong>
                  {counts[gender]}{" "}
                  <small>
                    {counts.total ? counts[`${gender}Percent`] : 0}%
                  </small>
                </strong>
                <div className="team-track" aria-hidden="true">
                  <span style={{ width: `${counts[`${gender}Percent`]}%` }} />
                </div>
                {event.result === gender && (
                  <span className="celebration-right">
                    The little hunch was right <span aria-hidden="true">✓</span>
                  </span>
                )}
              </div>
            ))}
          </div>
          <div className="celebration-winners-heading">
            <h3>
              {correct.length
                ? "They had a feeling…"
                : counts.total
                  ? "A surprise for everyone."
                  : "A room full of love."}
            </h3>
            {correct.length > 0 && (
              <span>{correct.length} guessed correctly</span>
            )}
          </div>
          {correct.length ? (
            <div
              className="celebration-winners"
              aria-label="Guests who guessed correctly"
            >
              {correct.slice(page * 8, page * 8 + 8).map((guest) => (
                <div key={guest.id}>
                  <span
                    className={`party-avatar is-${event.result}`}
                    aria-hidden="true"
                  >
                    {guest.name.slice(0, 1).toUpperCase()}
                  </span>
                  <strong>{guest.name}</strong>
                  <span aria-hidden="true">✦</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="celebration-empty">
              {counts.total
                ? "Baby kept everyone guessing. Now there’s a whole new reason to celebrate."
                : "Some surprises don’t need a prediction. Thanks for being here."}
            </p>
          )}
          {pages > 1 && (
            <div className="guestbook-controls celebration-pagination">
              <button
                aria-label="Previous correct guesses"
                onClick={() => setPageIndex((value) => value + pages - 1)}
              >
                ←
              </button>
              <span>
                {page + 1} / {pages}
              </span>
              <button
                aria-label="Next correct guesses"
                onClick={() => setPageIndex((value) => value + 1)}
              >
                →
              </button>
            </div>
          )}
        </section>

        <section
          className="celebration-wishes"
          aria-labelledby="celebration-wishes-title"
        >
          <span className="party-eyebrow">WORDS TO GROW UP WITH</span>
          <h2 id="celebration-wishes-title">
            So much love,
            <br />
            <em>little one.</em>
          </h2>
          {note ? (
            <blockquote key={note.id}>
              “{note.message}”<cite>With love, {note.name}</cite>
            </blockquote>
          ) : (
            <p>
              Every kind word is a little gift. Leave a wish for{" "}
              {event.settings.babyName} and the parents.
            </p>
          )}
          {notes.length > 1 && (
            <div className="guestbook-controls">
              <button
                aria-label="Previous celebration note"
                onClick={() =>
                  setNoteIndex((value) => value + notes.length - 1)
                }
              >
                ←
              </button>
              <span>
                {(noteIndex % notes.length) + 1} / {notes.length} notes
              </span>
              <button
                aria-label="Next celebration note"
                onClick={() => setNoteIndex((value) => value + 1)}
              >
                →
              </button>
            </div>
          )}
        </section>
        <div className="celebration-invitation">{invitation}</div>
      </div>
      <div className="celebration-footer">
        <span>
          <span aria-hidden="true">♡</span> The guessing is over. The love is
          just beginning.
        </span>
        <button
          className="party-text-link"
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused
            ? "Resume celebration rotation"
            : "Pause celebration rotation"}
        </button>
      </div>
    </div>
  );
}

function FinalWishForm({ onClose }: { onClose: () => void }) {
  const { event, connected, submit } = useEvent();
  const [name, setName] = useState(event.me?.name || "");
  const [message, setMessage] = useState(event.me?.celebrationNote || "");
  const [shareMessage, setShareMessage] = useState(
    event.me?.celebrationNote ? (event.me.shareCelebrationNote ?? false) : true,
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(form: FormEvent) {
    form.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      await submit({ action: "wish", name, message, shareMessage });
      onClose();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Your wish couldn’t be saved.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      title="A final wish for Baby K"
      onClose={busy ? undefined : onClose}
      className="welcome-modal"
    >
      <Flower />
      <span className="party-eyebrow">A LITTLE SOMETHING TO KEEP</span>
      <h2>
        What a lovely
        <br />
        <em>beginning.</em>
      </h2>
      <p className="welcome-intro">
        Leave a wish for {event.settings.babyName} and the parents. Your earlier
        note is kept, too.
      </p>
      <form className="party-form" onSubmit={save}>
        {!event.me && (
          <>
            <label htmlFor="wish-name">Your name</label>
            <input
              id="wish-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={50}
              autoComplete="name"
              autoFocus
            />
          </>
        )}
        <label htmlFor="final-wish">Your final wish</label>
        <textarea
          id="final-wish"
          value={message}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="One thing I hope for you is…"
          rows={4}
          maxLength={500}
          required
          autoFocus={Boolean(event.me)}
        />
        <span className="party-char-count">{message.length}/500</span>
        <label className="party-checkbox">
          <input
            type="checkbox"
            checked={shareMessage}
            onChange={(event) => setShareMessage(event.target.checked)}
          />
          <span>
            Share my wish on the big screen
            <small>
              {shareMessage
                ? "Your name and wish will be part of the celebration."
                : "Only the hosts will see this wish."}
            </small>
          </span>
        </label>
        {error && (
          <p className="party-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="party-button"
          type="submit"
          disabled={busy || !connected || !name.trim() || !message.trim()}
        >
          {busy ? "Saving your wish…" : "Save my wish"}
          <span aria-hidden="true">♡</span>
        </button>
      </form>
    </Modal>
  );
}

export function LiveCelebration({ tv = false }: { tv?: boolean }) {
  const { event } = useEvent();
  const [writing, setWriting] = useState(false);
  if (event.phase !== "revealed" || !event.result) return null;
  return (
    <>
      <CelebrationScreen
        event={{ ...event, result: event.result }}
        invitation={
          tv ? (
            <QRCard celebration />
          ) : (
            <aside className="celebration-write-card">
              <Flower />
              <span className="party-eyebrow">BE PART OF THE NEXT CHAPTER</span>
              <h2>
                A wish for
                <br />
                <em>little you.</em>
              </h2>
              <p>
                {event.me?.celebrationNote
                  ? "Your final wish is saved. Thank you for leaving a little love."
                  : "A hope, a happy thought, or a few words for the parents to keep."}
              </p>
              <button className="party-button" onClick={() => setWriting(true)}>
                {event.me?.celebrationNote
                  ? "Edit my final wish"
                  : "Leave a final wish"}
                <span aria-hidden="true">♡</span>
              </button>
              {event.me?.celebrationNote && (
                <small role="status">
                  {event.me.shareCelebrationNote
                    ? "Your wish is on the big screen."
                    : "Your wish is just for the hosts."}
                </small>
              )}
            </aside>
          )
        }
      />
      {writing && <FinalWishForm onClose={() => setWriting(false)} />}
    </>
  );
}

export function CelebrationPage() {
  const { event, ready } = useEvent();
  return (
    <>
      {event.phase === "revealed" && event.result ? (
        <LiveCelebration />
      ) : (
        <section className="party-host-page vote-heading celebration-waiting">
          <Flower />
          <span className="party-eyebrow">THE BEST IS STILL TO COME</span>
          <h1>
            A little more
            <br />
            <em>anticipation.</em>
          </h1>
          <p>
            {ready
              ? "This page opens the celebration when the parents reveal their little secret."
              : "Connecting to the celebration…"}
          </p>
          <Link
            className="party-button"
            href={event.phase === "countdown" ? "/" : "/vote"}
          >
            {event.phase === "countdown"
              ? "Watch the big screen"
              : "Make your guess"}{" "}
            ↗
          </Link>
        </section>
      )}
      <Reveal />
    </>
  );
}
