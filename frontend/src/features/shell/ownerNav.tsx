import type { NavItem } from "../../components/BottomNav";
import { FamilyIcon, HomeIcon, MoreIcon, PlateCheckIcon, WalletRupeeIcon } from "../../components/brand/icons";

export const OWNER_NAV: NavItem[] = [
  { labelKey: "nav.home", to: "/owner", icon: <HomeIcon /> },
  { labelKey: "nav.members", to: "/owner/members", icon: <FamilyIcon /> },
  { labelKey: "nav.attendance", to: "/owner/attendance", icon: <PlateCheckIcon />, also: ["/owner/register", "/owner/leaves", "/owner/holidays"] },
  { labelKey: "nav.payments", to: "/owner/payments", icon: <WalletRupeeIcon />, also: ["/owner/renewals"] },
  {
    labelKey: "nav.more",
    to: "/owner/more",
    icon: <MoreIcon />,
    also: ["/owner/pricing", "/owner/plans", "/owner/months", "/owner/menu", "/owner/announcements", "/owner/reports", "/owner/tiffins", "/owner/tiffin-clients", "/owner/change-password", "/owner/notifications"],
  },
];
