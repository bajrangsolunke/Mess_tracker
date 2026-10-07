import type { NavItem } from "../../components/BottomNav";
import { HomeIcon, PlateCheckIcon, ProfileIcon, ThaliIcon, WalletRupeeIcon } from "../../components/brand/icons";

export const CUSTOMER_NAV: NavItem[] = [
  { labelKey: "nav.home", to: "/app", icon: <HomeIcon /> },
  { labelKey: "nav.attendance", to: "/app/attendance", icon: <PlateCheckIcon />, also: ["/app/leave"] },
  { labelKey: "nav.menu", to: "/app/menu", icon: <ThaliIcon /> },
  { labelKey: "nav.payments", to: "/app/payments", icon: <WalletRupeeIcon /> },
  { labelKey: "nav.profile", to: "/app/profile", icon: <ProfileIcon />, also: ["/app/change-password", "/app/notifications", "/app/announcements"] },
];
