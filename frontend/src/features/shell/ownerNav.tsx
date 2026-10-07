import HomeIcon from "@mui/icons-material/Home";
import GroupIcon from "@mui/icons-material/Group";
import FactCheckIcon from "@mui/icons-material/FactCheck";
import PaymentsIcon from "@mui/icons-material/Payments";
import MoreHorizIcon from "@mui/icons-material/MoreHoriz";
import type { NavItem } from "../../components/BottomNav";

export const OWNER_NAV: NavItem[] = [
  { labelKey: "nav.home", to: "/owner", icon: <HomeIcon /> },
  { labelKey: "nav.members", to: "/owner/members", icon: <GroupIcon /> },
  { labelKey: "nav.attendance", to: "/owner/attendance", icon: <FactCheckIcon /> },
  { labelKey: "nav.payments", to: "/owner/payments", icon: <PaymentsIcon /> },
  { labelKey: "nav.more", to: "/owner/more", icon: <MoreHorizIcon /> },
];
