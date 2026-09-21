"use client";

import * as React from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@moat/ui";

type Choice = "light" | "dark" | "system";

const STORAGE_KEY = "moat-theme";

/* ---------------------------------------------------------------------------
   The theme preference lives in localStorage, which React does not own. It is
   read through useSyncExternalStore so the server renders "system", the client
   corrects to the stored value on hydration, and other tabs stay in sync.
   --------------------------------------------------------------------------- */

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("storage", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", listener);
  };
}

function getSnapshot(): Choice {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : "system";
  } catch {
    // Storage throws outright in some privacy modes; fall back to system.
    return "system";
  }
}

function getServerSnapshot(): Choice {
  return "system";
}

function setTheme(next: Choice) {
  const root = document.documentElement;
  if (next === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", next);

  try {
    if (next === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Preference will not persist, but the page still switches.
  }
  listeners.forEach((listener) => listener());
}

const options: { value: Choice; icon: typeof Sun; label: string }[] = [
  { value: "light", icon: Sun, label: "Light theme" },
  { value: "system", icon: Monitor, label: "Match system theme" },
  { value: "dark", icon: Moon, label: "Dark theme" },
];

export function ThemeToggle() {
  const choice = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-[var(--radius-sm)] border border-line bg-sunken p-0.5"
    >
      {options.map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          role="radio"
          aria-checked={choice === value}
          aria-label={label}
          title={label}
          onClick={() => setTheme(value)}
          className={cn(
            "flex size-6 items-center justify-center rounded-[var(--radius-xs)] transition-colors",
            choice === value
              ? "bg-surface text-ink shadow-[var(--shadow-sm)]"
              : "text-faint hover:text-muted",
          )}
        >
          <Icon className="size-[13px]" />
        </button>
      ))}
    </div>
  );
}
