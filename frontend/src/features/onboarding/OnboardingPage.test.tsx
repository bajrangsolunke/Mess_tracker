import { beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Route } from "react-router-dom";
import i18n from "../../i18n";
import { renderWithProviders } from "../../test/render";
import { OnboardingPage } from "./OnboardingPage";
import { storage } from "../../lib/storage";

describe("OnboardingPage", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("walks through four slides and marks onboarding done", async () => {
    renderWithProviders(<OnboardingPage />, {
      route: "/welcome",
      extraRoutes: <Route path="/login" element={<div>LOGIN</div>} />,
    });
    expect(screen.getByRole("heading", { name: "Track members" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Manage payments" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    await userEvent.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByRole("heading", { name: "Serve better" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Get started" }));
    expect(await screen.findByText("LOGIN")).toBeInTheDocument();
    expect(storage.getOnboarded()).toBe(true);
  });

  it("skip goes straight to login and marks onboarding done", async () => {
    renderWithProviders(<OnboardingPage />, {
      route: "/welcome",
      extraRoutes: <Route path="/login" element={<div>LOGIN</div>} />,
    });
    await userEvent.click(screen.getByRole("button", { name: "Skip" }));
    expect(await screen.findByText("LOGIN")).toBeInTheDocument();
    expect(storage.getOnboarded()).toBe(true);
  });
});
