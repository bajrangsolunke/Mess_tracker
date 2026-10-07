import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import { Route } from "react-router-dom";
import { renderWithProviders } from "../../test/render";
import { RequireRole } from "./RequireRole";
import { authStore } from "./authStore";

const owner = { id: 1, name: "R", role: "owner" as const };

describe("RequireRole", () => {
  beforeEach(() => {
    localStorage.clear();
    authStore.clear();
  });

  it("redirects unauthenticated users to /login", () => {
    renderWithProviders(
      <RequireRole role="owner">
        <div>SECRET</div>
      </RequireRole>,
      { route: "/owner", extraRoutes: <Route path="/login" element={<div>LOGIN</div>} /> },
    );
    expect(screen.getByText("LOGIN")).toBeInTheDocument();
  });

  it("renders children for the matching role", () => {
    authStore.setSession({ access: "a", refresh: "r", user: owner, organization: { id: 1, name: "M" } });
    renderWithProviders(
      <RequireRole role="owner">
        <div>SECRET</div>
      </RequireRole>,
      { route: "/owner" },
    );
    expect(screen.getByText("SECRET")).toBeInTheDocument();
  });

  it("sends the wrong role to its own home", () => {
    authStore.setSession({ access: "a", refresh: "r", user: owner, organization: { id: 1, name: "M" } });
    renderWithProviders(
      <RequireRole role="customer">
        <div>SECRET</div>
      </RequireRole>,
      { route: "/app", extraRoutes: <Route path="/owner" element={<div>OWNER</div>} /> },
    );
    expect(screen.getByText("OWNER")).toBeInTheDocument();
  });
});
