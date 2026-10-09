import type { Role } from "./authStore";

export const HOME_BY_ROLE: Record<Role, string> = { owner: "/owner", staff: "/staff", customer: "/app" };
