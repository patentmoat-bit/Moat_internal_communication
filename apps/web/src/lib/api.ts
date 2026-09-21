/**
 * Browser-side API access.
 *
 * Always same-origin (next.config.ts proxies /api), so the session cookie
 * travels automatically and there is no token for JavaScript to mishandle.
 */

export interface ApiError {
  code: string;
  message: string;
  requestId: string;
  [key: string]: unknown;
}

export class ApiRequestError extends Error {
  readonly status: number;
  readonly body: ApiError;

  constructor(status: number, body: ApiError) {
    super(body.message);
    this.name = "ApiRequestError";
    this.status = status;
    this.body = body;
  }
}

async function parse(response: Response) {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export async function api<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const { json, headers, ...rest } = init;

  const response = await fetch(`/api/v1${path}`, {
    ...rest,
    // Never serve a stale authenticated response from the HTTP cache.
    cache: "no-store",
    headers: {
      ...(json !== undefined ? { "content-type": "application/json" } : {}),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  const payload = await parse(response);

  if (!response.ok) {
    const error = (payload as { error?: ApiError } | null)?.error;
    throw new ApiRequestError(
      response.status,
      error ?? {
        code: "unknown",
        message: "The request failed.",
        requestId: response.headers.get("x-request-id") ?? "",
      },
    );
  }

  return payload as T;
}
