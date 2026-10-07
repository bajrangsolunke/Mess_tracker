export type MemberStatus = "active" | "inactive";
export type MealType = "lunch" | "dinner";

export interface Plan {
  id: number;
  name: string;
  includes_lunch: boolean;
  includes_dinner: boolean;
  monthly_fee: string;
  is_active: boolean;
  kind?: PlanKind | null;
}

export type PlanKind = "one_lunch" | "one_dinner" | "two";

export type MemberType = "dine_in" | "tiffin";

export interface Member {
  id: number;
  member_no: number;
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
  valid_until: string | null;
  renewal_plan: Plan | null;
  renewal_requested_at: string | null;
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
  member_no: number;
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
  self_marked: boolean;
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
  period_start: string | null;
  period_end: string | null;
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

export interface MenuEntry {
  date: string;
  meal_type: MealType;
  items: string[];
}

export interface Announcement {
  id: number;
  title: string;
  body: string | null;
  published_at: string;
}

export interface MenuToday {
  lunch: string[];
  dinner: string[];
}

export interface OwnerDashboard {
  date: string;
  active_members: number;
  tiffin_members: number;
  lunch: AttendanceCounts;
  dinner: AttendanceCounts;
  payments: BillTotals;
  menu: MenuToday;
  late_leaves: number;
  meals_served_month: number;
  holiday_today: string | null;
  bulk_tiffins: BulkToday;
  renewals_due: number;
}

export interface CustomerDashboard {
  date: string;
  member: MemberBrief;
  meals_this_month: number;
  bill: Bill | null;
  menu: MenuToday;
  upcoming_leaves: Leave[];
  unread_notifications: number;
  announcements: Announcement[];
  membership: MembershipInfo;
}

export interface MealsReport {
  month: string;
  days: { date: string; lunch: number; dinner: number }[];
  totals: { lunch: number; dinner: number; total: number; tiffin: number };
}

export interface PaymentsReport {
  month: string;
  totals: BillTotals;
  by_method: Record<PaymentMethod, string>;
  months: { month: string; billed: string; collected: string }[];
}

export type FoodType = "veg" | "egg" | "nonveg";

export interface TiffinItem {
  id: number;
  name: string;
  price: string;
  food_type: FoodType;
  is_active: boolean;
  sort_order: number;
}

export interface TiffinClient {
  id: number;
  name: string;
  contact_name: string | null;
  phone: string | null;
  address: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface TiffinOrderRow {
  client: TiffinClient;
  quantities: Record<string, number>;
  note: string | null;
  total: number;
  amount: string;
}

export interface TiffinSheet {
  date: string;
  meal_type: MealType;
  locked: boolean;
  items: TiffinItem[];
  totals: { total: number; veg: number; nonveg: number; amount: string };
  by_item: Record<string, number>;
  rows: TiffinOrderRow[];
}

export interface TiffinStatement {
  client: TiffinClient;
  month: string;
  days: { date: string; lunch: number; dinner: number; total: number; amount: string }[];
  by_item: { item_id: number; name: string; food_type: FoodType; quantity: number; amount: string }[];
  totals: { total: number; veg: number; nonveg: number };
  amount: string;
  paid: string;
  due: string;
  payments: Payment[];
}

export interface TiffinSummaryRow {
  client: TiffinClient;
  total: number;
  veg: number;
  nonveg: number;
  amount: string;
  paid: string;
  due: string;
}

export interface TiffinSummary {
  month: string;
  totals: { total: number; veg: number; nonveg: number; amount: string; paid: string; due: string };
  items: TiffinSummaryRow[];
}

export interface BulkToday {
  veg: number;
  nonveg: number;
  total: number;
  lunch: number;
  dinner: number;
  items: { name: string; food_type: FoodType; quantity: number }[];
}

export interface MembershipInfo {
  valid_until: string | null;
  days_left: number | null;
  expired: boolean;
  renewal_plan: Plan | null;
  renewal_requested_at: string | null;
}

export interface DueRow {
  member: MemberBrief;
  valid_until: string;
  days_left: number;
  renewal_plan: Plan | null;
  renewal_requested_at: string | null;
}

export interface Pricing {
  one_meal_price: string | null;
  two_meal_price: string | null;
  plans: { one_lunch: Plan | null; one_dinner: Plan | null; two: Plan | null };
  updated_members: number;
}

export interface MealToday {
  expected: boolean;
  status: AttendanceStatus | null;
  self_marked: boolean;
  on_leave: boolean;
  holiday: boolean;
}

export interface MyToday {
  date: string;
  lunch: MealToday;
  dinner: MealToday;
  valid_until: string | null;
  expired: boolean;
}

export interface Register {
  month: string;
  days: number;
  locked: boolean;
  holidays: { date: string; meal_type: HolidayMeal }[];
  rows: {
    member: MemberBrief;
    joining_date: string;
    inactive_from: string | null;
    valid_until: string | null;
    marks: Record<string, Partial<Record<MealType, AttendanceStatus>>>;
    present: number;
  }[];
}
