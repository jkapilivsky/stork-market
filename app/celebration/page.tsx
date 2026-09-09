import type { Metadata } from "next";
import { CelebrationPage } from "../event/Celebration";

export const metadata: Metadata = { title: "Celebrate Baby K | Stork Market" };

export default function Celebration() {
  return <CelebrationPage />;
}
