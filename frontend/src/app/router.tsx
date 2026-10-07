import { createBrowserRouter, Navigate } from "react-router-dom";
import { SplashPage } from "../features/splash/SplashPage";
import { LanguageSelectPage } from "../features/auth/LanguageSelectPage";
import { LoginPage } from "../features/auth/LoginPage";
import { OnboardingPage } from "../features/onboarding/OnboardingPage";
import { RequireRole } from "../features/auth/RequireRole";
import { OwnerShell } from "../features/shell/OwnerShell";
import { CustomerShell } from "../features/shell/CustomerShell";
import { CustomerHome, OwnerHome } from "../features/dashboard/HomePage";
import { ComingSoon } from "../features/dashboard/ComingSoon";
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

export const router = createBrowserRouter([
  { path: "/", element: <SplashPage /> },
  { path: "/select-language", element: <LanguageSelectPage /> },
  { path: "/welcome", element: <OnboardingPage /> },
  { path: "/login", element: <LoginPage /> },
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
      { path: "payments", element: <ComingSoon titleKey="nav.payments" /> },
      { path: "more", element: <ProfilePage titleKey="nav.more" /> },
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
      { path: "menu", element: <ComingSoon titleKey="nav.menu" /> },
      { path: "payments", element: <ComingSoon titleKey="nav.payments" /> },
      { path: "profile", element: <ProfilePage titleKey="nav.profile" /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
