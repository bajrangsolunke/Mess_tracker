import dayjs from "dayjs";
import utc from "dayjs/plugin/utc";
import timezone from "dayjs/plugin/timezone";
import "dayjs/locale/mr";
import "dayjs/locale/hi";

dayjs.extend(utc);
dayjs.extend(timezone);

export const IST = "Asia/Kolkata";

/** Today's date in Indian Standard Time, as the API expects (YYYY-MM-DD). */
export function todayIst(): string {
  return dayjs().tz(IST).format("YYYY-MM-DD");
}

/** e.g. "मंगळवार, 7 ऑक्टोबर 2026" / "Tuesday, 7 October 2026". */
export function formatTodayLong(lang: string): string {
  const d = dayjs().tz(IST);
  const locale = lang === "mr" || lang === "hi" ? lang : "en";
  return d.locale(locale).format("dddd, D MMMM YYYY");
}

/** "2026-10-01" → "1 ऑक्टोबर 2026" / "1 October 2026". */
export function formatDateLong(iso: string, lang: string): string {
  const locale = lang === "mr" || lang === "hi" ? lang : "en";
  return dayjs(iso).locale(locale).format("D MMMM YYYY");
}
