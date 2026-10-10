import { redirect } from "next/navigation";

// The tested /vote2 flow is now the main /vote page. Keep old links working.
export default function Vote2Page() {
  redirect("/vote");
}
