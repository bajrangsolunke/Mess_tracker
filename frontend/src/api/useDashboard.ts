import { useQuery } from "@tanstack/react-query";
import { api } from "./client";
import type { CustomerDashboard, MealsReport, OwnerDashboard, PaymentsReport, SummaryRow } from "./types";

export function useOwnerDashboard() {
  return useQuery({ queryKey: ["dashboard", "owner"], queryFn: () => api<OwnerDashboard>("/dashboard/owner"), refetchInterval: 60_000 });
}

export function useCustomerDashboard() {
  return useQuery({ queryKey: ["dashboard", "me"], queryFn: () => api<CustomerDashboard>("/dashboard/me"), refetchInterval: 60_000 });
}

export function useMealsReport(month: string) {
  return useQuery({ queryKey: ["reports", "meals", month], queryFn: () => api<MealsReport>(`/reports/meals?month=${month}`) });
}

export function usePaymentsReport(month: string) {
  return useQuery({ queryKey: ["reports", "payments", month], queryFn: () => api<PaymentsReport>(`/reports/payments?month=${month}`) });
}

export function useAttendanceReport(month: string) {
  return useQuery({ queryKey: ["reports", "attendance", month], queryFn: () => api<SummaryRow[]>(`/reports/attendance?month=${month}`) });
}
