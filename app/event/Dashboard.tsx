"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useEvent } from "./EventProvider";
import { Flower } from "./EventShell";
import { HostControls } from "./HostControls";
import { Reveal } from "./Reveal";
import { QRCard } from "./QRCard";
import { LiveCelebration } from "./Celebration";
import { TALES, tally, type Gender } from "./model";

function TeamCard({
  gender,
  count,
  percent,
  total,
}: {
  gender: Gender;
  count: number;
  percent: number;
  total: number;
}) {
  return (
    <div className={`party-team is-${gender}`}>
      <div className="team-topline">
        <span className="team-dot" />
        <span>TEAM {gender.toUpperCase()}</span>
        <span className="team-symbol" aria-hidden="true">
          {gender === "boy" ? "✦" : "✿"}
        </span>
      </div>
      <div className="team-number">
        {count}
        <span>{count === 1 ? "guess" : "guesses"}</span>
      </div>
      <div className="team-bottomline">
        <span>{total ? `${percent}% of the room` : "Who will be first?"}</span>
        <strong>{total ? `${percent}%` : "—"}</strong>
      </div>
      <div className="team-track" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function VotingDashboard() {
  const { event, ready } = useEvent();
  const [guestPage, setGuestPage] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const counts = tally(event.guests);
  const voters = event.guests
    .filter((guest) => guest.vote)
    .sort((a, b) => (b.votedAt || 0) - (a.votedAt || 0));
  const wishes = event.guests
    .filter((guest) => guest.message && guest.shareMessage)
    .sort((a, b) => b.joinedAt - a.joinedAt);
  const pageCount = Math.max(1, Math.ceil(voters.length / 8));
  const page = guestPage % pageCount;
  const visibleGuests = voters.slice(page * 8, page * 8 + 8);
  const wish = wishes.length ? wishes[noteIndex % wishes.length] : null;
  useEffect(() => {
    if (paused) return;
    const rotation = setInterval(() => {
      setGuestPage((value) => value + 1);
      setNoteIndex((value) => value + 1);
    }, 10_000);
    return () => clearInterval(rotation);
  }, [paused]);

  return (
    <>
      <section className="party-intro">
        <div>
          <span className="party-eyebrow">
            <span className="tiny-star" aria-hidden="true">
              ✦
            </span>{" "}
            {event.settings.babyName.toUpperCase()}’S BIG REVEAL
          </span>
          <h1>
            A little mystery.
            <br />
            <em>A whole lot of love.</em>
          </h1>
          <p>Boy or girl? The room has a hunch. Let’s see who’s right.</p>
        </div>
        <div className="party-date">
          <Flower />
          <span>THE SWEETEST CELEBRATION</span>
          <strong>{event.settings.dateLabel}</strong>
          <small>For {event.settings.parentsLabel}</small>
        </div>
      </section>
      <div className="party-dashboard-grid">
        <div className="party-main-column">
          <section
            className="party-predictions party-card"
            aria-labelledby="predictions-title"
          >
            <div className="party-section-heading">
              <div>
                <span className="party-eyebrow">THE FAMILY FORECAST</span>
                <h2 id="predictions-title">What’s your little hunch?</h2>
              </div>
              <span className="party-total" aria-live="polite">
                <strong>{ready ? counts.total : "—"}</strong>{" "}
                {counts.total === 1 ? "guess" : "guesses"} so far
              </span>
            </div>
            <div className="party-teams">
              <TeamCard
                gender="boy"
                count={counts.boy}
                percent={counts.boyPercent}
                total={counts.total}
              />
              <span className="party-versus" aria-hidden="true">
                or
              </span>
              <TeamCard
                gender="girl"
                count={counts.girl}
                percent={counts.girlPercent}
                total={counts.total}
              />
            </div>
            <div className="prediction-caption">
              <span aria-hidden="true">♡</span>
              {counts.total === 0
                ? "The best kind of guessing game. Be the first to join in."
                : counts.boy === counts.girl
                  ? "A perfectly divided room. The suspense is real."
                  : `Team ${counts.boy > counts.girl ? "boy" : "girl"} has a feeling. Baby K is keeping us guessing.`}
            </div>
          </section>
          <section
            className="party-guestbook party-card"
            aria-labelledby="guestbook-title"
          >
            <div className="party-section-heading">
              <h2 id="guestbook-title">
                Look who’s guessing <span aria-hidden="true">↘</span>
              </h2>
              <div className="guestbook-controls">
                <span>
                  {voters.length} {voters.length === 1 ? "guest" : "guests"}
                </span>
                {pageCount > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setGuestPage((value) => value + pageCount - 1)
                      }
                      aria-label="Previous guests"
                    >
                      ←
                    </button>
                    <span>
                      {page + 1}/{pageCount}
                    </span>
                    <button
                      onClick={() => setGuestPage((value) => value + 1)}
                      aria-label="Next guests"
                    >
                      →
                    </button>
                  </>
                )}
                <button
                  className="rotation-toggle"
                  aria-pressed={paused}
                  onClick={() => setPaused((value) => !value)}
                  aria-label={
                    paused
                      ? "Resume guest and message rotation"
                      : "Pause guest and message rotation"
                  }
                >
                  {paused ? "Play" : "Pause"}
                </button>
              </div>
            </div>
            {visibleGuests.length ? (
              <div className="party-guest-list">
                {visibleGuests.map((guest) => (
                  <div className="party-guest-row" key={guest.id}>
                    <span
                      className={`party-avatar is-${guest.vote}`}
                      aria-hidden="true"
                    >
                      {guest.name
                        .split(/\s+/)
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </span>
                    <strong>{guest.name}</strong>
                    <span className={`party-pick is-${guest.vote}`}>
                      {guest.vote === "boy" ? "Boy" : "Girl"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="party-empty-guests">
                <span className="empty-avatar" aria-hidden="true">
                  ♡
                </span>
                <div>
                  <strong>
                    A room full of love, a board full of possibilities.
                  </strong>
                  <p>Names and guesses will appear here as everyone joins.</p>
                </div>
                <Link href="/vote" className="party-text-link">
                  Make the first guess ↗
                </Link>
              </div>
            )}
          </section>
          <section className="party-wishes" aria-labelledby="wishes-title">
            <div className="wishes-side">
              <span className="wishes-mark" aria-hidden="true">
                “
              </span>
              <span className="party-eyebrow" id="wishes-title">
                A LITTLE LOVE NOTE
              </span>
            </div>
            <div className="wish-copy">
              {wish ? (
                <>
                  <blockquote key={wish.id}>{wish.message}</blockquote>
                  <span>With love, {wish.name}</span>
                </>
              ) : (
                <>
                  <blockquote>
                    Every little wish, saved for a lifetime.
                  </blockquote>
                  <span>
                    Leave a note for {event.settings.parentsLabel} when you
                    vote.
                  </span>
                </>
              )}
            </div>
            <div className="wishes-controls">
              {wishes.length > 1 && (
                <>
                  <button
                    onClick={() =>
                      setNoteIndex((value) => value + wishes.length - 1)
                    }
                    aria-label="Previous love note"
                  >
                    ←
                  </button>
                  <span>
                    {(noteIndex % wishes.length) + 1} / {wishes.length}
                  </span>
                  <button
                    onClick={() => setNoteIndex((value) => value + 1)}
                    aria-label="Next love note"
                  >
                    →
                  </button>
                </>
              )}
              <span aria-hidden="true">♡</span>
            </div>
          </section>
        </div>
        <div className="party-side-column">
          <QRCard />
          <div className="party-reveal-teaser">
            <span className="teaser-star" aria-hidden="true">
              ✧
            </span>
            <div>
              <strong>The best is yet to come.</strong>
              <p>
                When the parents are ready,
                <br />
                we’ll count down together.
              </p>
            </div>
          </div>
        </div>
      </div>
      <section className="party-tales" aria-labelledby="tales-title">
        <div className="party-section-heading">
          <div>
            <span className="party-eyebrow">
              A LITTLE FOLKLORE, A LITTLE FUN
            </span>
            <h2 id="tales-title">What do the old wives’ tales say?</h2>
          </div>
          <span className="tales-disclaimer">
            Party folklore, not science <span aria-hidden="true">✧</span>
          </span>
        </div>
        <div className="party-tales-grid">
          {TALES.map((tale) => {
            const answer = event.settings.tales[tale.id];
            return (
              <article className="party-tale" key={tale.id}>
                <span
                  className={`tale-icon tale-${tale.id}`}
                  aria-hidden="true"
                >
                  {tale.symbol}
                </span>
                <div>
                  <h3>{tale.title}</h3>
                  <p>{answer ? tale[answer] : tale.story}</p>
                  <span
                    className={
                      answer ? `tale-answer is-${answer}` : "tale-unanswered"
                    }
                  >
                    {answer
                      ? `The tale says ${answer}`
                      : "Baby K’s clue is still a mystery"}
                  </span>
                </div>
              </article>
            );
          })}
        </div>
      </section>
      <div className="party-host-bar">
        <span>
          <span aria-hidden="true">✦</span> However you guessed, you’re part of
          the story.
        </span>
        <HostControls />
      </div>
    </>
  );
}

export function Dashboard() {
  const { event } = useEvent();
  return (
    <>
      {event.phase === "revealed" && event.result ? (
        <LiveCelebration tv />
      ) : (
        <VotingDashboard />
      )}
      <Reveal />
    </>
  );
}
