"use client";

import Link from "next/link";
import {
  MarketDefinition,
  formatCredits,
  getMarketPercentages,
} from "../market-config";
import { useMarketStore } from "../market-store";

export function MarketCard({ market }: { market: MarketDefinition }) {
  const { state } = useMarketStore();
  const runtime = state.markets[market.slug];
  const percentages = getMarketPercentages(runtime.pools);
  const committed = Object.values(runtime.positions).reduce(
    (total, position) => total + position.spent,
    0,
  );
  const leadingOutcomes = market.outcomes
    .slice()
    .sort(
      (first, second) =>
        percentages[second.key] - percentages[first.key],
    )
    .slice(0, 2);

  return (
    <article className={`directory-card tone-${market.tone}`}>
      <div className="directory-card-topline">
        <span>{market.eyebrow}</span>
        <span className="market-status-pill">Open</span>
      </div>
      <div className="directory-card-copy">
        <span className="market-group-label">{market.group}</span>
        <h3>{market.question}</h3>
        <p>{market.resolutionSummary}</p>
      </div>

      <div className="directory-odds" aria-label="Current prediction odds">
        {leadingOutcomes.map((outcome) => (
          <div key={outcome.key}>
            <span>{outcome.shortLabel}</span>
            <strong>{percentages[outcome.key]}%</strong>
          </div>
        ))}
      </div>
      <div
        className="directory-odds-bar"
        aria-label={market.outcomes
          .map(
            (outcome) =>
              `${percentages[outcome.key]} percent ${outcome.label}`,
          )
          .join(", ")}
      >
        {market.outcomes.map((outcome) => (
          <span
            key={outcome.key}
            style={{
              width: `${percentages[outcome.key]}%`,
              backgroundColor: outcome.color,
            }}
          />
        ))}
      </div>

      <div className="directory-card-meta">
        <span>Locks {market.lockLabel}</span>
        <span>
          {committed > 0
            ? `${formatCredits(committed)} cr committed`
            : `${market.seededParticipants} predictors`}
        </span>
      </div>

      <Link
        className="directory-card-link"
        href={`/markets/${market.slug}`}
        aria-label={`Open market: ${market.question}`}
      >
        Open market <span aria-hidden="true">→</span>
      </Link>
    </article>
  );
}
