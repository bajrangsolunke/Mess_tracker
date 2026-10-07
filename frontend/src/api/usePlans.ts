import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Plan } from "./types";

export const plansKey = ["plans"] as const;

export function usePlans() {
  return useQuery({ queryKey: plansKey, queryFn: () => api<Plan[]>("/plans") });
}

export interface PlanInput {
  name: string;
  includes_lunch: boolean;
  includes_dinner: boolean;
  monthly_fee: string;
  is_active?: boolean;
}

export function useCreatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PlanInput) => api<Plan>("/plans", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKey }),
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: Partial<PlanInput> & { id: number }) =>
      api<Plan>(`/plans/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: plansKey }),
  });
}
