import { describe, expect, it } from "vitest";
import { membershipEnd } from "./membership";

describe("membershipEnd matches the server rule", () => {
  it.each([
    ["2026-10-07", "2026-11-06"],
    ["2026-10-01", "2026-10-31"],
    ["2026-01-31", "2026-02-28"],
    ["2026-12-15", "2027-01-14"],
  ])("%s → %s", (start, end) => expect(membershipEnd(start)).toBe(end));
});
