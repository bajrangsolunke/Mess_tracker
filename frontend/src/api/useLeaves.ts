import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Leave, LeaveStatus, LeaveWithMember, MealType, NotificationPage } from "./types";
import { attendanceKey } from "./useAttendance";

export function useMyLeaves(from: string, to: string) {
  return useQuery({ queryKey: ["leaves", "me", from, to], queryFn: () => api<Leave[]>(`/me/leaves?from=${from}&to=${to}`) });
}

export function useCreateLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; meal_types: MealType[]; reason?: string }) =>
      api<Leave[]>("/me/leaves", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leaves"] });
      void qc.invalidateQueries({ queryKey: attendanceKey });
    },
  });
}

export function useCancelLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/me/leaves/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leaves"] });
      void qc.invalidateQueries({ queryKey: attendanceKey });
    },
  });
}

export function useLeaves(from: string, to: string, status?: LeaveStatus | "") {
  const qs = new URLSearchParams({ from, to });
  if (status) qs.set("status", status);
  return useQuery({ queryKey: ["leaves", "owner", from, to, status ?? ""], queryFn: () => api<LeaveWithMember[]>(`/leaves?${qs}`) });
}

export function useDecideLeave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, approve }: { id: number; approve: boolean }) =>
      api<LeaveWithMember>(`/leaves/${id}/${approve ? "approve" : "reject"}`, { method: "POST" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["leaves"] });
      void qc.invalidateQueries({ queryKey: attendanceKey });
    },
  });
}

export const notificationsKey = ["notifications"] as const;

export function useNotifications(enabled = true) {
  return useQuery({ queryKey: notificationsKey, queryFn: () => api<NotificationPage>("/notifications"), enabled, refetchInterval: 60_000 });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id?: number) => api<NotificationPage>(id ? `/notifications/${id}/read` : "/notifications/read-all", { method: "POST" }),
    onSuccess: (page) => qc.setQueryData(notificationsKey, page),
  });
}
