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
        top: -6,
        width: 10,
        height: 34,
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
      <Box sx={{ position: "relative", textAlign: "center", animation: `${rise} 800ms cubic-bezier(.2,.8,.2,1) both` }}>
        <Box sx={{ position: "relative", width: 196, height: 196, mx: "auto", mb: 3 }}>
          <Steam x={-28} delay={0} />
          <Steam x={-4} delay={0.7} />
          <Steam x={22} delay={1.3} />
          <Box
            sx={{
              width: 196,
              height: 196,
              borderRadius: "50%",
              bgcolor: brand.cream,
              display: "grid",
              placeItems: "end center",
              overflow: "hidden",
              boxShadow: `0 0 0 10px ${brand.red}33, 0 30px 60px -24px rgba(0,0,0,.7)`,
            }}
          >
            <Logo variant="chef" height={176} />
          </Box>
        </Box>
        <Typography sx={{ fontFamily: FONT_DEVA, fontWeight: 500, opacity: 0.8, fontSize: "0.95rem" }}>
          लातूरकर यांचे
        </Typography>
        <Typography component="h1" sx={{ fontFamily: FONT_DEVA, fontWeight: 800, fontSize: "3.6rem", lineHeight: 1.1, color: brand.gold }}>
          स्वाद
        </Typography>
        <Typography sx={{ fontFamily: FONT_DEVA, fontWeight: 600, fontSize: "1.15rem", mt: 0.5 }}>
          {brand.tagline.mr}
        </Typography>
        <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.75, letterSpacing: 0.4 }}>
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
