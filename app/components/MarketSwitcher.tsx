"use client";

import Link from "next/link";
import { MARKET_DEFINITIONS } from "../market-config";

export function MarketSwitcher({ activeSlug }: { activeSlug: string }) {
  return (
    <nav className="market-switcher" aria-label="Switch prediction market">
      <div className="market-switcher-heading">
        <span>One market at a time</span>
        <strong>Switch prediction</strong>
      </div>
      <div className="market-switcher-options">
        {MARKET_DEFINITIONS.map((market) => {
          const isActive = market.slug === activeSlug;
          const href = market.featured ? "/" : `/markets/${market.slug}`;
          return (
            <Link
              key={market.slug}
              className={isActive ? "active" : undefined}
              href={href}
              aria-current={isActive ? "page" : undefined}
            >
              <i
                aria-hidden="true"
                style={{ backgroundColor: market.outcomes[0]?.color }}
              />
              <span>
                <small>{market.group}</small>
                <strong>{market.shortTitle}</strong>
              </span>
              {isActive && <em>Current</em>}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
