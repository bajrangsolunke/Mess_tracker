import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import i18n from "../../i18n";
import { renderWithProviders } from "../../test/render";
import { LoginPage } from "./LoginPage";
import { authStore } from "./authStore";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const ownerBody = {
  access_token: "a",
  refresh_token: "r",
  user: { id: 1, name: "Ramesh", phone: "9876543210", role: "owner", language: "en" },
  organization: { id: 1, name: "Shree Mess" },
};

describe("LoginPage", () => {
  beforeEach(() => {
    localStorage.clear();
    authStore.clear();
    void i18n.changeLanguage("en");
  });
  afterEach(() => vi.restoreAllMocks());

  it("renders translated labels", async () => {
    await i18n.changeLanguage("mr");
    renderWithProviders(<LoginPage />, { route: "/login" });
    expect(screen.getByLabelText("मोबाईल नंबर")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "साइन इन करा" })).toBeInTheDocument();
  });

  it("validates phone before submitting", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    renderWithProviders(<LoginPage />, { route: "/login" });
    await userEvent.type(screen.getByLabelText("Mobile number"), "123");
    await userEvent.type(screen.getByLabelText("Password"), "secret1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("Enter a 10-digit mobile number")).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("logs in an owner and navigates to /owner", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse(200, ownerBody));
    renderWithProviders(<LoginPage />, {
      route: "/login",
      extraRoutes: <Route path="/owner" element={<div>OWNER HOME</div>} />,
    });
    await userEvent.type(screen.getByLabelText("Mobile number"), "9876543210");
    await userEvent.type(screen.getByLabelText("Password"), "owner123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("OWNER HOME")).toBeInTheDocument();
    expect(authStore.get().user?.role).toBe("owner");
  });

  it("logs in a customer and navigates to /app", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { ...ownerBody, user: { ...ownerBody.user, role: "customer" } }),
    );
    renderWithProviders(<LoginPage />, {
      route: "/login",
      extraRoutes: <Route path="/app" element={<div>CUSTOMER HOME</div>} />,
    });
    await userEvent.type(screen.getByLabelText("Mobile number"), "9876543210");
    await userEvent.type(screen.getByLabelText("Password"), "cust123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByText("CUSTOMER HOME")).toBeInTheDocument();
  });

  it("applies the user's saved language after login", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { ...ownerBody, user: { ...ownerBody.user, language: "mr" } }),
    );
    renderWithProviders(<LoginPage />, {
      route: "/login",
      extraRoutes: <Route path="/owner" element={<div>OWNER HOME</div>} />,
    });
    await userEvent.type(screen.getByLabelText("Mobile number"), "9876543210");
    await userEvent.type(screen.getByLabelText("Password"), "owner123");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await screen.findByText("OWNER HOME");
    expect(i18n.language).toBe("mr");
    expect(localStorage.getItem("mt.lang")).toBe("mr");
    expect(document.documentElement.lang).toBe("mr");
  });

  it("shows invalid credentials error", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(401, { detail: "bad", code: "INVALID_CREDENTIALS" }),
    );
    renderWithProviders(<LoginPage />, { route: "/login" });
    await userEvent.type(screen.getByLabelText("Mobile number"), "9876543210");
    await userEvent.type(screen.getByLabelText("Password"), "wrong1");
    await userEvent.click(screen.getByRole("button", { name: "Sign in" }));
    await waitFor(() =>
      expect(screen.getByText("Mobile number or password is incorrect")).toBeInTheDocument(),
    );
  });
});
