import { render, screen } from "@testing-library/react";
import { ThemeProvider } from "@mui/material";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import "../i18n";
import i18n from "../i18n";
import { theme } from "../app/theme";
import { RouteError } from "./RouteError";

function Boom(): never {
  throw new Error("screen crashed");
}

describe("RouteError", () => {
  it("shows a friendly screen instead of a blank page when a screen crashes", async () => {
    await i18n.changeLanguage("en");
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const router = createMemoryRouter([{ errorElement: <RouteError />, children: [{ path: "/", element: <Boom /> }] }]);
    render(
      <ThemeProvider theme={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>,
    );
    expect(await screen.findByText(/Something went wrong/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Reload" })).toBeInTheDocument();
  });
});
