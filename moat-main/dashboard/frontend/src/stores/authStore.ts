"use client";

import { create } from "zustand";
import type { User, AppRole } from "@/types";
import { createClient } from "@/lib/supabase/client";

// ─────────────────────────────────────────────────────────────────────────────
// MOAT Auth Store — powered by Supabase
// All session state is derived from the Supabase client (cookie-based).
// No mock tokens. No localStorage hacks.
// ─────────────────────────────────────────────────────────────────────────────

function normalizeUser(raw: any): User {
  return {
    id: raw.id,
    email: raw.email ?? "",
    name: raw.name ?? raw.email?.split("@")[0] ?? "User",
    role: (raw.role as AppRole) ?? "Patent Analyst",
    department: raw.department ?? undefined,
    company: raw.company ?? undefined,
    permissions: raw.permissions ?? [],
    avatar: raw.avatar ?? undefined,
    createdAt: raw.createdAt ?? raw.created_at ?? new Date().toISOString(),
    updatedAt: raw.updatedAt ?? raw.updated_at ?? undefined,
    lastLogin: raw.lastLogin ?? raw.last_login ?? undefined,
  };
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  mfaChallengeRequired: boolean;
  mfaEnrolled: boolean;
  mfaChallengeToken: string | null;
  qrCodeSvg: string | null;

  // Actions
  setUser: (user: User | null) => void;
  loginWithCredentials: (email: string, password: string) => Promise<User>;
  register: (
    name: string,
    password: string,
    token: string
  ) => Promise<{ user: User; needsConfirmation: boolean }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<boolean>;
  refreshSession: () => Promise<boolean>;
  forgotPassword: (email: string) => Promise<{ message: string }>;
  resetPassword: (newPassword: string) => Promise<void>;
  updateProfile: (payload: { name?: string; department?: string; company?: string }) => Promise<User>;
  hasRole: (roles: AppRole[]) => boolean;
  hasPermission: (permission: string) => boolean;
  setMfaChallenge: (required: boolean, factorId?: string) => void;
  verifyMfa: (code: string) => Promise<User>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  mfaChallengeRequired: false,
  mfaEnrolled: false,
  mfaChallengeToken: null,
  qrCodeSvg: null,

  setUser: (user) => set({ user, isAuthenticated: !!user }),
  
  setMfaChallenge: (required, factorId) => set({ mfaChallengeRequired: required, mfaChallengeToken: factorId || null }),

  // ── Login ──────────────────────────────────────────────────────────────────
  loginWithCredentials: async (email, password) => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Login failed.");

      // Check for MFA requirement in response
      if (data.mfa_required) {
        set({ 
          mfaChallengeRequired: true, 
          mfaEnrolled: data.mfa_enrolled,
          mfaChallengeToken: data.challenge_token,
          qrCodeSvg: data.qr_code_svg || null,
          isLoading: false 
        });
        return {} as User; // Return empty/mock user until MFA completes
      }

      const user = normalizeUser(data.user);
      set({ user, isAuthenticated: true, isLoading: false });
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  verifyMfa: async (code: string) => {
    set({ isLoading: true });
    try {
      const { mfaChallengeToken } = get();
      if (!mfaChallengeToken) throw new Error("No MFA factor ID found");
      
      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeToken: mfaChallengeToken, code }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "MFA verification failed.");

      const user = normalizeUser(data.user);
      set({ user, isAuthenticated: true, mfaChallengeRequired: false, mfaChallengeToken: null, otpauthUrl: null, isLoading: false });
      return user;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── Register ───────────────────────────────────────────────────────────────
  register: async (name, password, token) => {
    set({ isLoading: true });
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, password, token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail ?? "Registration failed.");

      const needsConfirmation = !data.access_token;
      if (!needsConfirmation) {
        const user = normalizeUser(data.user);
        set({ user, isAuthenticated: true, isLoading: false });
        return { user, needsConfirmation: false };
      }

      set({ isLoading: false });
      return { user: normalizeUser(data.user), needsConfirmation: true };
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  // ── Logout ─────────────────────────────────────────────────────────────────
  logout: async () => {
    set({ isLoading: true });
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      set({ user: null, isAuthenticated: false, isLoading: false });
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }
  },

  // ── Check Auth ─────────────────────────────────────────────────────────────
  checkAuth: async () => {
    set({ isLoading: true });
    try {
      let res = await fetch("/api/auth/me");
      
      // If unauthorized, attempt to refresh the session token once
      if (res.status === 401) {
        const refreshed = await get().refreshSession();
        if (refreshed) {
          res = await fetch("/api/auth/me");
        }
      }

      if (!res.ok) throw new Error("Profile fetch failed");
      const profile = await res.json();
      const user = normalizeUser(profile);
      set({ user, isAuthenticated: true, isLoading: false });
      return true;
    } catch {
      set({ user: null, isAuthenticated: false, isLoading: false });
      return false;
    }
  },

  // ── Refresh Session ────────────────────────────────────────────────────────
  refreshSession: async () => {
    try {
      const res = await fetch("/api/auth/refresh", { method: "POST" });
      return res.ok;
    } catch {
      return false;
    }
  },

  // ── Forgot Password ────────────────────────────────────────────────────────
  forgotPassword: async (email) => {
    // Implement forgot password by hitting our custom API
    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail ?? "Failed to send reset email");
    }
    return { message: "Password reset email sent. Check your inbox." };
  },

  // ── Reset Password ─────────────────────────────────────────────────────────
  resetPassword: async (newPassword) => {
    // Custom reset password endpoint needs token from URL, passing it here
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: newPassword }),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.detail ?? "Failed to reset password");
    }
  },

  // ── Update Profile ─────────────────────────────────────────────────────────
  updateProfile: async (payload) => {
    const res = await fetch("/api/auth/me", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Profile update failed.");

    const user = normalizeUser(data);
    set({ user });
    return user;
  },

  // ── Role & Permission Helpers ──────────────────────────────────────────────
  hasRole: (roles) => {
    const user = get().user;
    return !!user && roles.includes(user.role);
  },

  hasPermission: (permission) => {
    const user = get().user;
    if (!user) return false;
    if (user.role === "Admin") return true;
    return !!user.permissions?.includes(permission);
  },
}));
