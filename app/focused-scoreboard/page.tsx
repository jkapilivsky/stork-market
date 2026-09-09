import type { Metadata } from "next";
import { FocusedScoreboard } from "../event/FocusedScoreboard";

export const metadata: Metadata = {
  title: "Focused scoreboard | Stork Market",
  description: "A focused live family forecast for Baby K’s big reveal.",
  robots: { index: false, follow: false },
};

export default function FocusedScoreboardPage() {
  return <FocusedScoreboard />;
}
