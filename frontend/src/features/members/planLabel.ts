import type { Member } from "../../api/types";
import { planMeals, planName } from "../../lib/plans";

type T = (k: string, o?: Record<string, unknown>) => string;

/** Short plan text for a member: standard plans by name ("2 वेळा"), custom plans by meals. */
export function planLabel(m: Pick<Member, "plan">, t: T): string {
  return m.plan.kind ? planName(m.plan, t) : planMeals(m.plan, t);
}
