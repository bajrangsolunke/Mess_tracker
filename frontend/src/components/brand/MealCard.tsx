import { Box, Typography, alpha } from "@mui/material";
import WbSunnyIcon from "@mui/icons-material/WbSunnyRounded";
import NightsStayIcon from "@mui/icons-material/NightsStayRounded";
import { useTranslation } from "react-i18next";
import { brand } from "../../app/theme";

/** One meal of the day's menu. `items` empty → teaches what to do next. */
export function MealCard({
  meal,
  items,
  emptyHint,
}: {
  meal: "lunch" | "dinner";
  items: string[];
  emptyHint?: string;
}) {
  const { t } = useTranslation();
  const isLunch = meal === "lunch";
  const accent = isLunch ? brand.gold : brand.red;
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "44px 1fr",
        gap: 1.5,
        alignItems: "start",
        p: 1.5,
        borderRadius: "16px",
        bgcolor: brand.paper,
        border: `1px solid ${brand.line}`,
      }}
    >
      <Box
        sx={{
          width: 44,
          height: 44,
          borderRadius: "12px",
          bgcolor: alpha(accent, 0.12),
          color: accent,
          display: "grid",
          placeItems: "center",
        }}
      >
        {isLunch ? <WbSunnyIcon /> : <NightsStayIcon />}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="subtitle2" sx={{ color: "text.secondary" }}>
          {t(`meal.${meal}`)}
        </Typography>
        {items.length ? (
          <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.6 }}>
            {items.join(" • ")}
          </Typography>
        ) : (
          <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
            {emptyHint ?? t("menu.notAdded")}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
