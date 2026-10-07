import type { Plan } from "../api/types";

type T = (k: string, o?: Record<string, unknown>) => string;

/** Display name for a plan: standard plans are translated, custom plans show their own name. */
export function planName(plan: Pick<Plan, "kind" | "name">, t: T): string {
  return plan.kind ? t(`pricing.plan.${plan.kind}`) : plan.name;
}

/** "Lunch + Dinner" / "Dinner" from the meals the plan includes. */
export function planMeals(plan: Pick<Plan, "includes_lunch" | "includes_dinner">, t: T): string {
  return [plan.includes_lunch && t("meal.lunchShort"), plan.includes_dinner && t("meal.dinnerShort")].filter(Boolean).join(" + ");
}
