import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { MicrosoftButton } from "@/components/landing/microsoft-button";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

const MESSAGES: Record<string, string> = {
  sso_not_configured: "Microsoft sign-in is not configured on this server. Ask your administrator.",
  sso_denied: "Sign-in was cancelled or your organization did not allow it.",
  sso_state: "That sign-in link expired. Please try again.",
  sso_blocked: "Only accounts from this organization can sign in. Guest and outside accounts are not allowed.",
  sso_failed: "Microsoft sign-in did not complete. Try again, or contact your administrator if it keeps happening.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if ((await getSession())?.sso) redirect("/");
  const { error } = await searchParams;
  const message = error ? (MESSAGES[error] ?? MESSAGES.sso_failed) : null;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[400px]">
        <Link href="/" className="mb-7 flex items-center gap-2.5" aria-label="MOAT home">
          <Logo className="size-7 text-accent" />
          <span className="font-document text-[19px] font-semibold tracking-[-0.015em] text-ink">MOAT</span>
        </Link>

        <h1 className="font-document text-[26px] font-semibold leading-tight tracking-[-0.016em] text-ink">Sign in or sign up</h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Use your work Microsoft 365 account. There is no separate password, and your first sign-in creates your account.
        </p>

        {message ? (
          <p role="alert" className="mt-5 rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-3 py-2 text-[12.5px] leading-relaxed text-critical">
            {message}
          </p>
        ) : null}

        <MicrosoftButton label="Continue with Microsoft" className="mt-6 w-full" />

        <p className="mt-6 text-[12px] leading-relaxed text-faint">
          Disclosures held here are unpublished and confidential. Do not sign in on a shared machine.
        </p>
      </div>
    </main>
  );
}
