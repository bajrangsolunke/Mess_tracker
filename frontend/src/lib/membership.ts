import dayjs from "dayjs";
import type { Plan, PlanKind } from "../api/types";
import { todayIst } from "./date";

export type Choice = { times: 1 | 2; meal: "lunch" | "dinner" };

/** Mirrors backend membership_end: 7 Oct → 6 Nov; 31 Jan → 28 Feb. */
export function membershipEnd(start: string): string {
  const s = dayjs(start);
  const next = s.add(1, "month");
  return (next.date() < s.date() ? next : next.subtract(1, "day")).format("YYYY-MM-DD");
}

/** Renewal continues the day after expiry, or starts today if it already lapsed. */
export function nextStart(validUntil: string | null): string {
  const today = todayIst();
  if (!validUntil) return today;
  const following = dayjs(validUntil).add(1, "day").format("YYYY-MM-DD");
  return following >= today ? following : today;
}

export function mealChoiceFromPlan(plan: Pick<Plan, "includes_lunch" | "includes_dinner"> | null | undefined): Choice | null {
  if (!plan) return null;
  if (plan.includes_lunch && plan.includes_dinner) return { times: 2, meal: "lunch" };
  return { times: 1, meal: plan.includes_lunch ? "lunch" : "dinner" };
}

export function planForChoice(plans: Plan[], c: Choice): Plan | undefined {
  const kind: PlanKind = c.times === 2 ? "two" : c.meal === "lunch" ? "one_lunch" : "one_dinner";
  return plans.find((p) => p.kind === kind && p.is_active);
}

export function daysLeftLabel(days: number, t: (k: string, o?: Record<string, unknown>) => string) {
  if (days < 0) return t("membership.expiredAgo", { count: -days });
  if (days === 0) return t("membership.endsToday");
  return t("membership.daysLeft", { count: days });
}
