import { describe, expect, it } from "vitest";
import { normalizePhoneInput } from "./phone";

describe("normalizePhoneInput", () => {
  it.each([
    ["9876543210", "9876543210"],
    ["+91 98765 43210", "9876543210"],
    ["0091-9876543210", "9876543210"],
    ["09876543210", "9876543210"],
  ])("%s → %s", (raw, expected) => {
    expect(normalizePhoneInput(raw)).toBe(expected);
  });
});
