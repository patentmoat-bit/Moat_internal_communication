import { cookies } from "next/headers";

const API_ORIGIN = process.env.MOAT_API_ORIGIN ?? "http://127.0.0.1:8000";

/**
 * Server-side API access for the initial render.
 *
 * The browser's cookie is forwarded explicitly -- a server component has no
 * ambient credentials, so anything it reads is exactly what this user is
 * allowed to read, checked by the API and by the row policies beneath it.
 *
 * Returns null on 401/403/404 so pages can decide between redirecting to
 * login and rendering a not-found, rather than crashing the render.
 */
export async function serverApi<T>(path: string): Promise<T | null> {
  try {
    const cookieHeader = (await cookies()).toString();

    const response = await fetch(`${API_ORIGIN}/api/v1${path}`, {
      headers: { cookie: cookieHeader },
      cache: "no-store",
    });

    if (!response.ok) return null;
    if (response.status === 204) return null;
    return (await response.json()) as T;
  } catch {
    // API server unreachable (e.g. ECONNREFUSED in dev without the backend).
    // Return null so pages render their empty states instead of crashing.
    return null;
  }
}
