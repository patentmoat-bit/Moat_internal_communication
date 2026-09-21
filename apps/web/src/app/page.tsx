import { redirect } from "next/navigation";
import { landingFor } from "@/components/shell/nav";
import { getSession } from "@/lib/session";

export default async function Home() {
  // Where someone lands depends on what they can do. A finance manager has no
  // Inventions page to land on, and sending everyone to a fixed route would
  // either loop or show them an empty screen.
  const session = await getSession();
  if (!session) redirect("/login");
  redirect(landingFor(session.permissions));
}
