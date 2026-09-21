"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { Button, Field, Input } from "@moat/ui";
import { api, ApiRequestError } from "@/lib/api";

export function LoginForm() {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError(null);
    try {
      await api("/auth/login", {
        method: "POST",
        json: {
          email: String(form.get("email") ?? "").trim(),
          password: String(form.get("password") ?? ""),
        },
      });
      // A full navigation, not a client push: the server layout must re-read
      // the new cookie before the shell renders.
      router.replace("/inventions");
      router.refresh();
    } catch (cause) {
      setError(
        cause instanceof ApiRequestError
          ? cause.body.message
          : "Could not reach the server. Is the API running?",
      );
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="mt-7 space-y-4">
      <Field label="Work email" htmlFor="email" required>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          placeholder="you@company.com"
        />
      </Field>

      <Field label="Password" htmlFor="password" required>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
      </Field>

      {error ? (
        <p
          role="alert"
          className="rounded-[var(--radius-sm)] border border-critical/25 bg-critical-soft px-3 py-2 text-[12.5px] leading-relaxed text-critical"
        >
          {error}
        </p>
      ) : null}

      <Button type="submit" variant="primary" size="lg" disabled={pending} className="w-full">
        {pending ? <LoaderCircle className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      {process.env.NODE_ENV !== "production" ? (
        <div className="rounded-[var(--radius-sm)] border border-line bg-sunken px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-faint">
            Development accounts
          </p>
          <ul className="mt-1.5 space-y-0.5 text-[11.5px] leading-relaxed text-muted">
            <li>
              <code className="text-accent-text">priya@northwind.example</code> — researcher
            </li>
            <li>
              <code className="text-accent-text">mei@northwind.example</code> — counsel
            </li>
            <li>
              <code className="text-accent-text">tara@ipcounsel.example</code> — both workspaces
            </li>
          </ul>
          <p className="mt-1.5 text-[11.5px] text-faint">
            Password <code className="text-muted">moat-dev-password</code>
          </p>
        </div>
      ) : null}
    </form>
  );
}
