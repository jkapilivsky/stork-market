import type { Metadata } from "next";
import { SiteChrome } from "./components/SiteChrome";
import "./globals.css";
import { MarketProvider } from "./market-store";

export const metadata: Metadata = {
  title: "Stork Market | The Family Prediction Exchange",
  description:
    "A playful family forecast with one focused prediction market at a time and no real-money wagering.",
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
