import { useEffect, useState } from "react";
import { Box, Typography, keyframes } from "@mui/material";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { brand, FONT_DEVA } from "../../app/theme";
import { Logo } from "../../components/brand/Logo";
import { BrandPattern } from "../../components/brand/BrandPattern";
import { storage } from "../../lib/storage";
import { useSession } from "../auth/authStore";
import { HOME_BY_ROLE } from "../auth/routes";

const rise = keyframes`
  from { opacity: 0; transform: translateY(16px); }
  to   { opacity: 1; transform: translateY(0); }
`;
const steam = keyframes`
  0%   { opacity: 0; transform: translateY(0) scaleX(1); }
  30%  { opacity: .55; }
  100% { opacity: 0; transform: translateY(-46px) scaleX(1.4); }
`;
const pulse = keyframes`
  0%, 100% { opacity: .35; } 50% { opacity: 1; }
`;

const SPLASH_MS = 1600;
const SESSION_KEY = "mt.splashShown";

function alreadyShown() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

function Steam({ x, delay }: { x: number; delay: number }) {
  return (
    <Box
      aria-hidden
      sx={{
        position: "absolute",
        left: `calc(50% + ${x}px)`,
        top: -22,
        width: 12,
        height: 40,
        borderRadius: 999,
        bgcolor: "#FFFFFF",
        filter: "blur(5px)",
        animation: `${steam} 2.2s ease-out ${delay}s infinite`,
      }}
    />
  );
}

/** Cold-start splash: dark maroon, chef, steam, tagline, then routes by language → onboarding → session. */
export function SplashPage() {
  const { t } = useTranslation();
  const [done, setDone] = useState(alreadyShown);
  const { user, access } = useSession();

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => {
      try {
        sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        /* ignore */
      }
      setDone(true);
    }, SPLASH_MS);
    return () => window.clearTimeout(id);
  }, [done]);

  if (done) {
    if (!storage.getLanguage()) return <Navigate to="/select-language" replace />;
    if (access && user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
    if (!storage.getOnboarded()) return <Navigate to="/welcome" replace />;
    return <Navigate to="/login" replace />;
  }

  return (
    <Box
      role="status"
      aria-label="स्वाद"
      sx={{
        position: "relative",
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: `radial-gradient(130% 90% at 50% 0%, ${brand.red} 0%, ${brand.redDeep} 60%, ${brand.maroonInk} 100%)`,
        color: brand.cream,
        px: 3,
        overflow: "hidden",
      }}
    >
      <BrandPattern opacity={0.07} />
      <Box sx={{ position: "relative", textAlign: "center", width: "100%", maxWidth: 340, animation: `${rise} 800ms cubic-bezier(.2,.8,.2,1) both` }}>
        <Box sx={{ position: "relative", mx: "auto", mb: 4 }}>
          <Steam x={-56} delay={0} />
          <Steam x={-28} delay={0.7} />
          <Steam x={0} delay={1.3} />
          <Box
            sx={{
              position: "relative",
              bgcolor: brand.cream,
              borderRadius: "28px",
              px: 3,
              py: 2.5,
              boxShadow: `0 0 0 8px ${brand.red}40, 0 32px 64px -28px rgba(0,0,0,.75)`,
            }}
          >
            <Logo variant="full" height="auto" sx={{ width: "100%" }} />
          </Box>
        </Box>
        <Typography sx={{ fontFamily: FONT_DEVA, fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.3 }}>
          {brand.tagline.mr}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.75, opacity: 0.75, letterSpacing: 0.6, textTransform: "uppercase", fontSize: "0.72rem", fontWeight: 600 }}>
          {brand.tagline.en}
        </Typography>
      </Box>
      <Typography
        variant="caption"
        sx={{ position: "absolute", bottom: "calc(env(safe-area-inset-bottom) + 28px)", color: brand.cream, opacity: 0.7, animation: `${pulse} 1.6s ease-in-out infinite` }}
      >
        {t("common.loading")}
      </Typography>
    </Box>
  );
}
