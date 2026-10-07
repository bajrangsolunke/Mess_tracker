import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../test/render";
import { BottomNav } from "./BottomNav";

const items = [
  { labelKey: "nav.home", to: "/owner", icon: <span /> },
  { labelKey: "nav.members", to: "/owner/members", icon: <span /> },
  { labelKey: "nav.attendance", to: "/owner/attendance", icon: <span />, also: ["/owner/register"] },
  { labelKey: "nav.more", to: "/owner/more", icon: <span />, also: ["/owner/pricing"] },
];

function selected() {
  return screen.getAllByRole("button").filter((b) => b.classList.contains("Mui-selected")).map((b) => b.textContent);
}

describe("BottomNav highlights the current section", () => {
  it("home on /owner", () => {
    renderWithProviders(<BottomNav items={items} />, { route: "/owner" });
    expect(selected()).toEqual(["Home"]);
  });
  it("attendance on /owner/attendance, not home", () => {
    renderWithProviders(<BottomNav items={items} />, { route: "/owner/attendance" });
    expect(selected()).toEqual(["Attendance"]);
  });
  it("members on a nested member page", () => {
    renderWithProviders(<BottomNav items={items} />, { route: "/owner/members/12/edit" });
    expect(selected()).toEqual(["Members"]);
  });
});

describe("sub-pages light up their parent tab", () => {
  it("prices page belongs to More", () => {
    renderWithProviders(<BottomNav items={items} />, { route: "/owner/pricing" });
    expect(selected()).toEqual(["More"]);
  });
  it("register belongs to Attendance", () => {
    renderWithProviders(<BottomNav items={items} />, { route: "/owner/register" });
    expect(selected()).toEqual(["Attendance"]);
  });
});
