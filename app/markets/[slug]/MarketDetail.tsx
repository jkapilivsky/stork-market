"use client";

import Link from "next/link";
import { CSSProperties, useEffect, useState } from "react";
import { BabySizeCard } from "../../components/BabySizeCard";
import { MarketSwitcher } from "../../components/MarketSwitcher";
import { TrendChart } from "../../components/TrendChart";
import {
  EVENT_CONFIG,
  OutcomeKey,
  formatCredits,
  getMarketDefinition,
  getMarketPercentages,
  getMarketTotalPool,
} from "../../market-config";
import { useMarketStore } from "../../market-store";

function formatPredictionTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function outcomeStyle(color: string) {
  return { "--outcome-color": color } as CSSProperties;
}

export function MarketDetail({ slug }: { slug: string }) {
  const definition = getMarketDefinition(slug);
  const { state, placePrediction } = useMarketStore();
  const runtime = state.markets[slug];
  const defaultOutcome = definition?.outcomes[0]?.key ?? "";
  const [selected, setSelected] = useState<OutcomeKey>(defaultOutcome);
  const [stake, setStake] = useState(250);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(""), 3600);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  if (!definition || !runtime) return null;

  const selectedOutcome =
    definition.outcomes.find((outcome) => outcome.key === selected) ??
    definition.outcomes[0];
  const totalPool = getMarketTotalPool(runtime.pools);
  const percentages = getMarketPercentages(runtime.pools);
  const currentPrice = runtime.pools[selectedOutcome.key] / totalPool;
  const projectedPayout =
    stake >= EVENT_CONFIG.minimumPrediction && stake <= state.balance
      ? stake / currentPrice
      : 0;
  const projectedProfit = projectedPayout ? projectedPayout - stake : 0;
  const totalSpent = Object.values(runtime.positions).reduce(
    (total, position) => total + position.spent,
    0,
  );
  const focusOutcome =
    definition.outcomes.find(
      (outcome) => outcome.key === definition.trendFocusKey,
    ) ?? definition.outcomes[0];
  const latestTrend =
    runtime.trend.at(-1)?.percentages[focusOutcome.key] ??
    percentages[focusOutcome.key] ??
    0;
  const openingTrend =
    runtime.trend[0]?.percentages[focusOutcome.key] ?? latestTrend;
  const trendChange = latestTrend - openingTrend;
  const positions = definition.outcomes
    .filter((outcome) => runtime.positions[outcome.key]?.spent > 0)
    .map((outcome) => ({
      ...outcome,
      ...runtime.positions[outcome.key],
    }));
  const isBinary = definition.outcomes.length === 2;

  function submitPrediction() {
    const result = placePrediction(slug, selectedOutcome.key, stake);
    if (!result.ok) {
      setToast(result.message);
      return;
    }

    const remainingBalance = state.balance - stake;
    setStake(
      remainingBalance >= EVENT_CONFIG.minimumPrediction
        ? Math.min(250, remainingBalance)
        : 0,
    );
    setToast(
      `Prediction placed: ${formatCredits(stake)} credits on ${selectedOutcome.shortLabel}.`,
    );
  }

  return (
    <>
      <MarketSwitcher activeSlug={slug} />

      <section
        className={`market-detail-hero tone-${definition.tone}`}
        aria-labelledby="market-heading"
      >
        <div className="detail-hero-grid">
          <div className="detail-hero-copy">
            <div className="eyebrow">
              <span className="live-dot" aria-hidden="true" />
              {definition.eyebrow} · one market
            </div>
            <h1 id="market-heading">{definition.question}</h1>
            <p>{definition.resolutionSummary}</p>

            {definition.featured && <BabySizeCard />}

            <div className="detail-market-meta">
              <div>
                <span>Market status</span>
                <strong>Open</strong>
              </div>
              <div>
                <span>{definition.featured ? "Reveal party" : "Predictions lock"}</span>
                <strong>
                  {definition.featured
                    ? EVENT_CONFIG.revealLabel
                    : definition.lockLabel}
                </strong>
              </div>
              <div>
                <span>Event timezone</span>
                <strong>{EVENT_CONFIG.timezoneLabel}</strong>
              </div>
            </div>
          </div>

          <aside className="market-snapshot detail-snapshot">
            <div className="snapshot-header">
              <span>Current forecast</span>
              <span className="open-pill">Play credits</span>
            </div>

            {isBinary ? (
              <>
                <div className="snapshot-sides">
                  {definition.outcomes.map((outcome, index) => (
                    <div className={index === 1 ? "align-right" : undefined} key={outcome.key}>
                      <span
                        className="side-kicker"
                        style={{ color: outcome.color }}
                      >
                        {outcome.label}
                      </span>
                      <strong>{percentages[outcome.key]}%</strong>
                      <small>{percentages[outcome.key]} credit price</small>
                    </div>
                  ))}
                </div>
                <div
                  className="odds-bar outcome-odds-bar"
                  aria-label={definition.outcomes
                    .map(
                      (outcome) =>
                        `${percentages[outcome.key]} percent ${outcome.label}`,
                    )
                    .join(" and ")}
                >
                  {definition.outcomes.map((outcome) => (
                    <span
                      key={outcome.key}
                      style={{
                        width: `${percentages[outcome.key]}%`,
                        backgroundColor: outcome.color,
                      }}
                    />
                  ))}
                </div>
              </>
            ) : (
              <div className="forecast-outcome-list">
                {definition.outcomes.map((outcome) => (
                  <div className="forecast-outcome" key={outcome.key}>
                    <div>
                      <span>
                        <i
                          aria-hidden="true"
                          style={{ backgroundColor: outcome.color }}
                        />
                        {outcome.shortLabel}
                      </span>
                      <strong>{percentages[outcome.key]}%</strong>
                    </div>
                    <span className="forecast-track" aria-hidden="true">
                      <i
                        style={{
                          width: `${percentages[outcome.key]}%`,
                          backgroundColor: outcome.color,
                        }}
                      />
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="snapshot-footer">
              <span>
                {definition.seededParticipants +
                  (runtime.predictions.length > 0 ? 1 : 0)}{" "}
                predictors
              </span>
              <span>{formatCredits(totalPool)} credits forecast</span>
            </div>

            <div className="hero-trend" id="trend">
              <div className="hero-trend-heading">
                <div>
                  <span>Prediction trend</span>
                  <small>All outcomes over time</small>
                </div>
                <strong className={trendChange >= 0 ? "trend-up" : "trend-down"}>
                  {trendChange >= 0 ? "+" : ""}
                  {trendChange} pts {focusOutcome.shortLabel}
                </strong>
              </div>
              <TrendChart
                points={runtime.trend}
                outcomes={definition.outcomes}
                focusOutcomeKey={focusOutcome.key}
              />
              <div className="hero-trend-footer">
                <span>Since {runtime.trend[0]?.label ?? "market open"}</span>
                <strong>
                  Latest: {runtime.trend.at(-1)?.source ?? "Market opened"}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section
        className={`trading-layout prediction-composer tone-${definition.tone}`}
        id="prediction-composer"
      >
        <article className="market-card">
          <header className="section-heading">
            <div>
              <span className="section-kicker">Step 1 of 2</span>
              <h2>Choose one outcome</h2>
            </div>
            <span className="market-id">
              {definition.outcomes.length} choices · 1 winner
            </span>
          </header>

          <p className="market-question">{definition.question}</p>

          <div className={`outcome-grid${isBinary ? "" : " is-multi"}`}>
            {definition.outcomes.map((outcome) => {
              const isSelected = selectedOutcome.key === outcome.key;
              return (
                <button
                  className={`outcome-card dynamic-outcome-card${
                    isSelected ? " selected" : ""
                  }`}
                  style={outcomeStyle(outcome.color)}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => setSelected(outcome.key)}
                  key={outcome.key}
                >
                  <span className="choice-row">
                    <span className="choice-dot" aria-hidden="true" />
                    <span>{outcome.label}</span>
                    <span className="choice-check" aria-hidden="true">
                      {isSelected ? "✓" : ""}
                    </span>
                  </span>
                  <span className="price-row">
                    <strong>{percentages[outcome.key]}¢</strong>
                    <span>{percentages[outcome.key]}% chance</span>
                  </span>
                  <span className="card-caption">
                    {isSelected
                      ? "Selected for this prediction"
                      : `Choose ${outcome.shortLabel}`}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="market-explainer">
            <span className="info-mark" aria-hidden="true">
              i
            </span>
            <p>
              Choose one outcome for this market. Your prediction does not
              change any other family question.
            </p>
          </div>

          {positions.length > 0 && (
            <div className="position-block">
              <div className="position-title-row">
                <h3>Your position in this market</h3>
                <span>{formatCredits(totalSpent)} credits committed</span>
              </div>
              <div className="position-list">
                {positions.map((position) => (
                  <div className="position-item" key={position.key}>
                    <span
                      className="position-side dynamic-position-side"
                      style={{ backgroundColor: position.color }}
                      aria-hidden="true"
                    />
                    <strong>{position.label}</strong>
                    <span>
                      {formatCredits(position.spent)} spent ·{" "}
                      {formatCredits(position.shares)} if correct
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>

        <aside className="ticket-card" aria-labelledby="ticket-heading">
          <div className="ticket-topline">
            <div>
              <span className="section-kicker">Step 2 of 2</span>
              <h2 id="ticket-heading">Set your amount</h2>
            </div>
            <span
              className="ticket-side dynamic-ticket-side"
              style={outcomeStyle(selectedOutcome.color)}
            >
              {selectedOutcome.shortLabel}
            </span>
          </div>

          <div className="available-row">
            <span>Shared event wallet</span>
            <strong>{formatCredits(state.balance)} credits</strong>
          </div>

          <label className="amount-label" htmlFor="stake">
            <span>Prediction amount</span>
            <span>{EVENT_CONFIG.minimumPrediction} credit minimum</span>
          </label>
          <div className="amount-input-wrap">
            <input
              id="stake"
              type="number"
              min={EVENT_CONFIG.minimumPrediction}
              max={state.balance}
              step="25"
              value={stake}
              disabled={state.balance < EVENT_CONFIG.minimumPrediction}
              onChange={(event) =>
                setStake(
                  Math.max(
                    0,
                    Math.min(Number(event.target.value), state.balance),
                  ),
                )
              }
              aria-label="Prediction amount in play credits"
            />
            <span>credits</span>
          </div>

          {state.balance >= EVENT_CONFIG.minimumPrediction && (
            <input
              className="stake-range"
              type="range"
              min={EVENT_CONFIG.minimumPrediction}
              max={state.balance}
              step="25"
              value={Math.max(EVENT_CONFIG.minimumPrediction, stake)}
              onChange={(event) => setStake(Number(event.target.value))}
              aria-label="Adjust prediction amount"
            />
          )}

          <div className="preset-row" aria-label="Quick prediction amounts">
            {[100, 250, 500].map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={amount > state.balance}
                className={stake === amount ? "active" : ""}
                onClick={() => setStake(amount)}
              >
                {amount}
              </button>
            ))}
            <button
              type="button"
              disabled={state.balance < EVENT_CONFIG.minimumPrediction}
              className={stake === state.balance ? "active" : ""}
              onClick={() => setStake(state.balance)}
            >
              Max
            </button>
          </div>

          <dl className="ticket-math">
            <div>
              <dt>Current price</dt>
              <dd>{Math.round(currentPrice * 100)} credits / share</dd>
            </div>
            <div>
              <dt>Shares received</dt>
              <dd>{projectedPayout ? formatCredits(projectedPayout) : "—"}</dd>
            </div>
            <div className="return-row">
              <dt>Estimated payout</dt>
              <dd>
                {projectedPayout
                  ? `${formatCredits(projectedPayout)} credits`
                  : "—"}
              </dd>
            </div>
            <div className="profit-row">
              <dt>Estimated profit</dt>
              <dd>
                {projectedProfit
                  ? `+${formatCredits(projectedProfit)} credits`
                  : "—"}
              </dd>
            </div>
          </dl>

          <button
            className="place-button"
            type="button"
            disabled={state.balance < EVENT_CONFIG.minimumPrediction}
            onClick={submitPrediction}
          >
            {state.balance < EVENT_CONFIG.minimumPrediction
              ? "All credits committed"
              : `Place ${selectedOutcome.shortLabel} prediction`}
            <span aria-hidden="true">→</span>
          </button>
          <p className="play-note">
            One market only. Play credits have no cash value.
          </p>
        </aside>
      </section>

      <section className="history-layout history-layout-single">
        <aside className="predictions-card" aria-labelledby="predictions-heading">
          <header className="predictions-heading">
            <div>
              <span className="section-kicker">This market only</span>
              <h2 id="predictions-heading">Your prediction receipts</h2>
            </div>
            <span className="prediction-count">
              {runtime.predictions.length} placed
            </span>
          </header>

          {runtime.predictions.length === 0 ? (
            <div className="prediction-empty compact-empty">
              <span aria-hidden="true">0</span>
              <h3>No predictions here yet</h3>
              <p>
                Your time, odds, credits, and estimated winnings for this market
                will appear after you use the ticket above.
              </p>
            </div>
          ) : (
            <div className="prediction-list">
              {runtime.predictions.map((prediction) => {
                const outcome = definition.outcomes.find(
                  (candidate) => candidate.key === prediction.outcome,
                );
                if (!outcome) return null;
                return (
                  <article className="prediction-record" key={prediction.id}>
                    <header>
                      <span
                        className="record-side dynamic-record-side"
                        style={outcomeStyle(outcome.color)}
                      >
                        {outcome.shortLabel}
                      </span>
                      <time dateTime={prediction.placedAt}>
                        {formatPredictionTime(prediction.placedAt)}
                      </time>
                    </header>
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
                      <div className="record-profit">
                        <dt>Est. profit</dt>
                        <dd>+{formatCredits(prediction.estimatedProfit)} cr</dd>
                      </div>
                    </dl>
                  </article>
                );
              })}
            </div>
          )}
          <div className="prediction-disclaimer-row">
            <p className="prediction-disclaimer">
              Estimates assume the selected outcome is correct.
            </p>
            <Link href="/portfolio">View all my picks →</Link>
          </div>
        </aside>
      </section>

      <section className="market-rules-layout" aria-labelledby="rules-heading">
        <article className="rules-card">
          <span className="section-kicker">Contract terms</span>
          <h2 id="rules-heading">How this market resolves</h2>
          <ol>
            {definition.rules.map((rule, index) => (
              <li key={rule}>
                <span>{index + 1}</span>
                <p>{rule}</p>
              </li>
            ))}
          </ol>
        </article>
        <aside className="resolution-source-card">
          <span className="section-kicker">Resolution source</span>
          <h2>Parent-approved confirmation</h2>
          <p>{definition.resolutionSource}</p>
          <dl>
            <div>
              <dt>Timezone</dt>
              <dd>{EVENT_CONFIG.timezone}</dd>
            </div>
            <div>
              <dt>Lock time</dt>
              <dd>{definition.lockLabel}</dd>
            </div>
            <div>
              <dt>Cash value</dt>
              <dd>None</dd>
            </div>
          </dl>
        </aside>
      </section>

      {toast && (
        <div className="toast" role="status" aria-live="polite">
          <span aria-hidden="true">✓</span>
          {toast}
        </div>
      )}
    </>
  );
}
