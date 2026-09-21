import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { PageHeader } from "@/components/shell/page-header";
import { InventionEditor } from "@/components/invention/invention-editor";
import { serverApi } from "@/lib/server-api";
import { getSession } from "@/lib/session";
import { PERMISSIONS, can, type InventionDetail } from "@/lib/types";

export const metadata: Metadata = { title: "Edit disclosure" };

export default async function EditInventionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [invention, session] = await Promise.all([
    serverApi<InventionDetail>(`/inventions/${id}`),
    getSession(),
  ]);

  if (!invention) notFound();
  if (!can(session, PERMISSIONS.inventionUpdate)) redirect(`/inventions/${id}`);
  // A filed disclosure is immutable; the API refuses the write regardless.
  if (invention.status === "filed") redirect(`/inventions/${id}`);

  return (
    <>
      <PageHeader
        crumbs={[
          { label: "Inventions", href: "/inventions" },
          { label: invention.ref, href: `/inventions/${invention.id}` },
          { label: "Edit" },
        ]}
        title={`Editing revision ${invention.revision}`}
        caption="Saving creates a new revision. Any review decision recorded against the current revision stops applying to the new text."
      />
      <div className="px-6 py-5">
        <InventionEditor invention={invention} />
      </div>
    </>
  );
}
