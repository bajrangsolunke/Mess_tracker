import { createBrowserRouter, Navigate } from "react-router-dom";
import { SplashPage } from "../features/splash/SplashPage";
import { LanguageSelectPage } from "../features/auth/LanguageSelectPage";
import { LoginPage } from "../features/auth/LoginPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { RequireRole } from "../features/auth/RequireRole";
import { OwnerShell } from "../features/shell/OwnerShell";
import { CustomerShell } from "../features/shell/CustomerShell";
import { ProfilePage } from "../features/profile/ProfilePage";
import { StaffShell } from "../features/shell/StaffShell";

import type { ComponentType } from "react";
import { RouteError } from "../components/RouteError";

/** Load a screen only when it is first opened, so the app starts with a small download. */
function page<K extends string>(load: () => Promise<Record<K, ComponentType>>, name: K) {
  return async () => ({ Component: (await load())[name] });
}

export const router = createBrowserRouter([
  {
    // one friendly error screen for every page (and reload after a deploy)
    errorElement: <RouteError />,
    children: [
      { path: "/", element: <SplashPage /> },
      { path: "/m/:token", lazy: page(() => import("../features/public/PublicMemberPage"), "PublicMemberPage") },
      { path: "/select-language", element: <LanguageSelectPage /> },
      { path: "/welcome", element: <OnboardingPage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register-mess", lazy: page(() => import("../features/auth/RegisterMessPage"), "RegisterMessPage") },
      {
        path: "/owner",
        element: (
          <RequireRole role="owner">
            <OwnerShell />
          </RequireRole>
        ),
        children: [
          { index: true, lazy: page(() => import("../features/dashboard/HomePage"), "OwnerHome") },
          { path: "members", lazy: page(() => import("../features/members/MembersPage"), "MembersPage") },
          { path: "members/new", lazy: page(() => import("../features/members/MemberFormPage"), "MemberFormPage") },
          { path: "members/:id", lazy: page(() => import("../features/members/MemberDetailPage"), "MemberDetailPage") },
          { path: "members/:id/edit", lazy: page(() => import("../features/members/MemberFormPage"), "MemberFormPage") },
          { path: "plans", lazy: page(() => import("../features/plans/PlansPage"), "PlansPage") },
          { path: "attendance", lazy: page(() => import("../features/attendance/AttendancePage"), "AttendancePage") },
          { path: "members/:id/attendance", lazy: page(() => import("../features/attendance/MemberAttendancePage"), "MemberAttendancePage") },
          { path: "holidays", lazy: page(() => import("../features/holidays/HolidaysPage"), "HolidaysPage") },
          { path: "months", lazy: page(() => import("../features/holidays/MonthsPage"), "MonthsPage") },
          { path: "leaves", lazy: page(() => import("../features/leaves/OwnerLeavesPage"), "OwnerLeavesPage") },
          { path: "menu", lazy: page(() => import("../features/menu/MenuPage"), "MenuPage") },
          { path: "announcements", lazy: page(() => import("../features/announcements/AnnouncementsPage"), "AnnouncementsPage") },
          { path: "notifications", lazy: page(() => import("../features/notifications/NotificationsPage"), "NotificationsPage") },
          { path: "reports", lazy: page(() => import("../features/reports/ReportsPage"), "ReportsPage") },
          { path: "tiffins", lazy: page(() => import("../features/tiffin/TiffinDayPage"), "TiffinDayPage") },
          { path: "pricing", lazy: page(() => import("../features/pricing/PricingPage"), "PricingPage") },
          { path: "renewals", lazy: page(() => import("../features/membership/RenewalsPage"), "RenewalsPage") },
          { path: "register", lazy: page(() => import("../features/register/RegisterPage"), "RegisterPage") },
          { path: "tiffin-clients", lazy: page(() => import("../features/tiffin/TiffinClientsPage"), "TiffinClientsPage") },
          { path: "tiffin-clients/:id", lazy: page(() => import("../features/tiffin/TiffinClientDetailPage"), "TiffinClientDetailPage") },
          { path: "payments", lazy: page(() => import("../features/payments/PaymentsPage"), "PaymentsPage") },
          { path: "payments/:id", lazy: page(() => import("../features/payments/BillDetailPage"), "BillDetailPage") },
          { path: "staff", lazy: page(() => import("../features/operations/StaffPage"), "StaffPage") },
          { path: "owners", lazy: page(() => import("../features/operations/OwnersPage"), "OwnersPage") },
          { path: "ledger", lazy: page(() => import("../features/operations/LedgerPage"), "LedgerPage") },
          { path: "more", element: <ProfilePage titleKey="nav.more" /> },
          { path: "change-password", lazy: page(() => import("../features/profile/ChangePasswordPage"), "ChangePasswordPage") },
        ],
      },
      {
        path: "/staff",
        element: (
          <RequireRole role="staff">
            <StaffShell />
          </RequireRole>
        ),
        children: [
          { index: true, lazy: page(() => import("../features/staff/StaffHomePage"), "StaffHomePage") },
          { path: "attendance", lazy: page(() => import("../features/attendance/AttendancePage"), "AttendancePage") },
          { path: "tiffins", lazy: page(() => import("../features/tiffin/TiffinDayPage"), "TiffinDayPage") },
          { path: "me", lazy: page(() => import("../features/staff/StaffMePage"), "StaffMePage") },
          { path: "notifications", lazy: page(() => import("../features/notifications/NotificationsPage"), "NotificationsPage") },
          { path: "change-password", lazy: page(() => import("../features/profile/ChangePasswordPage"), "ChangePasswordPage") },
        ],
      },
      {
        path: "/app",
        element: (
          <RequireRole role="customer">
            <CustomerShell />
          </RequireRole>
        ),
        children: [
          { index: true, lazy: page(() => import("../features/dashboard/HomePage"), "CustomerHome") },
          { path: "attendance", lazy: page(() => import("../features/attendance/MyAttendancePage"), "MyAttendancePage") },
          { path: "leave", lazy: page(() => import("../features/leaves/LeavePage"), "LeavePage") },
          { path: "notifications", lazy: page(() => import("../features/notifications/NotificationsPage"), "NotificationsPage") },
          { path: "menu", lazy: page(() => import("../features/menu/MenuPage"), "MenuPage") },
          { path: "announcements", lazy: page(() => import("../features/announcements/AnnouncementsPage"), "AnnouncementsPage") },
          { path: "payments", lazy: page(() => import("../features/payments/MyBillsPage"), "MyBillsPage") },
          { path: "profile", element: <ProfilePage titleKey="nav.profile" /> },
          { path: "change-password", lazy: page(() => import("../features/profile/ChangePasswordPage"), "ChangePasswordPage") },
        ],
      },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
