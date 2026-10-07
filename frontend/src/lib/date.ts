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

export function addDays(iso: string, n: number): string {
  return dayjs(iso).add(n, "day").format("YYYY-MM-DD");
}

/** "2026-10" for the given ISO date (or today). */
export function monthKey(iso?: string): string {
  return (iso ? dayjs(iso) : dayjs().tz(IST)).format("YYYY-MM");
}

export function addMonths(month: string, n: number): string {
  return dayjs(`${month}-01`).add(n, "month").format("YYYY-MM");
}

/** "ऑक्टोबर 2026" / "October 2026". */
export function formatMonth(month: string, lang: string): string {
  const locale = lang === "mr" || lang === "hi" ? lang : "en";
  return dayjs(`${month}-01`).locale(locale).format("MMMM YYYY");
}

/** Short weekday + day for a date strip, e.g. "मंगळ 7". */
export function formatDayChip(iso: string, lang: string): { weekday: string; day: string } {
  const locale = lang === "mr" || lang === "hi" ? lang : "en";
  const d = dayjs(iso).locale(locale);
  return { weekday: d.format("ddd"), day: d.format("D") };
}

/** Calendar grid for a month: leading blanks (Monday-first) then day ISO strings. */
export function monthGrid(month: string): (string | null)[] {
  const first = dayjs(`${month}-01`);
  const lead = (first.day() + 6) % 7;
  const days = first.daysInMonth();
  const cells: (string | null)[] = Array.from({ length: lead }, () => null);
  for (let d = 1; d <= days; d++) cells.push(first.date(d).format("YYYY-MM-DD"));
  return cells;
}

/** "1:25 PM" / "दुपारी 1:25" in IST for a timestamp. */
export function formatTime(iso: string, lang: string): string {
  const locale = lang === "mr" || lang === "hi" ? lang : "en";
  return dayjs(iso).tz(IST).locale(locale).format("h:mm A");
}

/** "15:30:00" → "3:30 PM" in the user's language. */
export function formatClock(hhmmss: string, lang: string): string {
  const locale = lang === "mr" || lang === "hi" ? lang : "en";
  return dayjs(`2000-01-01T${hhmmss.slice(0, 5)}`).locale(locale).format("h:mm A");
}
