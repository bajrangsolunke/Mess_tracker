import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import i18n from "../../i18n";
import { renderWithProviders } from "../../test/render";
import { MembersPage } from "./MembersPage";
import { authStore } from "../auth/authStore";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}
const plan = { id: 1, name: "Lunch + Dinner", includes_lunch: true, includes_dinner: true, monthly_fee: "2500.00", is_active: true };
const member = { id: 7, member_no: 1007, valid_until: "2026-12-31", renewal_plan: null, renewal_requested_at: null, member_type: "dine_in", company: null, delivery_address: null, user_id: 9, name: "Rahul Sharma", phone: "9000000011", room_no: "101", plan, monthly_fee: "2500.00", joining_date: "2026-10-01", status: "active", deposit: "0.00", emergency_contact: null, notes: null, inactive_from: null };

describe("MembersPage", () => {
  beforeEach(async () => {
    localStorage.clear();
    authStore.setSession({ access: "a", refresh: "r", user: { id: 1, name: "O", role: "owner" }, organization: { id: 1, name: "M" } });
    await i18n.changeLanguage("en");
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders member cards with plan, fee and member ID", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { items: [member], total: 1 }));
    renderWithProviders(<MembersPage />, { route: "/owner/members" });
    expect(await screen.findByText("Rahul Sharma")).toBeInTheDocument();
    expect(screen.getByText(/Lunch \+ Dinner · ₹2,500/)).toBeInTheDocument();
    expect(screen.getByText("#1007")).toBeInTheDocument();
    expect(screen.getByText("1 members")).toBeInTheDocument();
  });

  it("shows the chef empty state when there are no members", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, { items: [], total: 0 }));
    renderWithProviders(<MembersPage />, { route: "/owner/members" });
    expect(await screen.findByText("No members yet")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add first member" })).toBeInTheDocument();
  });
});
