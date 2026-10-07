import { describe, expect, it } from "vitest";
import { rupees } from "./money";

describe("rupees", () => {
  it("formats Indian grouping without paise", () => {
    expect(rupees("2500.00")).toBe("₹2,500");
    expect(rupees(125000)).toBe("₹1,25,000");
  });
  it("dashes for missing", () => {
    expect(rupees(null)).toBe("—");
    expect(rupees("abc")).toBe("—");
  });
});
