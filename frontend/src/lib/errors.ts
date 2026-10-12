import type { TFunction } from "i18next";
import { ApiError } from "../api/client";

/** "Too many wrong attempts. Try again in N minutes." or null when it is another error. */
export function tooManyAttempts(err: unknown, t: TFunction): string | null {
  if (!(err instanceof ApiError) || err.code !== "TOO_MANY_ATTEMPTS") return null;
  return t("auth.tooMany", { minutes: Math.max(1, Math.ceil((err.retryAfter ?? 900) / 60)) });
}
