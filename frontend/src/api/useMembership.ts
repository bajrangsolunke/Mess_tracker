import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Bill, DueRow, Member, MyToday, PaymentMethod, Plan, Pricing, Register } from "./types";
import { attendanceKey } from "./useAttendance";
import { membersKey } from "./useMembers";
import { plansKey } from "./usePlans";

export function usePricing() {
  return useQuery({ queryKey: ["pricing"], queryFn: () => api<Pricing>("/pricing") });
}

export function useSavePricing() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { one_meal_price: string; two_meal_price: string; apply_to_existing: boolean }) =>
      api<Pricing>("/pricing", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: (p) => {
      qc.setQueryData(["pricing"], p);
      void qc.invalidateQueries({ queryKey: plansKey });
      void qc.invalidateQueries({ queryKey: membersKey });
    },
  });
}

export function useRenewalsDue() {
  return useQuery({ queryKey: ["memberships", "due"], queryFn: () => api<DueRow[]>("/memberships/due") });
}

export function useRenew() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, ...data }: { memberId: number; plan_id?: number; start_date?: string; paid_amount?: string; payment_method?: PaymentMethod }) =>
      api<{ member: Member; bill: Bill }>(`/members/${memberId}/renew`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: membersKey });
      void qc.invalidateQueries({ queryKey: ["memberships"] });
      void qc.invalidateQueries({ queryKey: ["bills"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useMyPlans() {
  return useQuery({ queryKey: ["me", "plans"], queryFn: () => api<Plan[]>("/me/plans") });
}

export function useRequestRenewal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (planId: number | null) =>
      planId === null ? api<Member>("/me/renewal", { method: "DELETE" }) : api<Member>("/me/renewal", { method: "POST", body: JSON.stringify({ plan_id: planId }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard"] }),
  });
}

export function useMyToday() {
  return useQuery({ queryKey: ["me", "today"], queryFn: () => api<MyToday>("/me/attendance/today"), refetchInterval: 60_000 });
}

export function useRegister(month: string) {
  return useQuery({ queryKey: [...attendanceKey, "register", month], queryFn: () => api<Register>(`/attendance/register?month=${month}`), placeholderData: (p) => p });
}
