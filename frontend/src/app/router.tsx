import { createBrowserRouter, Navigate } from "react-router-dom";
import { SplashPage } from "../features/splash/SplashPage";
import { LanguageSelectPage } from "../features/auth/LanguageSelectPage";
import { LoginPage } from "../features/auth/LoginPage";
import { RegisterMessPage } from "../features/auth/RegisterMessPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { RequireRole } from "../features/auth/RequireRole";
import { OwnerShell } from "../features/shell/OwnerShell";
import { CustomerShell } from "../features/shell/CustomerShell";
import { CustomerHome, OwnerHome } from "../features/dashboard/HomePage";
import { ProfilePage } from "../features/profile/ProfilePage";
import { MembersPage } from "../features/members/MembersPage";
import { MemberFormPage } from "../features/members/MemberFormPage";
import { MemberDetailPage } from "../features/members/MemberDetailPage";
import { PlansPage } from "../features/plans/PlansPage";
import { AttendancePage } from "../features/attendance/AttendancePage";
import { MyAttendancePage } from "../features/attendance/MyAttendancePage";
import { HolidaysPage } from "../features/holidays/HolidaysPage";
import { MonthsPage } from "../features/holidays/MonthsPage";
import { MemberAttendancePage } from "../features/attendance/MemberAttendancePage";
import { LeavePage } from "../features/leaves/LeavePage";
import { OwnerLeavesPage } from "../features/leaves/OwnerLeavesPage";
import { NotificationsPage } from "../features/notifications/NotificationsPage";
import { PaymentsPage } from "../features/payments/PaymentsPage";
import { BillDetailPage } from "../features/payments/BillDetailPage";
import { MyBillsPage } from "../features/payments/MyBillsPage";
import { MenuPage } from "../features/menu/MenuPage";
import { AnnouncementsPage } from "../features/announcements/AnnouncementsPage";
import { ReportsPage } from "../features/reports/ReportsPage";
import { ChangePasswordPage } from "../features/profile/ChangePasswordPage";
import { TiffinOrdersPage } from "../features/tiffin/TiffinOrdersPage";
import { PricingPage } from "../features/pricing/PricingPage";
import { RenewalsPage } from "../features/membership/RenewalsPage";
import { RegisterPage } from "../features/register/RegisterPage";
import { TiffinClientsPage } from "../features/tiffin/TiffinClientsPage";
import { TiffinClientDetailPage } from "../features/tiffin/TiffinClientDetailPage";
import { StaffPage } from "../features/operations/StaffPage";
import { LedgerPage } from "../features/operations/LedgerPage";
import { StaffShell, StaffHome } from "../features/shell/StaffShell";

export const router = createBrowserRouter([
  { path: "/", element: <SplashPage /> },
  { path: "/select-language", element: <LanguageSelectPage /> },
  { path: "/welcome", element: <OnboardingPage /> },
  { path: "/login", element: <LoginPage /> },
  { path: "/register-mess", element: <RegisterMessPage /> },
  {
    path: "/owner",
    element: (
      <RequireRole role="owner">
        <OwnerShell />
      </RequireRole>
    ),
    children: [
      { index: true, element: <OwnerHome /> },
      { path: "members", element: <MembersPage /> },
      { path: "members/new", element: <MemberFormPage /> },
      { path: "members/:id", element: <MemberDetailPage /> },
      { path: "members/:id/edit", element: <MemberFormPage /> },
      { path: "plans", element: <PlansPage /> },
      { path: "attendance", element: <AttendancePage /> },
      { path: "members/:id/attendance", element: <MemberAttendancePage /> },
      { path: "holidays", element: <HolidaysPage /> },
      { path: "months", element: <MonthsPage /> },
      { path: "leaves", element: <OwnerLeavesPage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "announcements", element: <AnnouncementsPage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "reports", element: <ReportsPage /> },
      { path: "tiffins", element: <TiffinOrdersPage /> },
      { path: "pricing", element: <PricingPage /> },
      { path: "renewals", element: <RenewalsPage /> },
      { path: "register", element: <RegisterPage /> },
      { path: "tiffin-clients", element: <TiffinClientsPage /> },
      { path: "tiffin-clients/:id", element: <TiffinClientDetailPage /> },
      { path: "payments", element: <PaymentsPage /> },
      { path: "payments/:id", element: <BillDetailPage /> },
      { path: "staff", element: <StaffPage /> },
      { path: "ledger", element: <LedgerPage /> },
      { path: "more", element: <ProfilePage titleKey="nav.more" /> },
      { path: "change-password", element: <ChangePasswordPage /> },
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
      { index: true, element: <StaffHome /> },
      { path: "attendance", element: <AttendancePage /> },
      { path: "change-password", element: <ChangePasswordPage /> },
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
      { index: true, element: <CustomerHome /> },
      { path: "attendance", element: <MyAttendancePage /> },
      { path: "leave", element: <LeavePage /> },
      { path: "notifications", element: <NotificationsPage /> },
      { path: "menu", element: <MenuPage /> },
      { path: "announcements", element: <AnnouncementsPage /> },
      { path: "payments", element: <MyBillsPage /> },
      { path: "profile", element: <ProfilePage titleKey="nav.profile" /> },
      { path: "change-password", element: <ChangePasswordPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
