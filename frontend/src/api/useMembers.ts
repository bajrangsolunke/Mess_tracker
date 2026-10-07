import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";
import type { Member, MemberCreateInput, MemberStatus, MemberUpdateInput, Page } from "./types";

export const membersKey = ["members"] as const;

export interface MemberFilters {
  search?: string;
  status?: MemberStatus | "";
  plan_id?: number;
}

export function useMembers(filters: MemberFilters = {}) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.status) params.set("status", filters.status);
  if (filters.plan_id) params.set("plan_id", String(filters.plan_id));
  const qs = params.toString();
  return useQuery({
    queryKey: [...membersKey, filters],
    queryFn: () => api<Page<Member>>(`/members${qs ? `?${qs}` : ""}`),
    placeholderData: (prev) => prev,
  });
}

export function useMember(id: number | undefined) {
  return useQuery({
    queryKey: [...membersKey, "detail", id],
    queryFn: () => api<Member>(`/members/${id}`),
    enabled: id !== undefined && Number.isFinite(id),
  });
}

export interface MemberCreated {
  member: Member;
  temp_password: string | null;
}

export function useCreateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: MemberCreateInput) =>
      api<MemberCreated>("/members", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useUpdateMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: MemberUpdateInput & { id: number }) =>
      api<Member>(`/members/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useSetMemberStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      api<Member>(`/members/${id}/${active ? "activate" : "deactivate"}`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: membersKey }),
  });
}

export function useResetMemberPassword() {
  return useMutation({
    mutationFn: (id: number) => api<{ temp_password: string }>(`/members/${id}/reset-password`, { method: "POST" }),
  });
}
