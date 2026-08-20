let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

/**
 * Secure API Fetch Wrapper
 * Intercepts 401 Unauthorized responses to perform a single-flight
 * token refresh. If the refresh succeeds, the original request is retried once.
 */
export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  
  const headers = new Headers(init?.headers || {});
  
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const config: RequestInit = {
    ...init,
    headers,
  };

  let response = await fetch(input, config);

  if (response.status === 401) {
    if (!isRefreshing) {
      isRefreshing = true;
      refreshPromise = Promise.all([
        import('@/lib/supabase/client').then(m => m.createClient().auth.getSession()), // This triggers Supabase native refresh if needed
        fetch("/api/auth/refresh", { method: "POST" })
      ]).then(async ([sbSession, res]) => {
          if (res.ok) {
            const data = await res.json();
            if (data.access_token && typeof window !== "undefined") {
              localStorage.setItem("access_token", data.access_token);
            }
            return true;
          }
          return false;
        })
        .catch(() => false)
        .finally(() => {
          isRefreshing = false;
          refreshPromise = null;
        });
    }

    const success = await refreshPromise;

    if (success) {
      // Retry once with new token
      const newToken = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
      if (newToken) {
        headers.set("Authorization", `Bearer ${newToken}`);
      }
      
      response = await fetch(input, { ...init, headers });
    } else {
      // Force login if refresh failed and not already on login page
      if (typeof window !== "undefined" && !window.location.pathname.includes("/login")) {
        window.location.href = "/login?expired=1";
      }
    }
  }

  return response;
}
