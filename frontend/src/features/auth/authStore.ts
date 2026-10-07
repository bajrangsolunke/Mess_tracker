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
}

export interface Session {
  access: string | null;
  refresh: string | null;
  user: AuthUser | null;
  organization: AuthOrganization | null;
}

const EMPTY: Session = { access: null, refresh: null, user: null, organization: null };

function load(): Session {
  const raw = storage.getUserJson();
  let user: AuthUser | null = null;
  let organization: AuthOrganization | null = null;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { user: AuthUser; organization: AuthOrganization };
      user = parsed.user ?? null;
      organization = parsed.organization ?? null;
    } catch {
      /* ignore corrupt storage */
    }
  }
  return { access: storage.getAccess(), refresh: storage.getRefresh(), user, organization };
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
      next.user ? JSON.stringify({ user: next.user, organization: next.organization }) : null,
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
