import { Box, Button, Typography, alpha } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import BeachAccessIcon from "@mui/icons-material/BeachAccessRounded";
import { useTranslation } from "react-i18next";
import type { KitchenMeal, MealType } from "../../api/types";
import { brand } from "../../app/theme";
import { NONVEG_COLOR, VEG_COLOR, VegMark } from "../../components/brand/VegMark";
import { PlateCheckIcon } from "../../components/brand/icons";

/** One meal for the kitchen: how many plates to cook and how many members are still to be marked. */
export function KitchenCard({ meal, data, onMark }: { meal: MealType; data: KitchenMeal; onMark?: () => void }) {
  const { t } = useTranslation();
  const c = data.counts;
  const members = c.expected - c.on_leave - c.absent;
  const tiffins = data.tiffin_veg + data.tiffin_nonveg;
  const icon = meal === "lunch" ? <WbSunnyIcon sx={{ color: brand.gold }} /> : <NightsStayIcon sx={{ color: brand.redDeep }} />;
  if (data.holiday) {
    return (
      <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.cream, border: `1px solid ${brand.line}`, display: "flex", alignItems: "center", gap: 1.5 }}>
        {icon}
        <Typography sx={{ fontWeight: 700, flex: 1 }}>{t(`meal.${meal}`)}</Typography>
        <BeachAccessIcon sx={{ color: brand.gold }} />
        <Typography variant="body2">{t("attendance.holiday")}</Typography>
      </Box>
    );
  }
  return (
    <Box sx={{ p: 2, borderRadius: "16px", bgcolor: brand.paper, border: `1px solid ${brand.line}` }}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        {icon}
        <Typography variant="h6" component="h2" sx={{ flex: 1 }}>{t(`meal.${meal}`)}</Typography>
        <Box sx={{ textAlign: "right" }}>
          <Typography variant="caption">{t("kitchen.cookFor")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.9rem", lineHeight: 1, color: brand.red, fontVariantNumeric: "tabular-nums" }}>{members + tiffins}</Typography>
        </Box>
      </Box>
      <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1, mt: 1.5 }}>
        <Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: alpha(brand.red, 0.05) }}>
          <Typography variant="caption">{t("kitchen.members")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{members}</Typography>
          <Typography variant="caption" sx={{ display: "block" }}>
            ✓ {c.present} · {t("kitchen.pending")} {c.unmarked}
            {c.on_leave ? ` · ${t("attendance.onLeave")} ${c.on_leave}` : ""}
          </Typography>
        </Box>
        <Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: alpha(brand.gold, 0.1) }}>
          <Typography variant="caption">{t("kitchen.companyTiffins")}</Typography>
          <Typography sx={{ fontWeight: 800, fontSize: "1.2rem" }}>{tiffins}</Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
            <VegMark kind="veg" size={12} />
            <Typography variant="caption" sx={{ color: VEG_COLOR, fontWeight: 700 }}>{data.tiffin_veg}</Typography>
            <VegMark kind="nonveg" size={12} />
            <Typography variant="caption" sx={{ color: NONVEG_COLOR, fontWeight: 700 }}>{data.tiffin_nonveg}</Typography>
          </Box>
        </Box>
      </Box>
      {onMark && c.unmarked > 0 && !data.closed ? (
        <Button variant="contained" startIcon={<PlateCheckIcon />} onClick={onMark} fullWidth sx={{ mt: 1.5 }}>
          {t("kitchen.markNow", { count: c.unmarked, meal: t(`meal.${meal}`) })}
        </Button>
      ) : null}
    </Box>
  );
}
