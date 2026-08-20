const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

interface FetchOptions extends RequestInit {
  requireAuth?: boolean;
  timeoutMs?: number;
}

export async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { requireAuth = true, timeoutMs = 5000, ...customConfig } = options;
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (requireAuth) {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const config: RequestInit = {
    ...customConfig,
    headers: {
      ...headers,
      ...customConfig.headers,
    },
    signal: controller.signal,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    clearTimeout(timer);

    if (!response.ok) {
      if (response.status === 401 && requireAuth) {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user_data");
        // Only redirect if not already on the login page
        if (typeof window !== "undefined" && !window.location.pathname.includes("login")) {
          window.location.href = "/login";
        }
      }
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || "An error occurred");
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json();
  } catch (err: any) {
    clearTimeout(timer);
    if (err.name === "AbortError") {
      throw new Error("Request timed out — backend may not be running");
    }
    throw err;
  }
}
