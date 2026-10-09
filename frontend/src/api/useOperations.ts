import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { KitchenToday, LedgerEntry, LedgerKind, LedgerReport, Staff, StaffCreated, StaffSelf } from "./types";

export const staffKey = ["staff"] as const;
export const ledgerKey = ["ledger"] as const;

export interface StaffInput {
  name: string;
  phone: string;
  monthly_salary: string;
}

export interface LedgerInput {
  kind: LedgerKind;
  amount: string;
  occurred_on: string;
  description: string;
  note?: string | null;
  staff_user_id?: number | null;
}

export function useStaffList(month: string) {
  return useQuery({ queryKey: [...staffKey, "list", month], queryFn: () => api<Staff[]>(`/staff?month=${month}`) });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffInput) => api<StaffCreated>("/staff", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: staffKey }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: number; monthly_salary?: string; is_active?: boolean }) =>
      api<Staff>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: staffKey }),
  });
}

export function useLedger(from: string, to: string) {
  return useQuery({
    queryKey: [...ledgerKey, from, to],
    queryFn: () => api<LedgerReport>(`/ledger?from=${from}&to=${to}`),
    placeholderData: (p) => p,
  });
}

export function useAddLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: LedgerInput) => api<LedgerEntry>("/ledger/entries", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ledgerKey });
      void qc.invalidateQueries({ queryKey: staffKey });
    },
  });
}

export function useDeleteLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api<void>(`/ledger/entries/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ledgerKey });
      void qc.invalidateQueries({ queryKey: staffKey });
    },
  });
}

/** Staff's own salary, advances and payments. */
export function useStaffMe(month: string) {
  return useQuery({ queryKey: [...staffKey, "me", month], queryFn: () => api<StaffSelf>(`/staff/me?month=${month}`) });
}

/** What the kitchen needs today: members expected per meal plus company tiffins. */
export function useKitchenToday() {
  return useQuery({ queryKey: ["kitchen", "today"], queryFn: () => api<KitchenToday>("/kitchen/today"), refetchInterval: 60_000 });
}
