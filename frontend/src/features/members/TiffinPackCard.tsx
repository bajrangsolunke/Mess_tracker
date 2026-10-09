import { Box, LinearProgress, Typography, alpha } from "@mui/material";
import { useTranslation } from "react-i18next";
import type { Credits } from "../../api/types";
import { brand } from "../../app/theme";
import { formatDateLong } from "../../lib/date";

/** Tiffin pack: used / total, left, and the last day leftovers can be eaten. */
export function TiffinPackCard({ credits }: { credits: Credits }) {
  const { t, i18n } = useTranslation();
  const usedUp = credits.left <= 0;
  const color = usedUp ? "#B91C1C" : credits.left <= 5 ? brand.goldDark : brand.greenDark;
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: usedUp ? alpha("#B91C1C", 0.06) : brand.paper, border: `1px solid ${usedUp ? alpha("#B91C1C", 0.3) : brand.line}` }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1 }}>
        <Typography variant="subtitle1">{t("pack.title")}</Typography>
        <Typography sx={{ fontWeight: 800, fontSize: "1.4rem", color }}>
          {usedUp ? t("pack.usedUp") : t("pack.leftOf", { left: credits.left, total: credits.total })}
        </Typography>
      </Box>
      <LinearProgress variant="determinate" value={Math.min(100, (credits.used / Math.max(credits.total, 1)) * 100)} sx={{ my: 1, height: 8, borderRadius: 4, bgcolor: alpha(color, 0.12), "& .MuiLinearProgress-bar": { bgcolor: color } }} />
      <Typography variant="body2" sx={{ color: "text.secondary" }}>
        {usedUp ? t("pack.renewNow") : t("pack.eaten", { used: credits.used, total: credits.total })} · {t("pack.useBy", { date: formatDateLong(credits.use_by, i18n.language) })}
      </Typography>
    </Box>
  );
}
