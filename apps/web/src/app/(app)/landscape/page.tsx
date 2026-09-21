import type { Metadata } from "next";
import { PlannedSurface } from "@/components/shell/planned-surface";

export const metadata: Metadata = { title: "Landscape" };

export default function Page() {
  return (
    <PlannedSurface
      title="Landscape"
      phase={4}
      scope="Precomputed cluster maps over a selected corpus slice, with the retrieval and projection versions recorded alongside every view."
    />
  );
}
