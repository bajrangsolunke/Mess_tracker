import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type {
  LedgerReport,
  StaffCreated,
  StaffCreatedInput,
  StaffListItem,
  LedgerEntry,
  LedgerKind,
} from "./types";

export const staffKey = ["staff"] as const;
export const ledgerKey = ["ledger"] as const;

export function useListStaff() {
  return useQuery({
    queryKey: [...staffKey, "list"],
    queryFn: () => api<StaffListItem[]>("/staff"),
  });
}

export function useCreateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffCreatedInput) =>
      api<StaffCreated>("/staff", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: staffKey }),
  });
}

export function useUpdateStaff() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: StaffCreatedInput & { id: number }) =>
      api<StaffListItem>(`/staff/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: staffKey }),
  });
}

export function useLedgerReport(from: string, to: string) {
  return useQuery({
    queryKey: [...ledgerKey, from, to],
    queryFn: () => api<LedgerReport>(`/ledger?from=${from}&to=${to}`),
    enabled: !!from && !!to,
  });
}

export function useCreateLedgerEntry() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      kind: LedgerKind;
      amount: string;
      date: string;
      description: string;
      note?: string | null;
      staff_user_id?: number | null;
    }) =>
      api<LedgerEntry>("/ledger/entries", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ledgerKey });
    },
  });
}
