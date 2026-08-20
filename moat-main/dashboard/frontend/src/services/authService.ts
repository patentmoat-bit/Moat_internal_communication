import type { AuthResponse, LoginRequest, SignupRequest, User } from "@/types";

async function parseJson<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.detail ?? data.message ?? "Authentication request failed.");
  }
  return data as T;
}

export const authService = {
  async login(data: LoginRequest): Promise<AuthResponse> {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJson<AuthResponse>(response);
  },

  async signup(data: SignupRequest): Promise<AuthResponse & { message?: string }> {
    const response = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return parseJson<AuthResponse & { message?: string }>(response);
  },

  async logout(): Promise<void> {
    const response = await fetch("/api/auth/logout", { method: "POST" });
    await parseJson<{ message: string }>(response);
  },

  async getProfile(): Promise<User> {
    const response = await fetch("/api/auth/me", { cache: "no-store" });
    return parseJson<User>(response);
  },
};
