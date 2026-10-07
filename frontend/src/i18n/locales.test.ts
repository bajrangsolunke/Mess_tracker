import { describe, expect, it } from "vitest";
import en from "./locales/en.json";
import hi from "./locales/hi.json";
import mr from "./locales/mr.json";

function flatten(obj: Record<string, unknown>, prefix = ""): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === "object"
      ? flatten(v as Record<string, unknown>, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  );
}

describe("locale files", () => {
  const enKeys = flatten(en).sort();
  it("hi has exactly the same keys as en", () => {
    expect(flatten(hi).sort()).toEqual(enKeys);
  });
  it("mr has exactly the same keys as en", () => {
    expect(flatten(mr).sort()).toEqual(enKeys);
  });
  it("no translation is empty", () => {
    for (const locale of [en, hi, mr]) {
      for (const v of Object.values(locale).flatMap((s) => Object.values(s as object))) {
        expect(String(v).trim().length).toBeGreaterThan(0);
      }
    }
  });
});
