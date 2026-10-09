import { Navigate } from "react-router-dom";
import { PlateCheckIcon, MoreIcon } from "../../components/brand/icons";
import type { NavItem } from "../../components/BottomNav";
import { AppShell } from "./AppShell";

const STAFF_NAV: NavItem[] = [
  { labelKey: "nav.attendance", to: "/staff/attendance", icon: <PlateCheckIcon /> },
  { labelKey: "nav.more", to: "/staff/change-password", icon: <MoreIcon /> },
];

export function StaffShell() {
  return <AppShell items={STAFF_NAV} />;
}

export function StaffHome() {
  return <Navigate to="/staff/attendance" replace />;
}
