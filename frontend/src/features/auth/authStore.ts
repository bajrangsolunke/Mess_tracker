import { useSyncExternalStore } from "react";
import { storage, type Lang } from "../../lib/storage";

export type Role = "owner" | "customer";

export interface AuthUser {
  id: number;
  name: string;
  phone?: string;
  role: Role;
  language?: Lang;
  must_change_password?: boolean;
}

export interface AuthOrganization {
  id: number;
  name: string;
  default_language?: Lang;
  leave_cutoff_time?: string;
  lunch_end_time?: string;
  dinner_end_time?: string;
}

export interface AuthMember {
  id: number;
  member_no?: number;
  name: string;
  member_type?: "dine_in" | "tiffin";
  monthly_fee: string;
  plan: { id: number; name: string; includes_lunch: boolean; includes_dinner: boolean; monthly_fee: string };
}

export interface Session {
  access: string | null;
  refresh: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
  member?: AuthMember | null;
}

const EMPTY: Session = { access: null, refresh: null, user: null, organization: null, member: null };

function load(): Session {
  const raw = storage.getUserJson();
  let user: AuthUser | null = null;
  let organization: AuthOrganization | null = null;
  let member: AuthMember | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { user: AuthUser; organization: AuthOrganization; member?: AuthMember | null };
      user = parsed.user ?? null;
      organization = parsed.organization ?? null;
      member = parsed.member ?? null;
    } catch {
      /* ignore corrupt storage */
    }
  }
  return { access: storage.getAccess(), refresh: storage.getRefresh(), user, organization, member };
}

let state: Session = load();
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export const authStore = {
  get: () => state,
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  setSession(next: Session) {
    state = next;
    storage.setTokens(next.access, next.refresh);
    storage.setUserJson(
      next.user ? JSON.stringify({ user: next.user, organization: next.organization, member: next.member ?? null }) : null,
    );
    emit();
  },
  clear() {
    authStore.setSession(EMPTY);
  },
};

export function useSession(): Session {
  return useSyncExternalStore(authStore.subscribe, authStore.get, authStore.get);
}
