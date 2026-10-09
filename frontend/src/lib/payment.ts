import type { PaymentMethod } from "../api/types";

export type PayStatus = "paid" | "partial" | "unpaid";
export interface PayValue {
  status: PayStatus;
  amount: string; // only used for partial
  method: PaymentMethod;
}

export const PAY_DEFAULT: PayValue = { status: "paid", amount: "", method: "cash" };

const AMOUNT = /^\d{1,8}(\.\d{1,2})?$/;

/** Amount actually received now, or null when the partial amount is not valid. */
export function paidAmount(v: PayValue, fee: string | number): string | null {
  if (v.status === "unpaid") return "0";
  if (v.status === "paid") return String(Number(fee) || 0);
  if (!AMOUNT.test(v.amount) || Number(v.amount) <= 0 || Number(v.amount) >= Number(fee)) return null;
  return v.amount;
}
