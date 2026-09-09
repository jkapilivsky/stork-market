"use client";

import { useEvent } from "./EventProvider";
import { Flower } from "./EventShell";
import { HostControls } from "./HostControls";
import { Reveal } from "./Reveal";
import { QRCard } from "./QRCard";
import { LiveCelebration } from "./Celebration";
import { TALES, tally, type Gender } from "./model";

export function TeamCard({
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

export function FamilyForecast({ className = "" }: { className?: string }) {
  const { event, ready } = useEvent();
  const counts = tally(event.guests);
  return (
    <section
      className={`party-predictions party-card ${className}`.trim()}
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
  );
}

function VotingDashboard() {
  const { event } = useEvent();

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
          <FamilyForecast className="home-forecast-card" />
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
