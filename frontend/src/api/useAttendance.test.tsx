import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMarkAll, useMarkAttendance } from "./useAttendance";
import { authStore } from "../features/auth/authStore";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const sheet = { date: "2026-10-07", meal_type: "lunch", locked: false, holiday: null, counts: { expected: 1, present: 0, absent: 1, unmarked: 0, on_leave: 0 }, items: [] };

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const spy = vi.spyOn(qc, "invalidateQueries");
  const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return { qc, spy, wrapper };
}

function invalidatedKeys(spy: ReturnType<typeof vi.spyOn>) {
  return spy.mock.calls.map((c: unknown[]) => JSON.stringify((c[0] as { queryKey: unknown[] }).queryKey));
}

describe("attendance mutations refresh every screen that shows counts", () => {
  beforeEach(() => {
    authStore.setSession({ access: "a", refresh: "r", user: { id: 1, name: "O", role: "owner" }, organization: { id: 1, name: "M" } });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, sheet));
  });
  afterEach(() => vi.restoreAllMocks());

  it("marking one member refreshes dashboard, attendance views and reports", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useMarkAttendance("2026-10-07", "lunch"), { wrapper });
    result.current.mutate([{ member_id: 1, status: "absent" }]);
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => {
      const keys = invalidatedKeys(spy);
      expect(keys).toContain(JSON.stringify(["dashboard"]));
      expect(keys).toContain(JSON.stringify(["attendance"]));
      expect(keys).toContain(JSON.stringify(["reports"]));
    });
  });

  it("mark-all refreshes the same places", async () => {
    const { spy, wrapper } = setup();
    const { result } = renderHook(() => useMarkAll("2026-10-07", "lunch"), { wrapper });
    result.current.mutate("present");
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    await waitFor(() => {
      const keys = invalidatedKeys(spy);
      expect(keys).toContain(JSON.stringify(["dashboard"]));
      expect(keys).toContain(JSON.stringify(["reports"]));
    });
  });
});
