import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Bill, BillPage, BillStatus, PaymentMethod } from "./types";

export const billsKey = ["bills"] as const;

export function useBills(month: string, status?: BillStatus | "") {
  const qs = new URLSearchParams({ month });
  if (status) qs.set("status", status);
  return useQuery({ queryKey: [...billsKey, month, status ?? ""], queryFn: () => api<BillPage>(`/bills?${qs}`), placeholderData: (p) => p });
}

export function useGenerateBills() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (month: string) => api<{ created: number; total: number }>(`/bills/generate?month=${month}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: billsKey }),
  });
}

export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, ...data }: { billId: number; amount: string; method: PaymentMethod; paid_on: string; note?: string }) =>
      api<Bill>(`/bills/${billId}/payments`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: billsKey }),
  });
}

export function useUpdateBill() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ billId, ...data }: { billId: number; amount?: string; note?: string | null }) =>
      api<Bill>(`/bills/${billId}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: billsKey }),
  });
}

export function useDeletePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => api<Bill>(`/payments/${paymentId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: billsKey }),
  });
}

export function useMyBills() {
  return useQuery({ queryKey: [...billsKey, "me"], queryFn: () => api<Bill[]>("/me/bills") });
}

export function useSendReminders() {
  return useMutation({ mutationFn: (month: string) => api<{ sent: number }>(`/notifications/payment-reminders?month=${month}`, { method: "POST" }) });
}
