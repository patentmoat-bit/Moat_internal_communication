import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { InventionForm } from "@/components/invention/invention-form";
import { getSession } from "@/lib/session";
import { PERMISSIONS, can } from "@/lib/types";

export const metadata: Metadata = { title: "New disclosure" };

export default async function NewInventionPage() {
  const session = await getSession();
  // Checked here as well as in the API. The API is the boundary that matters;
  // this only avoids showing a form that would be refused on submit.
  if (!can(session, PERMISSIONS.inventionCreate)) redirect("/inventions");

  return (
    <>
      <PageHeader
        crumbs={[{ label: "Inventions", href: "/inventions" }, { label: "New" }]}
        title="New disclosure"
        caption="Describe the invention while it is fresh. Nothing here is published, and raising a disclosure does not commit anyone to filing."
      />
      <div className="px-6 py-5">
        <InventionForm />
      </div>
    </>
  );
}
