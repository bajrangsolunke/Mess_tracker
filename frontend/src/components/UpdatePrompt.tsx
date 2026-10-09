import { useEffect } from "react";
import { Box, Button, Slide, Typography } from "@mui/material";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdateRounded";
import { useTranslation } from "react-i18next";
import { useRegisterSW } from "virtual:pwa-register/react";
import { brand } from "../app/theme";

const CHECK_EVERY_MS = 30 * 60 * 1000;

/** Registers the service worker, looks for a new version every 30 minutes and whenever the
 *  app comes back to the screen, and offers a one-tap update instead of reloading mid-task. */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => undefined);
      };
      setInterval(check, CHECK_EVERY_MS);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") check();
      });
    },
  });

  // reflect the waiting update on the app icon where supported (Android badge)
  useEffect(() => {
    const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
    if (needRefresh) void nav.setAppBadge?.().catch(() => undefined);
  }, [needRefresh]);

  return (
    <Slide direction="down" in={needRefresh} mountOnEnter unmountOnExit>
      <Box
        role="status"
        sx={{
          position: "fixed",
          top: "calc(env(safe-area-inset-top) + 8px)",
          left: 12,
          right: 12,
          zIndex: 2000,
          mx: "auto",
          maxWidth: 560,
          display: "flex",
          alignItems: "center",
          gap: 1.25,
          p: 1.25,
          pl: 1.75,
          borderRadius: "16px",
          bgcolor: brand.maroonInk,
          color: "#fff",
          boxShadow: "0 12px 28px -10px rgba(0,0,0,.5)",
        }}
      >
        <SystemUpdateIcon sx={{ color: brand.gold }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography sx={{ fontWeight: 700, lineHeight: 1.25, color: "inherit" }}>{t("update.title")}</Typography>
          <Typography variant="caption" sx={{ color: "rgba(255,255,255,.8)" }}>{t("update.hint")}</Typography>
        </Box>
        <Button variant="contained" color="secondary" onClick={() => {
            void updateServiceWorker(true);
            // fallback: reload ourselves if the new version didn't take over the page
            setTimeout(() => window.location.reload(), 2500);
          }} sx={{ flexShrink: 0, minHeight: 40, backgroundImage: "none" }}>
          {t("update.button")}
        </Button>
      </Box>
    </Slide>
  );
}
