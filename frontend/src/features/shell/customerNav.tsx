import HomeIcon from "@mui/icons-material/Home";
import EventAvailableIcon from "@mui/icons-material/EventAvailable";
import RestaurantMenuIcon from "@mui/icons-material/RestaurantMenu";
import PaymentsIcon from "@mui/icons-material/Payments";
import PersonIcon from "@mui/icons-material/Person";
import type { NavItem } from "../../components/BottomNav";

export const CUSTOMER_NAV: NavItem[] = [
  { labelKey: "nav.home", to: "/app", icon: <HomeIcon /> },
  { labelKey: "nav.attendance", to: "/app/attendance", icon: <EventAvailableIcon /> },
  { labelKey: "nav.menu", to: "/app/menu", icon: <RestaurantMenuIcon /> },
  { labelKey: "nav.payments", to: "/app/payments", icon: <PaymentsIcon /> },
  { labelKey: "nav.profile", to: "/app/profile", icon: <PersonIcon /> },
];
