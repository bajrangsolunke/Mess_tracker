import { Navigate } from "react-router-dom";
import { storage } from "../lib/storage";
import { useSession } from "../features/auth/authStore";
import { HOME_BY_ROLE } from "../features/auth/routes";

export function Landing() {
  const { user, access } = useSession();
  if (!storage.getLanguage()) return <Navigate to="/select-language" replace />;
  if (access && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <Navigate to="/login" replace />;
}
