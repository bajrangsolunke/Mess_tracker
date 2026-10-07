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
      { path: "members", element: <ComingSoon titleKey="nav.members" /> },
      { path: "attendance", element: <ComingSoon titleKey="nav.attendance" /> },
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
      { path: "attendance", element: <ComingSoon titleKey="nav.attendance" /> },
      { path: "menu", element: <ComingSoon titleKey="nav.menu" /> },
      { path: "payments", element: <ComingSoon titleKey="nav.payments" /> },
      { path: "profile", element: <ProfilePage titleKey="nav.profile" /> },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
