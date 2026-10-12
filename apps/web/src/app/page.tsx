import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, FileSearch, Lightbulb, PenLine, ShieldCheck, Wallet, Landmark, Palette } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { MicrosoftButton } from "@/components/landing/microsoft-button";
import { landingFor } from "@/components/shell/nav";
import { getSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Protect what you invent",
  description: "MOAT keeps invention disclosures, prior-art research, drafting and approvals in one confidential workspace. Sign in with your Microsoft 365 account.",
};

const FEATURES = [
  { icon: Lightbulb, title: "Capture disclosures", body: "Raise an invention while it is fresh and attach every supporting file in one place." },
  { icon: FileSearch, title: "Research and track matters", body: "Move each matter through disclosure, prior-art search and review, with a record of every step." },
  { icon: PenLine, title: "Draft and review", body: "Drafters and analysts work the same claim set, with status changes that notify the next person." },
  { icon: ClipboardCheck, title: "Decide with context", body: "Executives approve filings from one queue, with the review history alongside." },
];

const ROLES = [
  { icon: Landmark, name: "Executive", body: "Approvals, docket and portfolio oversight." },
  { icon: FileSearch, name: "Patent Analyst", body: "Prior-art research, matters and review notes." },
  { icon: PenLine, name: "Patent Drafter", body: "Specifications, claims and revisions." },
  { icon: Palette, name: "Design Team", body: "Patent drawings and figure requests." },
  { icon: Wallet, name: "Finance", body: "Filing fees and the payment docket." },
  { icon: ShieldCheck, name: "Administrator", body: "Users, roles and access." },
];

export default async function Home() {
  // Someone approved and signed in with Microsoft goes straight to their workspace.
  const session = await getSession();
  if (session?.sso) redirect(landingFor(session.permissions));

  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="MOAT home">
          <Logo className="size-7 text-accent" />
          <span className="font-document text-[19px] font-semibold tracking-[-0.015em]">MOAT</span>
        </Link>
        <MicrosoftButton label="Sign in" className="!px-4 !py-2 !text-[13px]" />
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 pb-16 pt-12 sm:px-6 sm:pt-20">
          <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-accent-text">Intellectual property workspace</p>
          <h1 className="font-document mt-4 max-w-3xl text-[38px] font-semibold leading-[1.08] tracking-[-0.022em] sm:text-[56px]">
            Protect what you invent, from first idea to filing.
          </h1>
          <p className="mt-5 max-w-2xl text-[16px] leading-relaxed text-muted sm:text-[18px]">
            MOAT keeps disclosures, prior-art research, drafting and executive approvals in one confidential workspace, so nothing is lost between the people who handle it.
          </p>

          <div className="mt-9">
            <MicrosoftButton label="Continue with Microsoft" className="w-full sm:w-auto sm:min-w-[300px]" />
          </div>
        </section>

        <section className="border-y border-line bg-surface">
          <div className="mx-auto grid max-w-6xl gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <div key={title} className="bg-surface px-5 py-7 sm:px-6">
                <Icon className="size-5 text-accent" aria-hidden />
                <h2 className="mt-3 text-[14.5px] font-semibold">{title}</h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">{body}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
          <h2 className="font-document text-[26px] font-semibold tracking-[-0.016em] sm:text-[30px]">One workspace, the right view for each person</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-muted">
            What you see depends on your role. New accounts start with analyst access, and an administrator assigns the rest.
          </p>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {ROLES.map(({ icon: Icon, name, body }) => (
              <li key={name} className="flex gap-3 rounded-[var(--radius-md)] border border-line bg-surface p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-accent-soft text-accent-text">
                  <Icon className="size-[18px]" aria-hidden />
                </span>
                <div>
                  <p className="text-[14px] font-semibold">{name}</p>
                  <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="border-t border-line bg-sunken">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-5 px-4 py-10 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="font-document text-[22px] font-semibold tracking-[-0.012em]">Disclosures here are unpublished and confidential.</h2>
              <p className="mt-1 text-[13px] text-muted">Sign in only on a device you trust.</p>
            </div>
            <MicrosoftButton label="Continue with Microsoft" />
          </div>
        </section>
      </main>

      <footer className="mx-auto max-w-6xl px-4 py-6 text-[12px] text-faint sm:px-6">© {new Date().getFullYear()} MOAT</footer>
    </div>
  );
}
