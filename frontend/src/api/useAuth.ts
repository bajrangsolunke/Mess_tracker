import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type TokenResponse } from "./client";
import { authStore, type AuthOrganization, type AuthUser } from "../features/auth/authStore";

function storeTokens(body: TokenResponse) {
  authStore.setSession({
    access: body.access_token,
    refresh: body.refresh_token,
    user: body.user,
    organization: body.organization,
  });
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: { phone: string; password: string }) =>
      api<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: storeTokens,
  });
}

export interface MeResponse {
  user: AuthUser;
  organization: AuthOrganization;
  member: unknown | null;
}

export function useMe(enabled = true) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<MeResponse>("/auth/me"),
    enabled,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { refresh } = authStore.get();
      if (refresh) {
        await api("/auth/logout", {
          method: "POST",
          body: JSON.stringify({ refresh_token: refresh }),
        }).catch(() => undefined);
      }
    },
    onSettled: () => {
      authStore.clear();
      qc.clear();
    },
  });
}
