import type { NavItem } from "../../components/BottomNav";
import { FamilyIcon, HomeIcon, MoreIcon, PlateCheckIcon, WalletRupeeIcon } from "../../components/brand/icons";

export const OWNER_NAV: NavItem[] = [
  { labelKey: "nav.home", to: "/owner", icon: <HomeIcon /> },
  { labelKey: "nav.members", to: "/owner/members", icon: <FamilyIcon /> },
  { labelKey: "nav.attendance", to: "/owner/attendance", icon: <PlateCheckIcon /> },
  { labelKey: "nav.payments", to: "/owner/payments", icon: <WalletRupeeIcon /> },
  { labelKey: "nav.more", to: "/owner/more", icon: <MoreIcon /> },
];
