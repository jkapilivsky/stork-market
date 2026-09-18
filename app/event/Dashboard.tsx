"use client";

import { useEvent } from "./EventProvider";
import { HostControls } from "./HostControls";
import { Reveal } from "./Reveal";
import { QRCard } from "./QRCard";
import { LiveCelebration } from "./Celebration";
import { tally, type Gender } from "./model";

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

function HomeForecast() {
  const { event, ready } = useEvent();
  const counts = tally(event.guests);

  return (
    <section className="home-scoreboard" aria-label="Current guesses">
      <TeamCard
        gender="boy"
        count={ready ? counts.boy : 0}
        percent={counts.boyPercent}
        total={counts.total}
      />
      <TeamCard
        gender="girl"
        count={ready ? counts.girl : 0}
        percent={counts.girlPercent}
        total={counts.total}
      />
    </section>
  );
}

function FolkloreCard() {
  return (
    <section className="home-folklore" aria-labelledby="tales-title">
      <span className="party-eyebrow">A LITTLE FOLKLORE, A LITTLE FUN</span>
      <h2 id="tales-title">Old Wives’ Tales</h2>
      <div className="folklore-columns">
        <div>
          <h3>Girl</h3>
          <strong className="is-current">Sweet cravings</strong>
          <span>High bump</span>
          <span>Spots</span>
          <span>Mood swings</span>
          <strong className="is-current">Heartbeat above 140</strong>
        </div>
        <div>
          <h3>Boy</h3>
          <span>Savoury cravings</span>
          <strong className="is-current">Low bump</strong>
          <strong className="is-current">Clear skin</strong>
          <strong className="is-current">Even tempered</strong>
          <span>Heartbeat below 140</span>
        </div>
      </div>
    </section>
  );
}

function VotingDashboard() {
  return (
    <>
      <div className="home-event-layout">
        <HomeForecast />
        <div className="home-event-lower">
          <QRCard />
          <FolkloreCard />
        </div>
      </div>
      <div className="party-host-bar home-host-bar">
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
