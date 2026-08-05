"use client";

import Link from "next/link";
import { CSSProperties } from "react";
import {
  MARKET_DEFINITIONS,
  formatCredits,
} from "../market-config";
import { PredictionRecord, useMarketStore } from "../market-store";

function formatPredictionTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PortfolioPage() {
  const { state } = useMarketStore();
  const allPredictions = Object.values(state.markets)
    .flatMap((market) => market.predictions)
    .sort(
      (first, second) =>
        new Date(second.placedAt).getTime() -
        new Date(first.placedAt).getTime(),
    );
  const totalCommitted = allPredictions.reduce(
    (total, prediction) => total + prediction.credits,
    0,
  );
  const playedMarkets = MARKET_DEFINITIONS.filter(
    (definition) => state.markets[definition.slug].predictions.length > 0,
  );

  function outcomeLabel(prediction: PredictionRecord) {
    const definition = MARKET_DEFINITIONS.find(
      (market) => market.slug === prediction.marketSlug,
    );
    if (!definition) return prediction.outcome;
    return (
      definition.outcomes.find((outcome) => outcome.key === prediction.outcome)
        ?.shortLabel ?? prediction.outcome
    );
  }

  return (
    <>
      <section className="page-intro portfolio-intro">
        <div>
          <span className="section-kicker">Your event wallet</span>
          <h1>One portfolio, separate positions.</h1>
          <p>
            Review activity across the family event without combining markets
            into one bet. Every receipt stays tied to one question.
          </p>
        </div>
        <aside className="portfolio-summary" aria-label="Portfolio summary">
          <div>
            <span>Available</span>
            <strong>{formatCredits(state.balance)}</strong>
            <small>credits</small>
          </div>
          <div>
            <span>Committed</span>
            <strong>{formatCredits(totalCommitted)}</strong>
            <small>credits</small>
          </div>
          <div>
            <span>Markets played</span>
            <strong>{playedMarkets.length}</strong>
            <small>of {MARKET_DEFINITIONS.length}</small>
          </div>
        </aside>
      </section>

      {allPredictions.length === 0 ? (
        <section className="portfolio-empty">
          <span aria-hidden="true">0</span>
          <h2>No market positions yet</h2>
          <p>
            Start with the gender prediction, then use the market switcher when
            you are ready to make another call.
          </p>
          <Link href="/">Make my first prediction →</Link>
        </section>
      ) : (
        <>
          <section className="portfolio-positions" aria-labelledby="positions-heading">
            <header className="market-group-heading">
              <div>
                <span className="section-kicker">Separated by market</span>
                <h2 id="positions-heading">Your open positions</h2>
              </div>
              <Link href="/">Make another prediction →</Link>
            </header>
            <div className="portfolio-market-grid">
              {playedMarkets.map((definition) => {
                const runtime = state.markets[definition.slug];
                const outcomes = definition.outcomes.filter(
                  (outcome) => runtime.positions[outcome.key]?.spent > 0,
                );
                return (
                  <article
                    className={`portfolio-market-card tone-${definition.tone}`}
                    key={definition.slug}
                  >
                    <span>{definition.eyebrow}</span>
                    <h3>{definition.question}</h3>
                    <dl>
                      {outcomes.map((outcome) => (
                        <div key={outcome.key}>
                          <dt>{outcome.label}</dt>
                          <dd>
                            {formatCredits(runtime.positions[outcome.key].spent)} cr ·{" "}
                            {formatCredits(runtime.positions[outcome.key].shares)} if correct
                          </dd>
                        </div>
                      ))}
                    </dl>
                    <Link href={`/markets/${definition.slug}`}>
                      Open this market →
                    </Link>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="portfolio-receipts" aria-labelledby="receipts-heading">
            <header className="market-group-heading">
              <div>
                <span className="section-kicker">Timestamped activity</span>
                <h2 id="receipts-heading">All prediction receipts</h2>
              </div>
              <span>{allPredictions.length} total</span>
            </header>
            <div className="portfolio-receipt-list">
              {allPredictions.map((prediction) => {
                const definition = MARKET_DEFINITIONS.find(
                  (market) => market.slug === prediction.marketSlug,
                );
                if (!definition) return null;
                const outcome = definition.outcomes.find(
                  (candidate) => candidate.key === prediction.outcome,
                );
                return (
                  <article className="portfolio-receipt" key={prediction.id}>
                    <div className="portfolio-receipt-market">
                      <span
                        className="record-side dynamic-record-side"
                        style={
                          {
                            "--outcome-color": outcome?.color ?? "#648a70",
                          } as CSSProperties
                        }
                      >
                        {outcomeLabel(prediction)}
                      </span>
                      <div>
                        <Link href={`/markets/${definition.slug}`}>
                          {definition.question}
                        </Link>
                        <time dateTime={prediction.placedAt}>
                          {formatPredictionTime(prediction.placedAt)}
                        </time>
                      </div>
                    </div>
                    <dl>
                      <div>
                        <dt>Committed</dt>
                        <dd>{formatCredits(prediction.credits)} cr</dd>
                      </div>
                      <div>
                        <dt>Entry odds</dt>
                        <dd>{Math.round(prediction.entryPrice * 100)}%</dd>
                      </div>
                      <div>
                        <dt>Est. payout</dt>
                        <dd>{formatCredits(prediction.estimatedPayout)} cr</dd>
                      </div>
                      <div>
                        <dt>Est. profit</dt>
                        <dd>+{formatCredits(prediction.estimatedProfit)} cr</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
            <p className="portfolio-disclaimer">
              Payout estimates are evaluated separately. This portfolio is a
              summary, not a combined prediction ticket.
            </p>
          </section>
        </>
      )}
    </>
  );
}
