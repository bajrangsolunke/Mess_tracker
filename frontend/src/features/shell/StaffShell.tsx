import LocalShippingIcon from "@mui/icons-material/LocalShippingRounded";
import { HomeIcon, PlateCheckIcon, ProfileIcon } from "../../components/brand/icons";
import type { NavItem } from "../../components/BottomNav";
import { AppShell } from "./AppShell";

const STAFF_NAV: NavItem[] = [
  { labelKey: "nav.today", to: "/staff", icon: <HomeIcon /> },
  { labelKey: "nav.attendance", to: "/staff/attendance", icon: <PlateCheckIcon /> },
  { labelKey: "tiffin.short", to: "/staff/tiffins", icon: <LocalShippingIcon /> },
  { labelKey: "nav.me", to: "/staff/me", icon: <ProfileIcon />, also: ["/staff/change-password", "/staff/notifications"] },
];

/** Staff see only what they need: today's counts, marking meals, company tiffins, their salary. */
export function StaffShell() {
  return <AppShell items={STAFF_NAV} />;
}
