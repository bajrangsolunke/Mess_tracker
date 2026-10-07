import { authStore, type AuthOrganization, type AuthUser } from "../features/auth/authStore";

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "/api/v1";

export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
  organization: AuthOrganization;
}

async function parseError(res: Response): Promise<ApiError> {
  let code = "HTTP_ERROR";
  let detail = res.statusText || "Request failed";
  try {
    const body = (await res.json()) as { code?: string; detail?: string };
    code = body.code ?? code;
    detail = body.detail ?? detail;
  } catch {
    /* non-JSON body */
  }
  return new ApiError(res.status, code, detail);
}

/** "ok": new tokens stored. "rejected": server says the refresh token is dead → log out.
 *  "unavailable": network error or 5xx (e.g. Render cold start) → keep the session. */
type RefreshOutcome = "ok" | "rejected" | "unavailable";

let refreshing: Promise<RefreshOutcome> | null = null;

async function tryRefresh(): Promise<RefreshOutcome> {
  const { refresh } = authStore.get();
  if (!refresh) return "rejected";
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch(`${API_BASE}/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refresh }),
        });
        if (res.status === 401 || res.status === 403) return "rejected";
        if (!res.ok) return "unavailable";
        const body = (await res.json()) as TokenResponse;
        authStore.setSession({
          access: body.access_token,
          refresh: body.refresh_token,
          user: body.user,
          organization: body.organization,
        });
        return "ok";
      } catch {
        return "unavailable";
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function api<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const doFetch = () => {
    const headers = new Headers(init.headers);
    if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    const { access } = authStore.get();
    if (access) headers.set("Authorization", `Bearer ${access}`);
    return fetch(`${API_BASE}${path}`, { ...init, headers });
  };

  let res = await doFetch();
  if (res.status === 401 && !path.startsWith("/auth/login") && !path.startsWith("/auth/refresh")) {
    const outcome = await tryRefresh();
    if (outcome === "rejected") {
      authStore.clear();
      throw await parseError(res);
    }
    if (outcome === "unavailable") {
      throw new ApiError(503, "REFRESH_UNAVAILABLE", "Could not reach the server");
    }
    res = await doFetch();
  }
  if (!res.ok) throw await parseError(res);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
