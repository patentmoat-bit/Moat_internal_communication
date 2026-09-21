import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Logo } from "@/components/shell/logo";
import { LoginForm } from "@/components/auth/login-form";
import { getSession } from "@/lib/session";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  // Already signed in: do not show a login form to an authenticated user.
  if (await getSession()) redirect("/inventions");

  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas px-4 py-12">
      <div className="w-full max-w-[380px]">
        <div className="mb-7 flex items-center gap-2.5">
          <Logo className="size-7 text-accent" />
          <span className="font-document text-[19px] font-semibold tracking-[-0.015em] text-ink">
            MOAT
          </span>
        </div>

        <h1 className="font-document text-[24px] font-semibold leading-tight tracking-[-0.016em] text-ink">
          Sign in
        </h1>
        <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
          Disclosures held here are unpublished and confidential. Do not sign in on a shared
          machine.
        </p>

        <LoginForm />
      </div>
    </main>
  );
}
