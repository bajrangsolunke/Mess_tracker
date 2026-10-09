import { describe, expect, it } from "vitest";
import { paidAmount } from "./payment";
import { whatsappUrl } from "./share";

describe("paidAmount", () => {
  it("full payment is the whole fee", () => {
    expect(paidAmount({ status: "paid", amount: "", method: "cash" }, "2000.00")).toBe("2000");
  });
  it("not paid sends zero", () => {
    expect(paidAmount({ status: "unpaid", amount: "500", method: "cash" }, "2000")).toBe("0");
  });
  it("part payment must be more than 0 and less than the fee", () => {
    expect(paidAmount({ status: "partial", amount: "1000", method: "upi" }, "2000")).toBe("1000");
    expect(paidAmount({ status: "partial", amount: "2000", method: "upi" }, "2000")).toBeNull();
    expect(paidAmount({ status: "partial", amount: "0", method: "upi" }, "2000")).toBeNull();
    expect(paidAmount({ status: "partial", amount: "abc", method: "upi" }, "2000")).toBeNull();
  });
});

describe("whatsappUrl", () => {
  it("prefixes India code and encodes the text", () => {
    expect(whatsappUrl("98765 43210", "Hi & bye")).toBe("https://wa.me/919876543210?text=Hi%20%26%20bye");
  });
  it("works without a number", () => {
    expect(whatsappUrl(null, "x")).toBe("https://wa.me/?text=x");
  });
});
