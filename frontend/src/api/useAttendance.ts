import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { AttendanceSheet, AttendanceStatus, HistoryOut, Holiday, HolidayMeal, MealType, MonthState, SummaryRow } from "./types";

export const attendanceKey = ["attendance"] as const;

/** After any attendance change, refresh everything that shows attendance-derived numbers:
 *  home dashboards, member calendars, register, summary, reports and the member's own today card.
 *  The open sheet is skipped — it is already updated from the server response. */
export function refreshAttendanceViews(qc: QueryClient) {
  void qc.invalidateQueries({ queryKey: ["dashboard"] });
  void qc.invalidateQueries({ queryKey: attendanceKey, predicate: (q) => q.queryKey[1] !== "sheet" });
  void qc.invalidateQueries({ queryKey: ["reports"] });
  void qc.invalidateQueries({ queryKey: ["me"] });
}

export function useAttendanceSheet(date: string, meal: MealType) {
  return useQuery({
    queryKey: [...attendanceKey, "sheet", date, meal],
    queryFn: () => api<AttendanceSheet>(`/attendance?date=${date}&meal_type=${meal}`),
    placeholderData: (prev) => prev,
  });
}

export function useMarkAttendance(date: string, meal: MealType) {
  const qc = useQueryClient();
  const key = [...attendanceKey, "sheet", date, meal];
  return useMutation({
    mutationFn: ({ items, override = false }: { items: { member_id: number; status: AttendanceStatus }[]; override?: boolean }) =>
      api<AttendanceSheet>("/attendance", { method: "PUT", body: JSON.stringify({ date, meal_type: meal, items, override }) }),
    // Optimistic: flip the row immediately, roll back on error.
    onMutate: async ({ items }) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceSheet>(key);
      if (prev) {
        const map = new Map(items.map((i) => [i.member_id, i.status]));
        const rows = prev.items.map((r) => (map.has(r.member.id) ? { ...r, status: map.get(r.member.id)! } : r));
        const present = rows.filter((r) => r.status === "present").length;
        const absent = rows.filter((r) => r.status === "absent").length;
        const on_leave = rows.filter((r) => r.status === null && r.on_leave).length;
        qc.setQueryData<AttendanceSheet>(key, {
          ...prev,
          items: rows,
          counts: { ...prev.counts, present, absent, on_leave, unmarked: rows.length - present - absent - on_leave },
        });
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => ctx?.prev && qc.setQueryData(key, ctx.prev),
    onSuccess: (sheet) => qc.setQueryData(key, sheet),
    onSettled: () => refreshAttendanceViews(qc),
  });
}

export function useMarkAll(date: string, meal: MealType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (status: AttendanceStatus) =>
      api<AttendanceSheet>(`/attendance/mark-all?date=${date}&meal_type=${meal}&status=${status}`, { method: "POST" }),
    onSuccess: (sheet) => {
      qc.setQueryData([...attendanceKey, "sheet", date, meal], sheet);
      refreshAttendanceViews(qc);
    },
  });
}

export function useAttendanceHistory(month: string, memberId?: number) {
  const qs = new URLSearchParams({ month });
  if (memberId) qs.set("member_id", String(memberId));
  return useQuery({
    queryKey: [...attendanceKey, "history", month, memberId ?? "me"],
    queryFn: () => api<HistoryOut>(`/attendance/history?${qs}`),
  });
}

export function useAttendanceSummary(month: string) {
  return useQuery({ queryKey: [...attendanceKey, "summary", month], queryFn: () => api<SummaryRow[]>(`/attendance/summary?month=${month}`) });
}

export function useHolidays(from: string, to: string) {
  return useQuery({ queryKey: ["holidays", from, to], queryFn: () => api<Holiday[]>(`/holidays?from=${from}&to=${to}`) });
}

export function useCreateHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; meal_type: HolidayMeal; reason?: string }) =>
      api<Holiday>("/holidays", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holidays"] });
      void qc.invalidateQueries({ queryKey: attendanceKey });
      refreshAttendanceViews(qc);
    },
  });
}

export function useDeleteHoliday() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/holidays/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["holidays"] });
      void qc.invalidateQueries({ queryKey: attendanceKey });
      refreshAttendanceViews(qc);
    },
  });
}

export function useMonths(year: number) {
  return useQuery({ queryKey: ["months", year], queryFn: () => api<MonthState[]>(`/months?year=${year}`) });
}

export function useSetMonthClosed() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, closed }: { month: string; closed: boolean }) =>
      api<MonthState>(`/months/${month}/close`, { method: closed ? "POST" : "DELETE" }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["months"] });
      void qc.invalidateQueries({ queryKey: attendanceKey });
      refreshAttendanceViews(qc);
    },
  });
}

/** Mark one cell on any date (register view). Refreshes the register and dependent views. */
export function useMarkCell(meal: MealType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ date, member_id, status, override = false }: { date: string; member_id: number; status: AttendanceStatus; override?: boolean }) =>
      api<AttendanceSheet>("/attendance", { method: "PUT", body: JSON.stringify({ date, meal_type: meal, items: [{ member_id, status }], override }) }),
    onSuccess: (sheet) => {
      qc.setQueryData([...attendanceKey, "sheet", sheet.date, sheet.meal_type], sheet);
      refreshAttendanceViews(qc);
    },
  });
}
