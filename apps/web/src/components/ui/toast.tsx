"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  HelpCircle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastOptions {
  title?: string;
  duration?: number;
}

export interface ToastItem {
  id: string;
  type: ToastType;
  message: string;
  title?: string;
  duration: number;
}

export interface ConfirmDialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
}

type ToastListener = (toasts: ToastItem[]) => void;
type ConfirmListener = (state: ConfirmState | null) => void;

interface ConfirmState {
  options: ConfirmDialogOptions;
  resolve: (confirmed: boolean) => void;
}

let activeToasts: ToastItem[] = [];
let toastListeners: ToastListener[] = [];

let activeConfirm: ConfirmState | null = null;
let confirmListeners: ConfirmListener[] = [];

function notifyToasts() {
  toastListeners.forEach((listener) => listener([...activeToasts]));
}

function notifyConfirm() {
  confirmListeners.forEach((listener) => listener(activeConfirm));
}

function addToast(type: ToastType, message: string, options?: ToastOptions) {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const duration = options?.duration ?? 4000;
  const newToast: ToastItem = {
    id,
    type,
    message,
    title: options?.title,
    duration,
  };

  activeToasts = [newToast, ...activeToasts].slice(0, 6);
  notifyToasts();

  if (duration > 0) {
    setTimeout(() => {
      removeToast(id);
    }, duration);
  }

  return id;
}

function removeToast(id: string) {
  activeToasts = activeToasts.filter((t) => t.id !== id);
  notifyToasts();
}

/** Standalone toast API callable anywhere across client code */
export const toast = {
  success: (message: string, options?: ToastOptions) => addToast("success", message, options),
  error: (message: string, options?: ToastOptions) => addToast("error", message, options),
  warning: (message: string, options?: ToastOptions) => addToast("warning", message, options),
  info: (message: string, options?: ToastOptions) => addToast("info", message, options),
  dismiss: (id: string) => removeToast(id),
  confirm: (options: string | ConfirmDialogOptions): Promise<boolean> => {
    const opts: ConfirmDialogOptions =
      typeof options === "string" ? { message: options } : options;

    return new Promise<boolean>((resolve) => {
      activeConfirm = {
        options: opts,
        resolve: (val) => {
          activeConfirm = null;
          notifyConfirm();
          resolve(val);
        },
      };
      notifyConfirm();
    });
  },
};

export function useToast() {
  return { toast, confirm: toast.confirm };
}

/** Global UI Provider for displaying toasts and replacing native browser confirm/alert popups */
export function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastItem[]>(activeToasts);
  const [confirmState, setConfirmState] = React.useState<ConfirmState | null>(activeConfirm);

  React.useEffect(() => {
    toastListeners.push(setToasts);
    confirmListeners.push(setConfirmState);

    // Replace native browser window.alert with in-app toast notification
    if (typeof window !== "undefined") {
      window.alert = (msg?: any) => {
        const text = String(msg ?? "");
        if (/error|failed|failure|cannot|denied/i.test(text)) {
          toast.error(text);
        } else if (/warning|caution|please/i.test(text)) {
          toast.warning(text);
        } else if (/success|completed|saved|copied/i.test(text)) {
          toast.success(text);
        } else {
          toast.info(text);
        }
      };
    }

    return () => {
      toastListeners = toastListeners.filter((l) => l !== setToasts);
      confirmListeners = confirmListeners.filter((l) => l !== setConfirmState);
    };
  }, []);

  // Handle ESC key for confirmation modal
  React.useEffect(() => {
    if (!confirmState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        confirmState.resolve(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [confirmState]);

  return (
    <>
      {children}

      {/* TOAST NOTIFICATIONS CONTAINER */}
      <div
        aria-live="polite"
        className="fixed top-5 right-5 z-[9999] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none select-none px-4 sm:px-0"
      >
        <AnimatePresence>
          {toasts.map((t) => {
            const Icon =
              t.type === "success"
                ? CheckCircle2
                : t.type === "error"
                ? AlertCircle
                : t.type === "warning"
                ? AlertTriangle
                : Info;

            const borderClass =
              t.type === "success"
                ? "border-emerald-500/40 bg-surface/95 text-emerald-950 dark:text-emerald-100 shadow-emerald-500/10"
                : t.type === "error"
                ? "border-rose-500/40 bg-surface/95 text-rose-950 dark:text-rose-100 shadow-rose-500/10"
                : t.type === "warning"
                ? "border-amber-500/40 bg-surface/95 text-amber-950 dark:text-amber-100 shadow-amber-500/10"
                : "border-sky-500/40 bg-surface/95 text-sky-950 dark:text-sky-100 shadow-sky-500/10";

            const iconClass =
              t.type === "success"
                ? "text-emerald-600 bg-emerald-500/15"
                : t.type === "error"
                ? "text-rose-600 bg-rose-500/15"
                : t.type === "warning"
                ? "text-amber-600 bg-amber-500/15"
                : "text-sky-600 bg-sky-500/15";

            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: -16, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.95, transition: { duration: 0.15 } }}
                className={`pointer-events-auto flex items-start gap-3 rounded-2xl border p-4 shadow-xl backdrop-blur-md transition-all ${borderClass}`}
              >
                <div className={`flex size-8 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
                  <Icon className="size-4.5" />
                </div>

                <div className="flex-1 min-w-0 pt-0.5">
                  {t.title && <h5 className="text-xs font-bold leading-snug text-ink">{t.title}</h5>}
                  <p className="text-xs font-medium text-ink/90 leading-relaxed break-words">{t.message}</p>
                </div>

                <button
                  type="button"
                  onClick={() => removeToast(t.id)}
                  className="rounded-lg p-1 text-muted hover:text-ink hover:bg-line/40 transition shrink-0"
                  aria-label="Dismiss toast"
                >
                  <X className="size-3.5" />
                </button>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* CONFIRMATION DIALOG MODAL (REPLACES BROWSER WINDOW.CONFIRM) */}
      <AnimatePresence>
        {confirmState && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-start gap-3.5">
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                    confirmState.options.danger
                      ? "bg-rose-500/15 text-rose-600"
                      : "bg-accent/15 text-accent"
                  }`}
                >
                  {confirmState.options.danger ? (
                    <AlertTriangle className="size-5" />
                  ) : (
                    <HelpCircle className="size-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-ink">
                    {confirmState.options.title || "Confirm Action"}
                  </h4>
                  <p className="text-xs text-muted mt-1 leading-relaxed">
                    {confirmState.options.message}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={() => confirmState.resolve(false)}
                  className="rounded-xl border border-line bg-canvas px-4 py-2 text-xs font-semibold text-ink hover:bg-hover hover:border-line-strong transition"
                >
                  {confirmState.options.cancelText || "Cancel"}
                </button>
                <button
                  type="button"
                  onClick={() => confirmState.resolve(true)}
                  className={`rounded-xl px-4 py-2 text-xs font-bold text-white shadow-xs transition ${
                    confirmState.options.danger
                      ? "bg-rose-600 hover:bg-rose-700"
                      : "bg-accent hover:brightness-110"
                  }`}
                >
                  {confirmState.options.confirmText || "Confirm"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
