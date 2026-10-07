import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, ApiError } from "./client";
import { authStore } from "../features/auth/authStore";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("api client", () => {
  beforeEach(() => {
    localStorage.clear();
    authStore.setSession({ access: "old-access", refresh: "old-refresh", user: null, organization: null });
  });
  afterEach(() => vi.restoreAllMocks());

  it("attaches bearer token", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { ok: 1 }));
    const res = await api<{ ok: number }>("/auth/me");
    expect(res.ok).toBe(1);
    const headers = new Headers((fetchMock.mock.calls[0][1] as RequestInit).headers);
    expect(headers.get("Authorization")).toBe("Bearer old-access");
  });

  it("on 401 refreshes once and retries with new token", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(401, { detail: "x", code: "NOT_AUTHENTICATED" }))
      .mockResolvedValueOnce(
        jsonResponse(200, {
          access_token: "new-access",
          refresh_token: "new-refresh",
          user: { id: 1, name: "R", role: "owner" },
          organization: { id: 1, name: "M" },
        }),
      )
      .mockResolvedValueOnce(jsonResponse(200, { me: true }));
    const res = await api<{ me: boolean }>("/auth/me");
    expect(res.me).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(String(fetchMock.mock.calls[1][0])).toContain("/auth/refresh");
    const retryHeaders = new Headers((fetchMock.mock.calls[2][1] as RequestInit).headers);
    expect(retryHeaders.get("Authorization")).toBe("Bearer new-access");
    expect(authStore.get().refresh).toBe("new-refresh");
  });

  it("on 401 and failed refresh clears session and throws", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(jsonResponse(401, { detail: "x", code: "NOT_AUTHENTICATED" }))
      .mockResolvedValueOnce(jsonResponse(401, { detail: "x", code: "INVALID_REFRESH" }));
    await expect(api("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(authStore.get().access).toBeNull();
    expect(authStore.get().refresh).toBeNull();
  });

  it("throws ApiError with code on other errors", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(409, { detail: "dup", code: "DUPLICATE_PHONE" }),
    );
    const err = (await api("/members", { method: "POST", body: JSON.stringify({}) }).catch(
      (e: unknown) => e,
    )) as ApiError;
    expect(err).toBeInstanceOf(ApiError);
    expect(err.code).toBe("DUPLICATE_PHONE");
    expect(err.status).toBe(409);
  });

  it("does not attempt refresh when there is no refresh token", async () => {
    authStore.clear();
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(401, { detail: "x", code: "NOT_AUTHENTICATED" }));
    await expect(api("/auth/me")).rejects.toBeInstanceOf(ApiError);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
