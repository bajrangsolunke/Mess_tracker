import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useSession, type Role } from "./authStore";
import { HOME_BY_ROLE } from "./routes";

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const session = useSession();
  const location = useLocation();
  if (!session.access || !session.user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  if (session.user.role !== role) {
    return <Navigate to={HOME_BY_ROLE[session.user.role]} replace />;
  }
  return <>{children}</>;
}
