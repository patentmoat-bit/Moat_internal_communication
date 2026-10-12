import type { Metadata } from "next";
import Link from "next/link";
import { Clock, ShieldX } from "lucide-react";
import { Logo } from "@/components/shell/logo";
import { MicrosoftButton } from "@/components/landing/microsoft-button";

export const metadata: Metadata = { title: "Access" };

const COPY: Record<string, { title: string; body: string; denied?: boolean }> = {
  pending: {
    title: "Your request is with an administrator",
    body: "You signed in with Microsoft, so we know who you are. An administrator needs to approve your access and choose your role. You can sign in again once they have.",
  },
  rejected: {
    title: "Access was not granted",
    body: "An administrator reviewed your request and did not approve it. If you think this is a mistake, contact them directly.",
    denied: true,
  },
  suspended: {
    title: "Your access is suspended",
    body: "An administrator has paused your access. Contact them to have it restored.",
    denied: true,
  },
};

export default async function RequestAccessPage({ searchParams }: { searchParams: Promise<{ state?: string }> }) {
  const { state } = await searchParams;
  const c = COPY[state ?? "pending"] ?? COPY.pending;
  const Icon = c.denied ? ShieldX : Clock;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[440px]">
        <Link href="/" className="mb-7 flex items-center gap-2.5" aria-label="MOAT home">
          <Logo className="size-7 text-accent" />
          <span className="font-document text-[19px] font-semibold tracking-[-0.015em] text-ink">MOAT</span>
        </Link>
        <span className={`flex size-11 items-center justify-center rounded-full ${c.denied ? "bg-critical-soft text-critical" : "bg-accent-soft text-accent-text"}`}>
          <Icon className="size-5" aria-hidden />
        </span>
        <h1 className="font-document mt-4 text-[26px] font-semibold leading-tight tracking-[-0.016em] text-ink">{c.title}</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-muted">{c.body}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <MicrosoftButton label="Sign in with a different account" />
          <Link href="/" className="inline-flex items-center justify-center rounded-[var(--radius-md)] px-4 py-3 text-[13px] text-muted hover:text-ink">
            Back to start
          </Link>
        </div>
      </div>
    </main>
  );
}
