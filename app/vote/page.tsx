import type { Metadata } from "next";
import { VotePage } from "../event/VotePage";

export const metadata: Metadata = { title: "Make your guess | Stork Market" };

export default function VotingPage() {
  return <VotePage />;
}
