export type MemberStatus = "active" | "inactive";
export type MealType = "lunch" | "dinner";

export interface Plan {
  id: number;
  name: string;
  includes_lunch: boolean;
  includes_dinner: boolean;
  monthly_fee: string;
  is_active: boolean;
}

export interface Member {
  id: number;
  user_id: number | null;
  name: string;
  phone: string;
  room_no: string | null;
  plan: Plan;
  monthly_fee: string;
  joining_date: string;
  status: MemberStatus;
  deposit: string;
  emergency_contact: string | null;
  notes: string | null;
  inactive_from: string | null;
}

export interface Page<T> {
  items: T[];
  total: number;
}

export interface MemberCreateInput {
  name: string;
  phone: string;
  plan_id: number;
  joining_date: string;
  monthly_fee?: string;
  room_no?: string | null;
  deposit?: string;
  emergency_contact?: string | null;
  notes?: string | null;
  create_login?: boolean;
}

export type MemberUpdateInput = Partial<Omit<MemberCreateInput, "phone" | "create_login">>;
