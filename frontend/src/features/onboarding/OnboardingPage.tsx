import { useState } from "react";
import { Box, Button, Container, Typography, alpha } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";
import { BrandPattern } from "../../components/brand/BrandPattern";
import { FamilyIcon, LeafIcon, NotebookIcon, WalletRupeeIcon } from "../../components/brand/icons";
import { storage } from "../../lib/storage";

const SLIDES = [
  { key: "members", Icon: FamilyIcon, color: brand.red },
  { key: "payments", Icon: WalletRupeeIcon, color: brand.gold },
  { key: "reports", Icon: NotebookIcon, color: brand.green },
  { key: "serve", Icon: LeafIcon, color: brand.redDark },
] as const;

/** Four-screen first-launch tour. Finishing or skipping sets `mt.onboarded`. */
export function OnboardingPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [i, setI] = useState(0);
  const slide = SLIDES[i];
  const last = i === SLIDES.length - 1;

  const finish = () => {
    storage.setOnboarded();
    navigate("/login", { replace: true });
  };

  return (
    <Box sx={{ minHeight: "100dvh", display: "flex", flexDirection: "column", bgcolor: brand.bg }}>
      <Box sx={{ display: "flex", justifyContent: "flex-end", p: 2, pt: "calc(env(safe-area-inset-top) + 12px)" }}>
        <Button variant="text" size="medium" onClick={finish} sx={{ minHeight: 40, color: "text.secondary" }}>
          {t("onboarding.skip")}
        </Button>
      </Box>

      <Box
        key={slide.key}
        sx={{
          position: "relative",
          mx: 3,
          borderRadius: "28px",
          bgcolor: alpha(slide.color, 0.08),
          minHeight: 240,
          display: "grid",
          placeItems: "center",
          overflow: "hidden",
          animation: "fadeIn 420ms cubic-bezier(.2,.8,.2,1) both",
          "@keyframes fadeIn": { from: { opacity: 0, transform: "scale(.97)" }, to: { opacity: 1, transform: "scale(1)" } },
        }}
      >
        <BrandPattern color={slide.color} opacity={0.08} />
        <Box sx={{ width: 120, height: 120, borderRadius: "50%", bgcolor: brand.paper, display: "grid", placeItems: "center", color: slide.color, boxShadow: `0 20px 40px -24px ${alpha(slide.color, 0.6)}` }}>
          <slide.Icon sx={{ fontSize: 60 }} />
        </Box>
      </Box>

      <Container maxWidth="xs" sx={{ flex: 1, pt: 3, pb: 3, display: "flex", flexDirection: "column" }}>
        <Typography variant="h4" component="h1">
          {t(`onboarding.${slide.key}.title`)}
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary", mt: 1 }}>
          {t(`onboarding.${slide.key}.body`)}
        </Typography>

        <Box sx={{ flex: 1 }} />

        <Box sx={{ display: "flex", gap: 0.75, mb: 2.5 }} aria-label={`${i + 1} / ${SLIDES.length}`}>
          {SLIDES.map((s, idx) => (
            <Box key={s.key} sx={{ height: 6, borderRadius: 999, width: idx === i ? 28 : 8, bgcolor: idx === i ? brand.red : brand.line, transition: "width 240ms, background-color 240ms" }} />
          ))}
        </Box>
        <Button variant="contained" onClick={() => (last ? finish() : setI(i + 1))}>
          {last ? t("onboarding.start") : t("onboarding.next")}
        </Button>
      </Container>
    </Box>
  );
}
