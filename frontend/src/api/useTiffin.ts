import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { FoodType, MealType, PaymentMethod, TiffinClient, TiffinItem, TiffinSheet, TiffinStatement, TiffinSummary } from "./types";

export const tiffinKey = ["tiffin"] as const;

export interface TiffinClientInput {
  name: string;
  contact_name?: string | null;
  phone?: string | null;
  address?: string | null;
  notes?: string | null;
  is_active?: boolean;
}

export interface TiffinItemInput {
  name: string;
  price: string;
  food_type: FoodType;
  is_active?: boolean;
  sort_order?: number;
}

export function useTiffinItems() {
  return useQuery({ queryKey: [...tiffinKey, "items"], queryFn: () => api<TiffinItem[]>("/tiffin-items") });
}

export function useSaveTiffinItem() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TiffinItemInput> & { id?: number }) =>
      id
        ? api<TiffinItem>(`/tiffin-items/${id}`, { method: "PATCH", body: JSON.stringify(data) })
        : api<TiffinItem>("/tiffin-items", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tiffinKey }),
  });
}

export function useTiffinClients() {
  return useQuery({ queryKey: [...tiffinKey, "clients"], queryFn: () => api<TiffinClient[]>("/tiffin-clients") });
}

export function useSaveTiffinClient() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<TiffinClientInput> & { id?: number }) =>
      id
        ? api<TiffinClient>(`/tiffin-clients/${id}`, { method: "PATCH", body: JSON.stringify(data) })
        : api<TiffinClient>("/tiffin-clients", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tiffinKey }),
  });
}

export function useTiffinSheet(date: string, meal: MealType) {
  return useQuery({
    queryKey: [...tiffinKey, "sheet", date, meal],
    queryFn: () => api<TiffinSheet>(`/tiffin-orders?date=${date}&meal_type=${meal}`),
    placeholderData: (p) => p,
  });
}

export function useSaveTiffinOrders(date: string, meal: MealType) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (items: { client_id: number; lines: { item_id: number; quantity: number }[]; note?: string | null }[]) =>
      api<TiffinSheet>("/tiffin-orders", { method: "PUT", body: JSON.stringify({ date, meal_type: meal, items }) }),
    onSuccess: (sheet) => {
      qc.setQueryData([...tiffinKey, "sheet", date, meal], sheet);
      void qc.invalidateQueries({ queryKey: [...tiffinKey, "summary"] });
      void qc.invalidateQueries({ queryKey: [...tiffinKey, "statement"] });
      void qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });
}

export function useCopyTiffinOrders() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ from, to }: { from: string; to: string }) => api<{ copied: number }>(`/tiffin-orders/copy?from=${from}&to=${to}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tiffinKey }),
  });
}

export function useTiffinSummary(month: string) {
  return useQuery({ queryKey: [...tiffinKey, "summary", month], queryFn: () => api<TiffinSummary>(`/tiffin-clients/summary?month=${month}`) });
}

export function useTiffinStatement(id: number, month: string) {
  return useQuery({ queryKey: [...tiffinKey, "statement", id, month], queryFn: () => api<TiffinStatement>(`/tiffin-clients/${id}/statement?month=${month}`), enabled: Number.isFinite(id) });
}

export function useRecordTiffinPayment(clientId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { month: string; amount: string; method: PaymentMethod; paid_on: string; note?: string }) =>
      api<TiffinStatement>(`/tiffin-clients/${clientId}/payments`, { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tiffinKey }),
  });
}

export function useDeleteTiffinPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (paymentId: number) => api<TiffinStatement>(`/tiffin-payments/${paymentId}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: tiffinKey }),
  });
}
