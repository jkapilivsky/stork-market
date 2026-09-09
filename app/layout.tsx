import type { Metadata } from "next";
import { SiteChrome } from "./components/SiteChrome";
import "./globals.css";
import "./event/event.css";
import "./event/celebration.css";
import { MarketProvider } from "./market-store";

export const metadata: Metadata = {
  title: "Stork Market | Baby K’s Big Reveal",
  description:
    "A little guess. A lot of love. Leave a note, pick your team, and celebrate Baby K’s big reveal together.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <MarketProvider>
          <SiteChrome>{children}</SiteChrome>
        </MarketProvider>
      </body>
    </html>
  );
}
