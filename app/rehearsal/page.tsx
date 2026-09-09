import type { Metadata } from "next";
import { RehearsalPage } from "../event/Rehearsal";

export const metadata: Metadata = {
  title: "Rehearse the reveal | Stork Market",
  robots: { index: false, follow: false },
};

export default function Rehearsal() {
  return <RehearsalPage />;
}
