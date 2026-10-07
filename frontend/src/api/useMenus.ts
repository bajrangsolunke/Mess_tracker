import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Announcement, MealType, MenuEntry } from "./types";
import { notificationsKey } from "./useLeaves";

export const menusKey = ["menus"] as const;

export function useMenus(from: string, to: string) {
  return useQuery({ queryKey: [...menusKey, from, to], queryFn: () => api<MenuEntry[]>(`/menus?from=${from}&to=${to}`), placeholderData: (p) => p });
}

export function usePutMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { date: string; meal_type: MealType; items: string[] }) => api<MenuEntry>("/menus", { method: "PUT", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: menusKey }),
  });
}

export function useCopyMenu() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => api<{ copied: number }>(`/menus/copy?from=${from}&to=${to}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: menusKey }),
  });
}

export const announcementsKey = ["announcements"] as const;

export function useAnnouncements() {
  return useQuery({ queryKey: announcementsKey, queryFn: () => api<Announcement[]>("/announcements") });
}

export function useCreateAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title: string; body?: string }) => api<Announcement>("/announcements", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: announcementsKey });
      void qc.invalidateQueries({ queryKey: notificationsKey });
    },
  });
}

export function useDeleteAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api(`/announcements/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: announcementsKey }),
  });
}
