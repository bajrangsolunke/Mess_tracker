import { useState } from "react";
import { Box, Button, Typography, alpha } from "@mui/material";
import InstallMobileIcon from "@mui/icons-material/InstallMobileRounded";
import { useTranslation } from "react-i18next";
import { brand } from "../app/theme";
import { promptInstall, useInstallState } from "../lib/install";

/** Puts स्वाद on the phone's home screen so it opens like an app (no address bar). */
export function InstallAppCard() {
  const { t } = useTranslation();
  const state = useInstallState();
  const [help, setHelp] = useState(false);
  if (state === "installed") return null;
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: alpha(brand.gold, 0.1), border: `1px solid ${alpha(brand.gold, 0.4)}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <InstallMobileIcon sx={{ color: brand.goldDark, fontSize: 32 }} />
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1">{t("install.title")}</Typography>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>{t("install.hint")}</Typography>
        </Box>
      </Box>
      <Button variant="contained" fullWidth sx={{ mt: 1.5 }} onClick={() => (state === "prompt" ? void promptInstall() : setHelp(!help))}>
        {t("install.button")}
      </Button>
      {help ? (
        <Typography variant="body2" sx={{ mt: 1.5, whiteSpace: "pre-line" }}>
          {state === "ios" ? t("install.ios") : t("install.android")}
        </Typography>
      ) : null}
    </Box>
  );
}
