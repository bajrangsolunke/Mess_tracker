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

export type MemberType = "dine_in" | "tiffin";

export interface Member {
  id: number;
  user_id: number | null;
  name: string;
  phone: string;
  room_no: string | null;
  member_type: MemberType;
  company: string | null;
  delivery_address: string | null;
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
  member_type?: MemberType;
  company?: string | null;
  delivery_address?: string | null;
  deposit?: string;
  emergency_contact?: string | null;
  notes?: string | null;
  create_login?: boolean;
}

export type MemberUpdateInput = Partial<Omit<MemberCreateInput, "phone" | "create_login">>;

export type AttendanceStatus = "present" | "absent";
export type HolidayMeal = "lunch" | "dinner" | "all";

export interface MemberBrief {
  id: number;
  name: string;
  phone: string;
  room_no: string | null;
  member_type: MemberType;
  company: string | null;
  plan: Plan;
}

export interface AttendanceRow {
  member: MemberBrief;
  status: AttendanceStatus | null;
  on_leave: boolean;
  leave_status: string | null;
}

export interface AttendanceCounts {
  expected: number;
  present: number;
  absent: number;
  unmarked: number;
  on_leave: number;
}

export interface Holiday {
  id: number;
  date: string;
  meal_type: HolidayMeal;
  reason: string | null;
}

export interface AttendanceSheet {
  date: string;
  meal_type: MealType;
  locked: boolean;
  holiday: Holiday | null;
  counts: AttendanceCounts;
  items: AttendanceRow[];
}

export interface HistoryItem {
  date: string;
  meal_type: MealType;
  status: AttendanceStatus;
}

export interface HistoryOut {
  member: MemberBrief;
  month: string;
  present_count: number;
  absent_count: number;
  items: HistoryItem[];
  leaves: HistoryItem[];
}

export interface SummaryRow {
  member: MemberBrief;
  lunch_present: number;
  dinner_present: number;
  total_present: number;
}

export interface MonthState {
  month: string;
  closed: boolean;
}

export type LeaveStatus = "approved" | "late" | "rejected";

export interface Leave {
  id: number;
  date: string;
  meal_type: MealType;
  reason: string | null;
  status: LeaveStatus;
  decided_at: string | null;
}

export interface LeaveWithMember extends Leave {
  member: MemberBrief;
}

export type NotificationType = "payment_due" | "leave_decided" | "announcement" | "general";

export interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  body: string | null;
  read_at: string | null;
  created_at: string;
  ref_type: string | null;
  ref_id: number | null;
}

export interface NotificationPage {
  items: Notification[];
  unread: number;
}

export type BillStatus = "unpaid" | "partial" | "paid";
export type PaymentMethod = "cash" | "upi" | "bank";

export interface Payment {
  id: number;
  amount: string;
  method: PaymentMethod;
  paid_on: string;
  note: string | null;
}

export interface Bill {
  id: number;
  member: MemberBrief;
  month: string;
  amount: string;
  paid: string;
  due: string;
  status: BillStatus;
  note: string | null;
  payments: Payment[];
}

export interface BillTotals {
  billed: string;
  collected: string;
  pending: string;
  members: number;
  paid: number;
}

export interface BillPage {
  month: string;
  totals: BillTotals;
  items: Bill[];
}
