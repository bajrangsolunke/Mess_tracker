import type { Member } from "../../api/types";

export function planLabel(m: Member, t: (k: string) => string): string {
  const parts = [m.plan.includes_lunch && t("meal.lunchShort"), m.plan.includes_dinner && t("meal.dinnerShort")].filter(Boolean);
  return parts.join(" + ");
}
