import type { Metadata } from "next";
import { HostPage } from "../event/HostControls";

export const metadata: Metadata = {
  title: "Host setup | Stork Market",
  robots: { index: false, follow: false },
};

export default function HostsPage() {
  return <HostPage />;
}
