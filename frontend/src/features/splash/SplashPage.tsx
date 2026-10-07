import { useEffect, useState } from "react";
import { Box, Typography, keyframes } from "@mui/material";
import { Navigate } from "react-router-dom";
import { brand } from "../../app/theme";
import { Logo } from "../../components/brand/Logo";
import { storage } from "../../lib/storage";
import { useSession } from "../auth/authStore";
import { HOME_BY_ROLE } from "../auth/routes";

const rise = keyframes`
  from { opacity: 0; transform: translateY(18px) scale(.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
`;

const SPLASH_MS = 1400;
const SESSION_KEY = "mt.splashShown";

function alreadyShown() {
  try {
    return sessionStorage.getItem(SESSION_KEY) === "1";
  } catch {
    return true;
  }
}

/** Brand splash on cold start, then routes by language → session → role. */
export function SplashPage() {
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
    return <Navigate to="/login" replace />;
  }

  return (
    <Box
      role="status"
      aria-label="स्वाद"
      sx={{
        minHeight: "100dvh",
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(120% 80% at 50% 0%, ${brand.maroon} 0%, ${brand.maroonDark} 55%, ${brand.maroonDeep} 100%)`,
        color: brand.paper,
        px: 3,
      }}
    >
      <Box sx={{ textAlign: "center", animation: `${rise} 700ms cubic-bezier(.2,.8,.2,1) both` }}>
        <Box
          sx={{
            mx: "auto",
            mb: 2,
            width: 200,
            height: 200,
            borderRadius: "50%",
            bgcolor: brand.paper,
            display: "grid",
            placeItems: "end center",
            overflow: "hidden",
            boxShadow: `0 24px 48px -20px rgba(0,0,0,.6)`,
          }}
        >
          <Logo variant="chef" height={176} />
        </Box>
        <Typography sx={{ fontFamily: '"Baloo 2"', fontWeight: 600, opacity: 0.85, letterSpacing: 0.5 }}>
          लातूरकर यांचे…
        </Typography>
        <Typography
          component="h1"
          sx={{ fontFamily: '"Baloo 2"', fontWeight: 800, fontSize: "3.4rem", lineHeight: 1, color: brand.amber }}
        >
          स्वाद
        </Typography>
        <Typography sx={{ fontFamily: '"Baloo 2"', fontWeight: 700, fontSize: "1.15rem", mt: 0.5 }}>
          भोजनालय &amp; नाश्ता हाऊस
        </Typography>
        <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
          चविष्ट जेवण… घरच्यासारखं प्रेम
        </Typography>
      </Box>
    </Box>
  );
}
