import { redirect } from "next/navigation";

export default function TrackerRedirectPage() {
  redirect("/matters?tab=tracker");
}
