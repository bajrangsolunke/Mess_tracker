import { Box, Button, Slide, Typography } from "@mui/material";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdateRounded";
import { useTranslation } from "react-i18next";
import { brand } from "../app/theme";
import { applyUpdate, useNeedRefresh } from "../lib/appUpdate";

/** Banner when a new version is ready; one tap reloads into it (never reloads by itself). */
export function UpdatePrompt() {
  const { t } = useTranslation();
  const needRefresh = useNeedRefresh();
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
        <Button variant="contained" color="secondary" onClick={applyUpdate} sx={{ flexShrink: 0, minHeight: 40, backgroundImage: "none" }}>
          {t("update.button")}
        </Button>
      </Box>
    </Slide>
  );
}
