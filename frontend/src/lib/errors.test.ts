import { describe, expect, it } from "vitest";
import type { TFunction } from "i18next";
import { ApiError } from "../api/client";
import { tooManyAttempts } from "./errors";

const t = ((key: string, o?: { minutes?: number }) => `${key}:${o?.minutes}`) as unknown as TFunction;

describe("tooManyAttempts", () => {
  it("rounds the wait up to whole minutes", () => {
    expect(tooManyAttempts(new ApiError(429, "TOO_MANY_ATTEMPTS", "x", 61), t)).toBe("auth.tooMany:2");
  });
  it("ignores other errors", () => {
    expect(tooManyAttempts(new ApiError(401, "INVALID_CREDENTIALS", "x"), t)).toBeNull();
    expect(tooManyAttempts(null, t)).toBeNull();
  });
});
