import { createBrowserRouter, Navigate } from "react-router-dom";
import { LanguageSelectPage } from "../features/auth/LanguageSelectPage";
import { storage } from "../lib/storage";

function Landing() {
  return <Navigate to={storage.getLanguage() ? "/login" : "/select-language"} replace />;
}

export const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/select-language", element: <LanguageSelectPage /> },
  { path: "/login", element: <div>login placeholder</div> },
  { path: "*", element: <Navigate to="/" replace /> },
]);
