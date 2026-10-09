import { useState } from "react";
import { CircularProgress, ListItemButton, ListItemIcon, ListItemText } from "@mui/material";
import SystemUpdateIcon from "@mui/icons-material/SystemUpdateRounded";
import CheckCircleIcon from "@mui/icons-material/CheckCircleRounded";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { brand } from "../app/theme";
import { BUILD_TIME, applyUpdate, checkForUpdate, useNeedRefresh, type CheckResult } from "../lib/appUpdate";

/** Settings row: "Check for update" → "You have the latest version" or "Update now". */
export function CheckUpdateRow() {
  const { t, i18n } = useTranslation();
  const needRefresh = useNeedRefresh();
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const locale = i18n.language === "mr" || i18n.language === "hi" ? i18n.language : "en";
  const version = BUILD_TIME ? t("update.version", { date: dayjs(BUILD_TIME).locale(locale).format("D MMM YYYY, h:mm A") }) : "";
  const available = needRefresh || result === "available";
  const secondary = checking ? t("update.checking") : available ? t("update.ready") : result === "latest" ? t("update.latest") : result === "offline" ? t("update.offline") : version;
  return (
    <ListItemButton
      disabled={checking}
      onClick={async () => {
        if (available) return applyUpdate();
        setChecking(true);
        try {
          setResult(await checkForUpdate());
        } catch {
          setResult("offline");
        } finally {
          setChecking(false);
        }
      }}
      sx={{ minHeight: 60 }}
    >
      <ListItemIcon sx={{ color: available ? brand.goldDark : result === "latest" ? brand.green : brand.inkSoft, minWidth: 44 }}>
        {checking ? <CircularProgress size={22} /> : result === "latest" && !available ? <CheckCircleIcon /> : <SystemUpdateIcon />}
      </ListItemIcon>
      <ListItemText primary={available ? t("update.button") : t("update.check")} secondary={secondary} slotProps={{ secondary: { sx: { color: available ? brand.goldDark : undefined, fontWeight: available ? 700 : undefined } } }} />
    </ListItemButton>
  );
}
