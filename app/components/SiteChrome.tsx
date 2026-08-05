"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { formatCredits } from "../market-config";
import { useMarketStore } from "../market-store";

const NAV_ITEMS = [
  { href: "/", label: "Predict" },
  { href: "/portfolio", label: "My picks" },
  { href: "/#event-log", label: "Updates" },
];

export function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { state, resetDemo } = useMarketStore();

  return (
    <div className="site-shell">
      <header className="topbar">
        <Link className="brand" href="/" aria-label="Stork Market home">
          <span className="brand-mark" aria-hidden="true">
            SM
          </span>
          <span>
            <strong>Stork Market</strong>
            <small>The family prediction exchange</small>
          </span>
        </Link>

        <nav className="nav-links" aria-label="Primary navigation">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                item.href !== "/#event-log" &&
                (pathname === item.href ||
                  (item.href === "/" && pathname.startsWith("/markets/")))
                  ? "page"
                  : undefined
              }
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link
          className="balance-chip"
          href="/portfolio"
          aria-label={`Your play credit balance is ${formatCredits(state.balance)} credits`}
        >
          <span>My balance</span>
          <strong>{formatCredits(state.balance)}</strong>
          <small>credits</small>
        </Link>
      </header>

      <nav className="mobile-section-nav" aria-label="Quick navigation">
        {NAV_ITEMS.map((item) => (
          <Link key={item.href} href={item.href}>
            {item.label}
          </Link>
        ))}
      </nav>

      <main id="top" className="page-content">
        {children}
      </main>

      <footer className="footer">
        <div>
          <strong>Stork Market</strong>
          <span>One prediction at a time. Play credits only.</span>
        </div>
        <button type="button" onClick={resetDemo}>
          Reset local demo
        </button>
      </footer>
    </div>
  );
}
