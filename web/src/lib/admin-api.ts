// Browser-side calls to the admin API: the session cookie rides along, and writes carry the CSRF
// token from Django's csrftoken cookie.

function csrfCookie(): string | undefined {
  return document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith("csrftoken="))
    ?.slice("csrftoken=".length);
}

async function csrfToken(): Promise<string> {
  const existing = csrfCookie();
  if (existing) return existing;
  await fetch("/api/admin/auth/csrf", { credentials: "same-origin" });
  return csrfCookie() ?? "";
}

/** POSTs JSON to the admin API. Returns the response; callers read `detail` from error bodies. */
export function adminPost(path: string, body?: unknown): Promise<Response> {
  return adminSend("POST", path, body);
}

/** Sends JSON to the admin API with any write method. */
export async function adminSend(method: "POST" | "PUT" | "PATCH", path: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`/api/admin${path}`, {
      method,
      credentials: "same-origin",
      headers: { "Content-Type": "application/json", "X-CSRFToken": await csrfToken() },
      body: JSON.stringify(body ?? {}),
    });
  } catch {
    // Offline or the server is unreachable: report it like any other failed request.
    return Response.json({ detail: "Can't reach the server. Check the connection and try again." }, { status: 503 });
  }
}

/** The error message from a failed admin API response, or a generic one. */
export async function errorDetail(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") return body.detail;
  } catch {
    // Not JSON: fall through.
  }
  return "Something went wrong. Please try again.";
}

/** Per-field messages from a 400 response, e.g. `{ phone: "Enter the shop phone number." }`. */
export type FieldErrors = Record<string, string>;

/** The error message and any field errors from a failed admin API response. */
export async function errorBody(response: Response): Promise<{ detail: string; errors: FieldErrors }> {
  try {
    const body = await response.clone().json();
    if (body.errors && typeof body.errors === "object") return { detail: await errorDetail(response), errors: body.errors };
  } catch {
    // Not JSON: fall through.
  }
  return { detail: await errorDetail(response), errors: {} };
}
